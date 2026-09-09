import type { OscillationAnalysisResult, OscillationEvent, PmuSample } from '../types/oscillationTypes.ts';
import type {
  BenchmarkAnalysisConfig,
  BenchmarkEpisodeComparison,
  BenchmarkEventComparison,
  BenchmarkFrequencySimilarity,
  BenchmarkMode,
  BenchmarkPmuTimestampMatch,
  BenchmarkTimeCoverage,
  OscillationBenchmarkResult,
  PmuResampleResult,
  SasExternalEvent,
  SasImportResult,
} from './sasTypes.ts';

const seconds = (milliseconds: number): number => milliseconds / 1000;

const median = (values: number[]): number | null => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const intervalBounds = (startMs: number, endMs: number) => ({
  startMs: Math.min(startMs, endMs),
  endMs: Math.max(startMs, endMs),
});

export const overlapDurationMs = (leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): number => {
  const left = intervalBounds(leftStart, leftEnd);
  const right = intervalBounds(rightStart, rightEnd);
  return Math.max(0, Math.min(left.endMs, right.endMs) - Math.max(left.startMs, right.startMs));
};

const intervalMetrics = (leftStart: number, leftEnd: number, rightStart: number, rightEnd: number) => {
  const overlapMs = overlapDurationMs(leftStart, leftEnd, rightStart, rightEnd);
  const leftDurationMs = Math.max(0, leftEnd - leftStart);
  const rightDurationMs = Math.max(0, rightEnd - rightStart);
  const unionMs = Math.max(leftEnd, rightEnd) - Math.min(leftStart, rightStart);
  return {
    overlapDurationSeconds: seconds(overlapMs),
    iouPercent: unionMs > 0 ? overlapMs / unionMs * 100 : 0,
    leftCoveragePercent: leftDurationMs > 0 ? overlapMs / leftDurationMs * 100 : 0,
    rightCoveragePercent: rightDurationMs > 0 ? overlapMs / rightDurationMs * 100 : 0,
  };
};

const eventDistanceMs = (sasEvent: SasExternalEvent, gkcEvent: OscillationEvent): number => {
  if (gkcEvent.endMs < sasEvent.startMs) return sasEvent.startMs - gkcEvent.endMs;
  if (sasEvent.endMs < gkcEvent.startMs) return gkcEvent.startMs - sasEvent.endMs;
  return 0;
};

const isRelevantGkcEvent = (event: OscillationEvent, pmuId?: string | null): boolean =>
  event.signal === 'frequency'
  && event.bandId === 'INTERAREA'
  && !event.passiveTorsion
  && (!pmuId || event.pmuId === pmuId);

const comparisonValues = (sasEvent: SasExternalEvent | null, gkcEvent: OscillationEvent | null) => {
  const metrics = sasEvent && gkcEvent
    ? intervalMetrics(sasEvent.startMs, sasEvent.endMs, gkcEvent.startMs, gkcEvent.endMs)
    : null;
  return {
    startDeltaSeconds: sasEvent && gkcEvent ? seconds(gkcEvent.startMs - sasEvent.startMs) : null,
    endDeltaSeconds: sasEvent && gkcEvent ? seconds(gkcEvent.endMs - sasEvent.endMs) : null,
    durationDeltaSeconds: sasEvent && gkcEvent ? gkcEvent.durationSeconds - sasEvent.durationSeconds : null,
    overlapDurationSeconds: metrics?.overlapDurationSeconds ?? null,
    iouPercent: metrics?.iouPercent ?? null,
    sasCoveragePercent: metrics?.leftCoveragePercent ?? null,
    gkcCoveragePercent: metrics?.rightCoveragePercent ?? null,
    targetFrequencyHz: sasEvent?.targetFrequencyHz ?? null,
    gkcDominantFrequencyHz: gkcEvent?.dominantFrequencyHz ?? null,
    frequencyDeltaHz: sasEvent?.targetFrequencyHz !== null && sasEvent?.targetFrequencyHz !== undefined && gkcEvent?.dominantFrequencyHz !== null && gkcEvent?.dominantFrequencyHz !== undefined
      ? gkcEvent.dominantFrequencyHz - sasEvent.targetFrequencyHz
      : null,
    sasPeakMagnitudeHz: sasEvent?.peakMagnitudeHz ?? null,
    gkcPeakAmplitude: gkcEvent?.maxAmplitude ?? null,
    sasDampingPercent: sasEvent?.averageDampingRatioPercent ?? null,
    gkcMinDampingPercent: gkcEvent?.minDampingRatioPercent ?? null,
    gkcAverageDampingPercent: gkcEvent?.averageDampingRatioPercent ?? null,
    negativeDampingDirectionMatches: sasEvent && gkcEvent ? sasEvent.hasNegativeDamping === gkcEvent.hasNegativeDamping : null,
  };
};

