import { getEnabledBands } from './bands.ts';
import { buildCoherenceMatrix } from './coherence.ts';
import { calculateModeShape, buildCoherenceAverageMap } from './modeShape.ts';
import { getSignalValue } from './pmuSamples.ts';
import {
  buildSpectrum,
  estimateDampingRatio,
  estimateDominantFrequency,
  linearDetrend,
  peakToPeak,
  rms,
  spectralEnergy,
} from './signalProcessing.ts';
import type {
  OscillationAnalysisResult,
  OscillationBand,
  OscillationClassification,
  PmuFider,
  PmuQualitySummary,
  PmuSample,
  PmuSelectionMode,
  PmuSignalKey,
  SignalBandMetric,
} from '../types/oscillationTypes.ts';

export const validatePmuSelection = (
  mode: PmuSelectionMode,
  pmuIds: string[],
): { valid: boolean; message: string | null } => {
  const uniqueIds = new Set(pmuIds.filter(Boolean));

  if (mode === 'single') {
    if (uniqueIds.size !== 1) {
      return { valid: false, message: 'Tekli PMU modunda yalnızca 1 PMU fideri seçilmelidir.' };
    }
    return { valid: true, message: null };
  }

  if (uniqueIds.size < 2) {
    return { valid: false, message: 'Çoklu analiz için en az 2 PMU fideri seçiniz.' };
  }

  if (uniqueIds.size > 6) {
    return { valid: false, message: 'En fazla 6 PMU fideri seçilebilir.' };
  }

  return { valid: true, message: null };
};

const toTimestamp = (value: string): number => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : NaN;
};

const classifyMetric = (
  band: OscillationBand,
  dominantFrequencyHz: number | null,
  spectralEnergyValue: number | null,
  dampingRatioPercent: number | null,
  pmuCount: number,
  dataQualityScore: number,
): OscillationClassification => {
  if (dataQualityScore < 0.05) return 'VERI_KALITESI_YETERSIZ';
  if (!dominantFrequencyHz || !spectralEnergyValue || spectralEnergyValue <= 0) return 'MOD_YOK';
  if (dampingRatioPercent !== null && dampingRatioPercent > 0.5) return 'RINGDOWN_ADAY';
  if (band.id === 'B2') return pmuCount > 1 ? 'TR_INTERAREA_ADAY_MOD' : 'TEK_PMU_LOKAL_BULGU';
  if (band.id === 'B3') return 'GENIS_ALAN_ADAY_MOD';
  if (band.id === 'B4') return 'LOKAL_ELEKTROMEKANIK_ADAY';
  if (band.id === 'B5') return 'FORCED_ADAY';
  return pmuCount > 1 ? 'GENIS_ALAN_ADAY_MOD' : 'TEK_PMU_LOKAL_BULGU';
};

const calculatePmuQuality = (
  pmuId: string,
  samples: PmuSample[],
  expectedSamples: number,
): PmuQualitySummary => {
  if (!samples.length) {
    return {
      pmuId,
      expected: expectedSamples,
      received: 0,
      missingRatio: 1,
      gapCount: 0,
      status: 'empty',
      message: 'PMU boş veri döndürdü.',
    };
  }

  const intervals = samples.slice(1).map((sample, index) => sample.timestampMs - samples[index].timestampMs);
  const averageIntervalMs = intervals.length
    ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
    : undefined;
  const maxGapMs = intervals.length ? Math.max(...intervals) : undefined;
  const gapCount = intervals.filter(value => value > 150).length;
  const missingRatio = expectedSamples > 0
    ? Math.max(0, 1 - samples.length / expectedSamples)
    : 0;

  return {
    pmuId,
    expected: expectedSamples,
    received: samples.length,
    missingRatio,
    maxGapMs,
    gapCount,
    averageIntervalMs,
    status: missingRatio > 0.2 || gapCount > 0 ? 'partial' : 'ok',
  };
};

const valuesForSignal = (samples: PmuSample[], signal: PmuSignalKey): number[] =>
  samples
    .map(sample => getSignalValue(sample, signal))
    .filter((value): value is number => Number.isFinite(value));

const calculateMetric = ({
  pmuId,
  signal,
  band,
  samples,
  samplingRateHz,
  dataQualityScore,
  pmuCount,
}: {
  pmuId: string;
  signal: PmuSignalKey;
  band: OscillationBand;
  samples: PmuSample[];
  samplingRateHz: number;
  dataQualityScore: number;
  pmuCount: number;
}): SignalBandMetric => {
  const values = valuesForSignal(samples, signal);
  const detrended = linearDetrend(values);
  const spectrum = buildSpectrum(values, samplingRateHz, band.fMin, band.fMax);
  const dominantFrequencyHz = estimateDominantFrequency(spectrum, band.fMin, band.fMax);
  const energy = spectralEnergy(spectrum, band.fMin, band.fMax);
  const bandRms = rms(detrended);
  const peakToPeakAmplitude = peakToPeak(detrended);
  const damping = estimateDampingRatio(detrended, samplingRateHz, dominantFrequencyHz);

  return {
    pmuId,
    signal,
    bandId: band.id,
    dominantFrequencyHz,
    bandRms,
    peakAmplitude: bandRms === null ? null : Math.SQRT2 * bandRms,
    peakToPeakAmplitude,
    spectralEnergy: energy,
    dampingRatioPercent: damping.dampingRatioPercent,
    dampingSigma: damping.dampingSigma,
    classificationLabel: classifyMetric(
      band,
      dominantFrequencyHz,
      energy,
      damping.dampingRatioPercent,
      pmuCount,
      dataQualityScore,
    ),
    dataQualityScore,
    spectrum,
  };
};

