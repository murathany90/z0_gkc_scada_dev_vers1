import type { OscillationAnalysisResult, OscillationEvent } from '../types/oscillationTypes.ts';
import type {
  BenchmarkEventComparison,
  OscillationBenchmarkResult,
  PmuResampleResult,
  SasExternalEvent,
  SasImportResult,
} from './sasTypes.ts';

const seconds = (milliseconds: number): number => milliseconds / 1000;

const overlapPercent = (leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): number => {
  const overlap = Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart));
  const union = Math.max(leftEnd, rightEnd) - Math.min(leftStart, rightStart);
  return union > 0 ? overlap / union * 100 : 0;
};

const eventDistanceMs = (sasEvent: SasExternalEvent, gkcEvent: OscillationEvent): number => {
  if (gkcEvent.endMs < sasEvent.startMs) return sasEvent.startMs - gkcEvent.endMs;
  if (sasEvent.endMs < gkcEvent.startMs) return gkcEvent.startMs - sasEvent.endMs;
  return 0;
};

const isRelevantGkcEvent = (event: OscillationEvent): boolean =>
  event.signal === 'frequency' && event.bandId === 'INTERAREA' && !event.passiveTorsion;

const makeMatch = (sasEvent: SasExternalEvent, gkcEvent: OscillationEvent): BenchmarkEventComparison => ({
  id: `match-${sasEvent.id}-${gkcEvent.id}`,
  status: 'match',
  sasEvent,
  gkcEvent,
  startDeltaSeconds: seconds(gkcEvent.startMs - sasEvent.startMs),
  endDeltaSeconds: seconds(gkcEvent.endMs - sasEvent.endMs),
  durationDeltaSeconds: gkcEvent.durationSeconds - sasEvent.durationSeconds,
  overlapPercent: overlapPercent(sasEvent.startMs, sasEvent.endMs, gkcEvent.startMs, gkcEvent.endMs),
  targetFrequencyHz: sasEvent.targetFrequencyHz,
  gkcDominantFrequencyHz: gkcEvent.dominantFrequencyHz,
  frequencyDeltaHz: sasEvent.targetFrequencyHz !== null && gkcEvent.dominantFrequencyHz !== null
    ? gkcEvent.dominantFrequencyHz - sasEvent.targetFrequencyHz
    : null,
  sasPeakMagnitudeHz: sasEvent.peakMagnitudeHz,
  gkcPeakAmplitude: gkcEvent.maxAmplitude,
  sasDampingPercent: sasEvent.averageDampingRatioPercent,
  gkcMinDampingPercent: gkcEvent.minDampingRatioPercent,
  gkcAverageDampingPercent: gkcEvent.averageDampingRatioPercent,
  negativeDampingDirectionMatches: gkcEvent.hasNegativeDamping === sasEvent.hasNegativeDamping,
});

const makeMissed = (sasEvent: SasExternalEvent): BenchmarkEventComparison => ({
  id: `missed-${sasEvent.id}`,
  status: 'missed',
  sasEvent,
  gkcEvent: null,
  startDeltaSeconds: null,
  endDeltaSeconds: null,
  durationDeltaSeconds: null,
  overlapPercent: null,
  targetFrequencyHz: sasEvent.targetFrequencyHz,
  gkcDominantFrequencyHz: null,
  frequencyDeltaHz: null,
  sasPeakMagnitudeHz: sasEvent.peakMagnitudeHz,
  gkcPeakAmplitude: null,
  sasDampingPercent: sasEvent.averageDampingRatioPercent,
  gkcMinDampingPercent: null,
  gkcAverageDampingPercent: null,
  negativeDampingDirectionMatches: null,
});

const makeExtra = (gkcEvent: OscillationEvent): BenchmarkEventComparison => ({
  id: `extra-${gkcEvent.id}`,
  status: 'extra',
  sasEvent: null,
  gkcEvent,
  startDeltaSeconds: null,
  endDeltaSeconds: null,
  durationDeltaSeconds: null,
  overlapPercent: null,
  targetFrequencyHz: null,
  gkcDominantFrequencyHz: gkcEvent.dominantFrequencyHz,
  frequencyDeltaHz: null,
  sasPeakMagnitudeHz: null,
  gkcPeakAmplitude: gkcEvent.maxAmplitude,
  sasDampingPercent: null,
  gkcMinDampingPercent: gkcEvent.minDampingRatioPercent,
  gkcAverageDampingPercent: gkcEvent.averageDampingRatioPercent,
  negativeDampingDirectionMatches: null,
});

/** Greedy one-to-one interval matcher; matching permits a short near miss but scores actual overlap first. */
export const compareSasAndGkcEvents = (
  sasEvents: SasExternalEvent[],
  gkcEvents: OscillationEvent[],
  maxNearMissSeconds = 30,
): BenchmarkEventComparison[] => {
  const remaining = gkcEvents.filter(isRelevantGkcEvent);
  const comparisons: BenchmarkEventComparison[] = [];
  [...sasEvents].sort((left, right) => left.startMs - right.startMs).forEach(sasEvent => {
    const candidate = remaining
      .map(gkcEvent => ({
        gkcEvent,
        overlap: overlapPercent(sasEvent.startMs, sasEvent.endMs, gkcEvent.startMs, gkcEvent.endMs),
        distance: eventDistanceMs(sasEvent, gkcEvent),
      }))
      .filter(item => item.overlap > 0 || item.distance <= maxNearMissSeconds * 1000)
      .sort((left, right) => right.overlap - left.overlap || left.distance - right.distance)[0];
    if (!candidate) {
      comparisons.push(makeMissed(sasEvent));
      return;
    }
    remaining.splice(remaining.indexOf(candidate.gkcEvent), 1);
    comparisons.push(makeMatch(sasEvent, candidate.gkcEvent));
  });
  remaining.forEach(event => comparisons.push(makeExtra(event)));
  return comparisons;
};

export const buildOscillationBenchmarkResult = ({
  imported,
  resample,
  gkcAnalysis,
}: {
  imported: SasImportResult;
  resample: PmuResampleResult;
  gkcAnalysis: OscillationAnalysisResult;
}): OscillationBenchmarkResult => {
  const comparisons = compareSasAndGkcEvents(imported.externalEvents, gkcAnalysis.events);
  return {
    imported,
    resample,
    gkcAnalysis,
    comparisons,
    matchedCount: comparisons.filter(comparison => comparison.status === 'match').length,
    missedCount: comparisons.filter(comparison => comparison.status === 'missed').length,
    extraCount: comparisons.filter(comparison => comparison.status === 'extra').length,
  };
};