const makeComparison = (
  status: BenchmarkEventComparison['status'],
  sasEvent: SasExternalEvent | null,
  gkcEvent: OscillationEvent | null,
): BenchmarkEventComparison => ({
  id: `${status}-${sasEvent?.id ?? 'none'}-${gkcEvent?.id ?? 'none'}`,
  status,
  sasEvent,
  gkcEvent,
  ...comparisonValues(sasEvent, gkcEvent),
});

/**
 * Event-level matching is deliberately strict: MATCH requires a positive
 * overlap. A time-adjacent candidate is retained as NEAR-MISS, never MATCH.
 */
export const compareSasAndGkcEvents = (
  sasEvents: SasExternalEvent[],
  gkcEvents: OscillationEvent[],
  options: { maxNearMissSeconds?: number; pmuId?: string | null } = {},
): BenchmarkEventComparison[] => {
  const maxNearMissSeconds = options.maxNearMissSeconds ?? 30;
  const remaining = gkcEvents.filter(event => isRelevantGkcEvent(event, options.pmuId));
  const comparisons: BenchmarkEventComparison[] = [];
  [...sasEvents].sort((left, right) => left.startMs - right.startMs).forEach(sasEvent => {
    const candidate = remaining
      .map(gkcEvent => ({
        gkcEvent,
        overlapMs: overlapDurationMs(sasEvent.startMs, sasEvent.endMs, gkcEvent.startMs, gkcEvent.endMs),
        distanceMs: eventDistanceMs(sasEvent, gkcEvent),
      }))
      .filter(item => item.overlapMs > 0 || item.distanceMs <= maxNearMissSeconds * 1000)
      .sort((left, right) => right.overlapMs - left.overlapMs || left.distanceMs - right.distanceMs)[0];
    if (!candidate) {
      comparisons.push(makeComparison('missed', sasEvent, null));
      return;
    }
    remaining.splice(remaining.indexOf(candidate.gkcEvent), 1);
    comparisons.push(makeComparison(candidate.overlapMs > 0 ? 'match' : 'near-miss', sasEvent, candidate.gkcEvent));
  });
  remaining.forEach(event => comparisons.push(makeComparison('extra', null, event)));
  return comparisons;
};

/** A GKÇ event is a detection episode (sliding-window coverage), not physical oscillation duration. */
export const buildEpisodeComparisons = (
  sasEvents: SasExternalEvent[],
  gkcEvents: OscillationEvent[],
  pmuId?: string | null,
): BenchmarkEpisodeComparison[] =>
  gkcEvents
    .filter(event => isRelevantGkcEvent(event, pmuId))
    .map(gkcEpisode => {
      const overlappingSas = sasEvents.filter(sasEvent =>
        overlapDurationMs(sasEvent.startMs, sasEvent.endMs, gkcEpisode.startMs, gkcEpisode.endMs) > 0
      );
      const overlapMs = overlappingSas.reduce((sum, event) =>
        sum + overlapDurationMs(event.startMs, event.endMs, gkcEpisode.startMs, gkcEpisode.endMs), 0);
      const sasDurationMs = overlappingSas.reduce((sum, event) => sum + Math.max(0, event.endMs - event.startMs), 0);
      const episodeDurationMs = Math.max(0, gkcEpisode.endMs - gkcEpisode.startMs);
      const targetFrequencyHz = median(overlappingSas.map(event => event.targetFrequencyHz ?? NaN));
      return {
        id: `episode-${gkcEpisode.id}`,
        gkcEpisode,
        sasEvents: overlappingSas,
        overlapDurationSeconds: seconds(overlapMs),
        sasCoveragePercent: sasDurationMs > 0 ? overlapMs / sasDurationMs * 100 : 0,
        gkcCoveragePercent: episodeDurationMs > 0 ? overlapMs / episodeDurationMs * 100 : 0,
        dominantFrequencyDeltaHz: targetFrequencyHz !== null && gkcEpisode.dominantFrequencyHz !== null
          ? gkcEpisode.dominantFrequencyHz - targetFrequencyHz
          : null,
        hasNegativeDamping: gkcEpisode.hasNegativeDamping,
      };
    });