const buildCommonModes = (
  metrics: SignalBandMetric[],
  pmuIds: string[],
): OscillationAnalysisResult['commonModes'] => {
  const modeCandidates = metrics
    .filter(metric => metric.dominantFrequencyHz !== null && metric.spectralEnergy !== null && metric.spectralEnergy > 0)
    .sort((left, right) => (right.spectralEnergy ?? 0) - (left.spectralEnergy ?? 0));

  const modes: OscillationAnalysisResult['commonModes'] = [];
  modeCandidates.forEach(candidate => {
    const frequency = candidate.dominantFrequencyHz;
    if (frequency === null) return;
    const existing = modes.find(mode => Math.abs(mode.frequencyHz - frequency) <= 0.02 && mode.bandId === candidate.bandId);
    if (existing) {
      if (!existing.participatingPmuIds.includes(candidate.pmuId)) {
        existing.participatingPmuIds.push(candidate.pmuId);
      }
      return;
    }

    const matching = modeCandidates.filter(metric =>
      metric.dominantFrequencyHz !== null
      && Math.abs(metric.dominantFrequencyHz - frequency) <= 0.02
      && metric.bandId === candidate.bandId
    );
    const dampingValues = matching
      .map(metric => metric.dampingRatioPercent)
      .filter((value): value is number => Number.isFinite(value));

    modes.push({
      modeId: `M${modes.length + 1}`,
      frequencyHz: frequency,
      bandId: candidate.bandId,
      participatingPmuIds: [...new Set(matching.map(metric => metric.pmuId))],
      averageDampingRatioPercent: dampingValues.length
        ? dampingValues.reduce((sum, value) => sum + value, 0) / dampingValues.length
        : undefined,
      dominantSignal: candidate.signal,
      classificationLabel: candidate.bandId === 'B2' && pmuIds.length > 1 && new Set(matching.map(metric => metric.pmuId)).size >= 2
        ? 'TR_INTERAREA_GUCLU_MOD'
        : candidate.classificationLabel,
    });
  });

  return modes.slice(0, 8);
};

export const calculateOscillationAnalysis = ({
  selectionMode,
  samplesByPmu,
  pmuDevices,
  referencePmuId,
  startTime,
  endTime,
  selectedSignals,
  selectedBandIds,
  samplingRateHz,
  windowSeconds,
  stepSeconds,
}: {
  selectionMode: PmuSelectionMode;
  samplesByPmu: Map<string, PmuSample[]>;
  pmuDevices: PmuFider[];
  referencePmuId?: string;
  startTime: string;
  endTime: string;
  selectedSignals: PmuSignalKey[];
  selectedBandIds: string[];
  samplingRateHz: number;
  windowSeconds: number;
  stepSeconds: number;
}): OscillationAnalysisResult => {
  const pmuIds = pmuDevices.map(device => device.id);
  const startMs = toTimestamp(startTime);
  const endMs = toTimestamp(endTime);
  const durationSeconds = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
    ? (endMs - startMs) / 1000
    : 0;
  const expectedSamples = Math.max(0, Math.round(durationSeconds * samplingRateHz));
  const qualities = pmuIds.map(pmuId => calculatePmuQuality(pmuId, samplesByPmu.get(pmuId) ?? [], expectedSamples));
  const qualityByPmu = new Map(qualities.map(quality => [quality.pmuId, quality]));
  const bands = getEnabledBands(selectedBandIds);
  const metrics = pmuIds.flatMap(pmuId =>
    selectedSignals.flatMap(signal =>
      bands.map(band => {
        const quality = qualityByPmu.get(pmuId);
        return calculateMetric({
          pmuId,
          signal,
          band,
          samples: samplesByPmu.get(pmuId) ?? [],
          samplingRateHz,
          dataQualityScore: Math.max(0, 1 - (quality?.missingRatio ?? 1)),
          pmuCount: pmuIds.length,
        });
      })
    )
  );
  const totalSamples = pmuIds.reduce((sum, pmuId) => sum + (samplesByPmu.get(pmuId)?.length ?? 0), 0);
  const missingSampleRatio = qualities.length
    ? qualities.reduce((sum, quality) => sum + quality.missingRatio, 0) / qualities.length
    : 1;
  const commonModes = buildCommonModes(metrics, pmuIds);
  const dominantCommonMode = commonModes[0];
  const dominantSignal = dominantCommonMode?.dominantSignal ?? selectedSignals[0] ?? 'frequency';
  const coherenceMatrix = pmuIds.length > 1
    ? buildCoherenceMatrix(samplesByPmu, pmuIds, dominantSignal)
    : undefined;
  const modeShape = pmuIds.length > 1
    ? calculateModeShape({
      samplesByPmu,
      pmuDevices,
      pmuIds,
      referencePmuId,
      signal: dominantSignal,
      frequencyHz: dominantCommonMode?.frequencyHz ?? null,
      samplingRateHz,
      coherenceAverageByPmu: coherenceMatrix ? buildCoherenceAverageMap(coherenceMatrix, pmuIds) : undefined,
    })
    : undefined;

  return {
    query: {
      selectionMode,
      pmuIds,
      referencePmuId,
      startTime,
      endTime,
      samplingRateHz,
      windowSeconds,
      stepSeconds,
      selectedSignals,
      selectedBands: bands.map(band => band.id),
    },
    dataQuality: {
      expectedSamplesPerSignal: expectedSamples,
      totalSamples,
      missingSampleRatio,
      pmuQuality: qualities,
    },
    metrics,
    commonModes,
    modeShape,
    coherenceMatrix,
  };
};
