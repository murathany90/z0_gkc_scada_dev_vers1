import type { CoherenceCell, PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';
import { getSignalValue } from './pmuSamples.ts';
import { linearDetrend } from './signalProcessing.ts';

const valuesForSignal = (samples: PmuSample[], signal: PmuSignalKey): number[] =>
  samples
    .map(sample => getSignalValue(sample, signal))
    .filter((value): value is number => Number.isFinite(value));

const hannWindow = (length: number, index: number): number =>
  length <= 1 ? 1 : 0.5 * (1 - Math.cos(2 * Math.PI * index / (length - 1)));

const segmentStartsFor = (length: number, segmentLength: number): number[] => {
  if (length < segmentLength || segmentLength < 8) return [];
  const step = Math.max(1, Math.floor(segmentLength / 2));
  const starts: number[] = [];
  for (let start = 0; start + segmentLength <= length; start += step) {
    starts.push(start);
  }
  return starts;
};

const complexAtFrequency = (
  values: number[],
  start: number,
  segmentLength: number,
  frequencyHz: number,
  samplingRateHz: number,
): { real: number; imaginary: number } => {
  const detrended = linearDetrend(values.slice(start, start + segmentLength));
  let real = 0;
  let imaginary = 0;

  detrended.forEach((value, index) => {
    const windowed = value * hannWindow(segmentLength, index);
    const angle = 2 * Math.PI * frequencyHz * index / samplingRateHz;
    real += windowed * Math.cos(angle);
    imaginary -= windowed * Math.sin(angle);
  });

  return { real, imaginary };
};

const magnitudeSquaredCoherence = (
  left: number[],
  right: number[],
  frequencyHz: number | null | undefined,
  samplingRateHz: number | null | undefined,
): number => {
  const length = Math.min(left.length, right.length);
  if (!frequencyHz || frequencyHz <= 0 || !samplingRateHz || samplingRateHz <= 0 || length < 32) return 0;

  const samplesPerPeriod = samplingRateHz / frequencyHz;
  const segmentLength = Math.min(length, Math.max(32, Math.round(samplesPerPeriod * 4)));
  const starts = segmentStartsFor(length, segmentLength);
  if (starts.length < 2) return 0;

  let crossReal = 0;
  let crossImaginary = 0;
  let leftPower = 0;
  let rightPower = 0;

  starts.forEach(start => {
    const leftCoefficient = complexAtFrequency(left, start, segmentLength, frequencyHz, samplingRateHz);
    const rightCoefficient = complexAtFrequency(right, start, segmentLength, frequencyHz, samplingRateHz);
    crossReal += leftCoefficient.real * rightCoefficient.real + leftCoefficient.imaginary * rightCoefficient.imaginary;
    crossImaginary += leftCoefficient.imaginary * rightCoefficient.real - leftCoefficient.real * rightCoefficient.imaginary;
    leftPower += leftCoefficient.real * leftCoefficient.real + leftCoefficient.imaginary * leftCoefficient.imaginary;
    rightPower += rightCoefficient.real * rightCoefficient.real + rightCoefficient.imaginary * rightCoefficient.imaginary;
  });

  const denominator = leftPower * rightPower;
  if (denominator <= 0) return 0;
  const coherence = (crossReal * crossReal + crossImaginary * crossImaginary) / denominator;
  return Math.max(0, Math.min(1, coherence));
};

export const buildCoherenceMatrix = (
  samplesByPmu: Map<string, PmuSample[]>,
  pmuIds: string[],
  signal: PmuSignalKey,
  dominantFrequencyHz?: number | null,
  samplingRateHz?: number | null,
): CoherenceCell[] => {
  const valuesByPmu = new Map(pmuIds.map(pmuId => [pmuId, valuesForSignal(samplesByPmu.get(pmuId) ?? [], signal)]));
  const cells: CoherenceCell[] = [];

  pmuIds.forEach(sourcePmuId => {
    pmuIds.forEach(targetPmuId => {
      const value = sourcePmuId === targetPmuId
        ? 1
        : magnitudeSquaredCoherence(
          valuesByPmu.get(sourcePmuId) ?? [],
          valuesByPmu.get(targetPmuId) ?? [],
          dominantFrequencyHz,
          samplingRateHz,
        );
      cells.push({ sourcePmuId, targetPmuId, value });
    });
  });

  return cells;
};

export const averageCoherenceForPmu = (cells: CoherenceCell[], pmuId: string): number | undefined => {
  const related = cells.filter(cell => cell.sourcePmuId === pmuId && cell.targetPmuId !== pmuId);
  if (!related.length) return undefined;
  return related.reduce((sum, cell) => sum + cell.value, 0) / related.length;
};