export const sortPmuSamplesByTimestamp = (samples: PmuSample[]): PmuSample[] =>
  [...samples].filter(sample => Number.isFinite(sample.timestampMs)).sort((left, right) => left.timestampMs - right.timestampMs);

export const nearestPmuSample = (
  samples: PmuSample[],
  timestampMs: number,
  toleranceMs: number,
): BenchmarkPmuTimestampMatch => {
  return nearestPmuSampleInSorted(sortPmuSamplesByTimestamp(samples), timestampMs, toleranceMs);
};

export const nearestPmuSampleInSorted = (
  samples: PmuSample[],
  timestampMs: number,
  toleranceMs: number,
): BenchmarkPmuTimestampMatch => {
  return nearestInAlreadySortedSamples(samples, timestampMs, toleranceMs);
};

const nearestInAlreadySortedSamples = (
  sorted: PmuSample[],
  timestampMs: number,
  toleranceMs: number,
): BenchmarkPmuTimestampMatch => {
  let lower = 0;
  let upper = sorted.length;
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (sorted[middle].timestampMs < timestampMs) lower = middle + 1;
    else upper = middle;
  }
  const candidates = [sorted[lower - 1], sorted[lower]].filter((sample): sample is PmuSample => Boolean(sample));
  const sample = candidates.sort((left, right) => Math.abs(left.timestampMs - timestampMs) - Math.abs(right.timestampMs - timestampMs))[0];
  const offsetMs = sample ? sample.timestampMs - timestampMs : null;
  return {
    sample: sample && offsetMs !== null && Math.abs(offsetMs) <= toleranceMs ? sample : null,
    offsetMs: sample && offsetMs !== null && Math.abs(offsetMs) <= toleranceMs ? offsetMs : null,
    exact: Boolean(sample && offsetMs === 0),
  };
};

const medianIntervalMs = (samples: PmuSample[]): number | null => {
  const sorted = sortPmuSamplesByTimestamp(samples);
  return median(sorted.slice(1).map((sample, index) => sample.timestampMs - sorted[index].timestampMs).filter(value => value > 0));
};

export const sasRawMatchToleranceMs = (sasSamples: PmuSample[]): number =>
  Math.max(1, (medianIntervalMs(sasSamples) ?? 20) / 2 + 0.5);

export const calculateFrequencySimilarity = (
  sasSamples: PmuSample[],
  gkcSamples: PmuSample[],
): BenchmarkFrequencySimilarity | null => {
  const sas = sortPmuSamplesByTimestamp(sasSamples).filter(sample => Number.isFinite(sample.frequency));
  const gkc = sortPmuSamplesByTimestamp(gkcSamples).filter(sample => Number.isFinite(sample.frequency));
  if (!sas.length || !gkc.length) return null;
  const toleranceMs = Math.max(1, Math.max(medianIntervalMs(sas) ?? 20, medianIntervalMs(gkc) ?? 100) / 2 + 0.5);
  const pairs = sas.map(sample => {
    const match = nearestInAlreadySortedSamples(gkc, sample.timestampMs, toleranceMs);
    return match.sample && Number.isFinite(match.sample.frequency)
      ? { sas: sample.frequency as number, gkc: match.sample.frequency as number, offsetMs: match.offsetMs as number }
      : null;
  }).filter((pair): pair is { sas: number; gkc: number; offsetMs: number } => pair !== null);
  if (pairs.length < 8) return null;
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const sasMean = mean(pairs.map(pair => pair.sas));
  const gkcMean = mean(pairs.map(pair => pair.gkc));
  const covariance = pairs.reduce((sum, pair) => sum + (pair.sas - sasMean) * (pair.gkc - gkcMean), 0);
  const sasVariance = pairs.reduce((sum, pair) => sum + (pair.sas - sasMean) ** 2, 0);
  const gkcVariance = pairs.reduce((sum, pair) => sum + (pair.gkc - gkcMean) ** 2, 0);
  return {
    matchedSampleCount: pairs.length,
    toleranceMs,
    medianTimeOffsetMs: median(pairs.map(pair => pair.offsetMs)),
    meanFrequencyBiasHz: mean(pairs.map(pair => pair.gkc - pair.sas)),
    rmseHz: Math.sqrt(mean(pairs.map(pair => (pair.gkc - pair.sas) ** 2))),
    correlation: sasVariance > 0 && gkcVariance > 0 ? covariance / Math.sqrt(sasVariance * gkcVariance) : null,
  };
};

