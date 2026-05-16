import type { CoherenceCell, PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';
import { getSignalValue } from './pmuSamples.ts';

const pearsonSquared = (left: number[], right: number[]): number => {
  const length = Math.min(left.length, right.length);
  if (length < 3) return 0;

  const leftValues = left.slice(0, length);
  const rightValues = right.slice(0, length);
  const leftMean = leftValues.reduce((sum, value) => sum + value, 0) / length;
  const rightMean = rightValues.reduce((sum, value) => sum + value, 0) / length;
  let numerator = 0;
  let leftDenominator = 0;
  let rightDenominator = 0;

  for (let index = 0; index < length; index += 1) {
    const leftCentered = leftValues[index] - leftMean;
    const rightCentered = rightValues[index] - rightMean;
    numerator += leftCentered * rightCentered;
    leftDenominator += leftCentered * leftCentered;
    rightDenominator += rightCentered * rightCentered;
  }

  if (leftDenominator <= 0 || rightDenominator <= 0) return 0;
  const correlation = numerator / Math.sqrt(leftDenominator * rightDenominator);
  return Math.max(0, Math.min(1, correlation * correlation));
};

const valuesForSignal = (samples: PmuSample[], signal: PmuSignalKey): number[] =>
  samples
    .map(sample => getSignalValue(sample, signal))
    .filter((value): value is number => Number.isFinite(value));

export const buildCoherenceMatrix = (
  samplesByPmu: Map<string, PmuSample[]>,
  pmuIds: string[],
  signal: PmuSignalKey,
): CoherenceCell[] => {
  const valuesByPmu = new Map(pmuIds.map(pmuId => [pmuId, valuesForSignal(samplesByPmu.get(pmuId) ?? [], signal)]));
  const cells: CoherenceCell[] = [];

  pmuIds.forEach(sourcePmuId => {
    pmuIds.forEach(targetPmuId => {
      const value = sourcePmuId === targetPmuId
        ? 1
        : pearsonSquared(valuesByPmu.get(sourcePmuId) ?? [], valuesByPmu.get(targetPmuId) ?? []);
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
