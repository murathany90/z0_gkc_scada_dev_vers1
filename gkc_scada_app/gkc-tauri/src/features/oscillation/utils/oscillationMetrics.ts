import { DEFAULT_AMPLITUDE_THRESHOLDS, OSCILLATION_BANDS, TORSION_PASSIVE_BAND, getEnabledBands } from './bands.ts';
import { buildCoherenceMatrix } from './coherence.ts';
import { calculateModeShape, buildCoherenceAverageMap } from './modeShape.ts';
import { getSignalValue } from './pmuSamples.ts';
import {
  estimateDampingRatio,
  estimatePeakAmplitude,
  linearDetrend,
  mean,
  peakToPeak,
  rms,
  spectralEnergy,
} from './signalProcessing.ts';
import type {
  OscillationAnalysisResult,
  OscillationAmplitudeThresholds,
  OscillationBand,
  OscillationClassification,
  OscillationEvent,
  OscillationWindowMetric,
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

const thresholdPercentForSignal = (
  signal: Exclude<PmuSignalKey, 'frequency'>,
  thresholds: OscillationAmplitudeThresholds,
): number => {
  if (signal === 'voltage') return thresholds.voltagePercent;
  if (signal === 'activePower') return thresholds.activePowerPercent;
  return thresholds.reactivePowerPercent;
};

const thresholdForSignal = (
  signal: PmuSignalKey,
  values: number[],
  thresholds: OscillationAmplitudeThresholds,
): number => {
  if (signal === 'frequency') {
    return Math.max(0, thresholds.frequencyMhz) / 1000;
  }

  const finiteValues = values.filter(Number.isFinite);
  const windowMean = finiteValues.length ? mean(finiteValues) : 0;
  return Math.abs(windowMean) * Math.max(0, thresholdPercentForSignal(signal, thresholds)) / 100;
};

const classifyMetric = (
  band: OscillationBand,
  dominantFrequencyHz: number | null,
  peakAmplitude: number | null,
  thresholdValue: number,
  dampingRatioPercent: number | null,
  pmuCount: number,
  dataQualityScore: number,
): OscillationClassification => {
  if (dataQualityScore < 0.05) return 'VERI_KALITESI_YETERSIZ';
  if (!dominantFrequencyHz || peakAmplitude === null || peakAmplitude <= thresholdValue || band.passive) return 'MOD_YOK';
  if (dampingRatioPercent !== null && dampingRatioPercent > 0.5) return 'RINGDOWN_ADAY';
  if (band.id === 'INTERAREA') return pmuCount > 1 ? 'TR_INTERAREA_ADAY_MOD' : 'TEK_PMU_LOKAL_BULGU';
  if (band.id === 'LOCAL') return 'LOKAL_ELEKTROMEKANIK_ADAY';
  if (band.id === 'FORCED') return 'FORCED_ADAY';
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

const seriesForSignal = (
  samples: PmuSample[],
  signal: PmuSignalKey,
): Array<{ timestampMs: number; value: number }> =>
  samples
    .map(sample => {
      const value = getSignalValue(sample, signal);
      return Number.isFinite(value) ? { timestampMs: sample.timestampMs, value: value as number } : null;
    })
    .filter((point): point is { timestampMs: number; value: number } => point !== null);

const calculateMetric = ({
  pmuId,
  signal,
  band,
  samples,
  samplingRateHz,
  dataQualityScore,
  pmuCount,
  amplitudeThresholds,
}: {
  pmuId: string;
  signal: PmuSignalKey;
  band: OscillationBand;
  samples: PmuSample[];
  samplingRateHz: number;
  dataQualityScore: number;
  pmuCount: number;
  amplitudeThresholds: OscillationAmplitudeThresholds;
}): SignalBandMetric => {
  const values = valuesForSignal(samples, signal);
  const detrended = linearDetrend(values);
  const peak = estimatePeakAmplitude(values, samplingRateHz, band.fMin, band.fMax);
  const energy = spectralEnergy(peak.spectrum, band.fMin, band.fMax);
  const bandRms = rms(detrended);
  const peakToPeakAmplitude = peakToPeak(detrended);
  const damping = estimateDampingRatio(detrended, samplingRateHz, peak.dominantFrequencyHz);
  const thresholdValue = thresholdForSignal(signal, values, amplitudeThresholds);

  return {
    pmuId,
    signal,
    bandId: band.id,
    dominantFrequencyHz: peak.dominantFrequencyHz,
    bandRms,
    peakAmplitude: peak.amplitude,
    peakToPeakAmplitude,
    spectralEnergy: energy,
    dampingRatioPercent: damping.dampingRatioPercent,
    dampingSigma: damping.dampingSigma,
    classificationLabel: classifyMetric(
      band,
      peak.dominantFrequencyHz,
      peak.amplitude,
      thresholdValue,
      damping.dampingRatioPercent,
      pmuCount,
      dataQualityScore,
    ),
    dataQualityScore,
    spectrum: peak.spectrum,
  };
};

const strongestActiveWindowCandidate = (
  values: number[],
  samplingRateHz: number,
  thresholdValue: number,
) => getEnabledBands()
  .map(band => {
    const peak = estimatePeakAmplitude(values, samplingRateHz, band.fMin, band.fMax);
    return {
      band,
      peak,
      ratio: peak.amplitude !== null && thresholdValue > 0 ? peak.amplitude / thresholdValue : 0,
    };
  })
  .sort((left, right) => right.ratio - left.ratio);

const calculateWindowMetricsForSeries = ({
  pmuId,
  signal,
  samples,
  samplingRateHz,
  windowSeconds,
  stepSeconds,
  amplitudeThresholds,
}: {
  pmuId: string;
  signal: PmuSignalKey;
  samples: PmuSample[];
  samplingRateHz: number;
  windowSeconds: number;
  stepSeconds: number;
  amplitudeThresholds: OscillationAmplitudeThresholds;
}): OscillationWindowMetric[] => {
  const series = seriesForSignal(samples, signal);
  if (series.length < 8) return [];

  const windowSize = Math.max(8, Math.round(windowSeconds * samplingRateHz));
  const stepSize = Math.max(1, Math.round(stepSeconds * samplingRateHz));
  const starts = series.length <= windowSize
    ? [0]
    : Array.from(
      { length: Math.floor((series.length - windowSize) / stepSize) + 1 },
      (_unused, index) => index * stepSize,
    );

  return starts.map(start => {
    const window = series.slice(start, Math.min(series.length, start + windowSize));
    const values = window.map(point => point.value);
    const detrended = linearDetrend(values);
    const thresholdValue = thresholdForSignal(signal, values, amplitudeThresholds);
    const activeCandidates = strongestActiveWindowCandidate(values, samplingRateHz, thresholdValue);
    const selectedActive = activeCandidates.find(candidate =>
      candidate.peak.amplitude !== null && candidate.peak.amplitude > thresholdValue
    );
    const torsionPeak = TORSION_PASSIVE_BAND
      ? estimatePeakAmplitude(values, samplingRateHz, TORSION_PASSIVE_BAND.fMin, TORSION_PASSIVE_BAND.fMax)
      : null;
    const strongestCandidate = selectedActive ?? activeCandidates[0];
    const center = window[Math.floor(window.length / 2)] ?? window[0];
    const windowStartMs = window[0]?.timestampMs ?? center.timestampMs;
    const windowEndMs = window[window.length - 1]?.timestampMs ?? center.timestampMs;
    const durationSeconds = Math.max(0, (windowEndMs - windowStartMs) / 1000);
    const windowMeta = {
      windowStartMs,
      windowEndMs,
      durationSeconds,
    };

    if (selectedActive) {
      const damping = estimateDampingRatio(detrended, samplingRateHz, selectedActive.peak.dominantFrequencyHz);
      return {
        timestampMs: center.timestampMs,
        ...windowMeta,
        pmuId,
        signal,
        mode: selectedActive.band.modeValue,
        bandId: selectedActive.band.id,
        dominantFrequencyHz: selectedActive.peak.dominantFrequencyHz,
        amplitude: selectedActive.peak.amplitude,
        thresholdValue,
        energyRms: rms(detrended),
        dampingRatioPercent: damping.dampingRatioPercent,
        passiveTorsion: false,
      };
    }

    if (TORSION_PASSIVE_BAND && torsionPeak && torsionPeak.amplitude !== null && torsionPeak.amplitude > thresholdValue) {
      return {
        timestampMs: center.timestampMs,
        ...windowMeta,
        pmuId,
        signal,
        mode: TORSION_PASSIVE_BAND.modeValue,
        bandId: TORSION_PASSIVE_BAND.id,
        dominantFrequencyHz: torsionPeak.dominantFrequencyHz,
        amplitude: torsionPeak.amplitude,
        thresholdValue,
        energyRms: rms(detrended),
        dampingRatioPercent: null,
        passiveTorsion: true,
      };
    }

    return {
      timestampMs: center.timestampMs,
      ...windowMeta,
      pmuId,
      signal,
      mode: 0,
      bandId: null,
      dominantFrequencyHz: strongestCandidate?.peak.dominantFrequencyHz ?? null,
      amplitude: strongestCandidate?.peak.amplitude ?? null,
      thresholdValue,
      energyRms: rms(detrended),
      dampingRatioPercent: null,
      passiveTorsion: false,
    };
  });
};

const finiteOrNull = (value: number | null | undefined): number | null =>
  Number.isFinite(value) ? Number(value) : null;

const averageNullable = (values: Array<number | null | undefined>): number | null => {
  const finiteValues = values.filter((value): value is number => Number.isFinite(value));
  return finiteValues.length
    ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
    : null;
};

const maxNullable = (values: Array<number | null | undefined>): number | null => {
  const finiteValues = values.filter((value): value is number => Number.isFinite(value));
  return finiteValues.length ? Math.max(...finiteValues) : null;
};

const minNullable = (values: Array<number | null | undefined>): number | null => {
  const finiteValues = values.filter((value): value is number => Number.isFinite(value));
  return finiteValues.length ? Math.min(...finiteValues) : null;
};

const metricStartMs = (metric: OscillationWindowMetric): number =>
  Number.isFinite(metric.windowStartMs) ? metric.windowStartMs : metric.timestampMs;

const metricEndMs = (metric: OscillationWindowMetric, fallbackWindowSeconds: number): number =>
  Number.isFinite(metric.windowEndMs) ? metric.windowEndMs : metric.timestampMs + fallbackWindowSeconds * 1000;

export const buildOscillationEvents = (
  windowMetrics: OscillationWindowMetric[],
  windowSeconds: number,
  stepSeconds: number,
): OscillationEvent[] => {
  const activeMetrics = windowMetrics
    .filter(metric => metric.mode > 0)
    .sort((left, right) =>
      left.pmuId.localeCompare(right.pmuId)
      || left.signal.localeCompare(right.signal)
      || left.mode - right.mode
      || (left.bandId ?? '').localeCompare(right.bandId ?? '')
      || metricStartMs(left) - metricStartMs(right)
    );
  const groups: OscillationWindowMetric[][] = [];
  const maxGapMs = Math.max(stepSeconds * 1000 * 1.5, 1000);

  activeMetrics.forEach(metric => {
    const previousGroup = groups[groups.length - 1];
    const previousMetric = previousGroup?.[previousGroup.length - 1];
    const sameGroup = previousMetric
      && previousMetric.pmuId === metric.pmuId
      && previousMetric.signal === metric.signal
      && previousMetric.mode === metric.mode
      && previousMetric.bandId === metric.bandId
      && metricStartMs(metric) <= metricEndMs(previousMetric, windowSeconds) + maxGapMs;

    if (sameGroup) {
      previousGroup.push(metric);
    } else {
      groups.push([metric]);
    }
  });

  return groups.map((group, index) => {
    const first = group[0];
    const startMs = Math.min(...group.map(metric => metricStartMs(metric)));
    const endMs = Math.max(...group.map(metric => metricEndMs(metric, windowSeconds)));
    const dampingValues = group.map(metric => metric.dampingRatioPercent);
    const minDampingRatioPercent = minNullable(dampingValues);
    return {
      id: `${first.pmuId}-${first.signal}-${first.bandId ?? 'MODE'}-${startMs}-${index}`,
      pmuId: first.pmuId,
      signal: first.signal,
      mode: first.mode,
      bandId: first.bandId,
      startMs,
      endMs,
      durationSeconds: Math.max(0, (endMs - startMs) / 1000),
      dominantFrequencyHz: averageNullable(group.map(metric => metric.dominantFrequencyHz)),
      maxAmplitude: maxNullable(group.map(metric => finiteOrNull(metric.amplitude))),
      maxEnergyRms: maxNullable(group.map(metric => finiteOrNull(metric.energyRms))),
      minDampingRatioPercent,
      averageDampingRatioPercent: averageNullable(dampingValues),
      hasNegativeDamping: minDampingRatioPercent !== null && minDampingRatioPercent < 0,
      passiveTorsion: group.some(metric => metric.passiveTorsion),
      windowCount: group.length,
    };
  });
};

const buildCommonModes = (
  metrics: SignalBandMetric[],
  pmuIds: string[],
): OscillationAnalysisResult['commonModes'] => {
  const modeCandidates = metrics
    .filter(metric =>
      metric.classificationLabel !== 'MOD_YOK'
      && metric.dominantFrequencyHz !== null
      && metric.spectralEnergy !== null
      && metric.spectralEnergy > 0
    )
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
      classificationLabel: candidate.bandId === 'INTERAREA' && pmuIds.length > 1 && new Set(matching.map(metric => metric.pmuId)).size >= 2
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
  amplitudeThresholds = DEFAULT_AMPLITUDE_THRESHOLDS,
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
  amplitudeThresholds?: OscillationAmplitudeThresholds;
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
  const bands = getEnabledBands();
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
          amplitudeThresholds,
        });
      })
    )
  );
  const windowMetrics = pmuIds.flatMap(pmuId =>
    selectedSignals.flatMap(signal =>
      calculateWindowMetricsForSeries({
        pmuId,
        signal,
        samples: samplesByPmu.get(pmuId) ?? [],
        samplingRateHz,
        windowSeconds,
        stepSeconds,
        amplitudeThresholds,
      })
    )
  );
  const events = buildOscillationEvents(windowMetrics, windowSeconds, stepSeconds);
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
      amplitudeThresholds,
    },
    dataQuality: {
      expectedSamplesPerSignal: expectedSamples,
      totalSamples,
      missingSampleRatio,
      pmuQuality: qualities,
    },
    metrics,
    windowMetrics,
    events,
    commonModes,
    modeShape,
    coherenceMatrix,
  };
};

export const oscillationBandCount = (): number => OSCILLATION_BANDS.length;