const coverageFor = (sasSamples: PmuSample[], gkcAnalysis: OscillationAnalysisResult): BenchmarkTimeCoverage => {
  const sas = sortPmuSamplesByTimestamp(sasSamples);
  const sasStartMs = sas[0]?.timestampMs ?? null;
  const sasEndMs = sas[sas.length - 1]?.timestampMs ?? null;
  const gkcStartMs = new Date(gkcAnalysis.query.startTime).getTime();
  const gkcEndMs = new Date(gkcAnalysis.query.endTime).getTime();
  if (!Number.isFinite(sasStartMs) || !Number.isFinite(sasEndMs) || !Number.isFinite(gkcStartMs) || !Number.isFinite(gkcEndMs)) {
    return { sasStartMs, sasEndMs, gkcStartMs: null, gkcEndMs: null, overlapStartMs: null, overlapEndMs: null, overlapSeconds: 0, covered: false };
  }
  const overlapStartMs = Math.max(sasStartMs as number, gkcStartMs);
  const overlapEndMs = Math.min(sasEndMs as number, gkcEndMs);
  const overlapSeconds = Math.max(0, overlapEndMs - overlapStartMs) / 1000;
  return {
    sasStartMs,
    sasEndMs,
    gkcStartMs,
    gkcEndMs,
    overlapStartMs: overlapSeconds > 0 ? overlapStartMs : null,
    overlapEndMs: overlapSeconds > 0 ? overlapEndMs : null,
    overlapSeconds,
    covered: overlapSeconds > 0,
  };
};

export const buildOscillationBenchmarkResult = ({
  imported,
  resample,
  gkcAnalysis,
  gkcInputSamples,
  mode,
  analysisConfig,
}: {
  imported: SasImportResult;
  resample: PmuResampleResult | null;
  gkcAnalysis: OscillationAnalysisResult;
  gkcInputSamples: PmuSample[];
  mode: BenchmarkMode;
  analysisConfig: BenchmarkAnalysisConfig;
}): OscillationBenchmarkResult => {
  const gkcPmuId = analysisConfig.pmuId;
  const comparisons = compareSasAndGkcEvents(imported.externalEvents, gkcAnalysis.events, { pmuId: gkcPmuId });
  return {
    imported,
    mode,
    analysisConfig,
    resample,
    gkcAnalysis,
    gkcInputSamples: sortPmuSamplesByTimestamp(gkcInputSamples),
    gkcPmuId,
    coverage: coverageFor(imported.pmuSamples, gkcAnalysis),
    similarity: mode === 'ytbs' ? calculateFrequencySimilarity(imported.pmuSamples, gkcInputSamples) : null,
    comparisons,
    episodes: buildEpisodeComparisons(imported.externalEvents, gkcAnalysis.events, gkcPmuId),
    matchedCount: comparisons.filter(comparison => comparison.status === 'match').length,
    nearMissCount: comparisons.filter(comparison => comparison.status === 'near-miss').length,
    missedCount: comparisons.filter(comparison => comparison.status === 'missed').length,
    extraCount: comparisons.filter(comparison => comparison.status === 'extra').length,
  };
};
