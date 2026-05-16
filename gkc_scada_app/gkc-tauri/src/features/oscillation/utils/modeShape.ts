import type { CoherenceCell, ModeShapePoint, PmuFider, PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';
import { averageCoherenceForPmu } from './coherence.ts';
import { getSignalValue } from './pmuSamples.ts';
import { complexCoefficientAt, normalizeAngleDegree } from './signalProcessing.ts';

export const calculateModeShape = ({
  samplesByPmu,
  pmuDevices,
  pmuIds,
  referencePmuId,
  signal,
  frequencyHz,
  samplingRateHz,
  coherenceAverageByPmu,
}: {
  samplesByPmu: Map<string, PmuSample[]>;
  pmuDevices: PmuFider[];
  pmuIds: string[];
  referencePmuId?: string;
  signal: PmuSignalKey;
  frequencyHz: number | null;
  samplingRateHz: number;
  coherenceAverageByPmu?: Map<string, number | undefined>;
}): ModeShapePoint[] | undefined => {
  if (!frequencyHz || pmuIds.length < 2) {
    return undefined;
  }

  const deviceById = new Map(pmuDevices.map(device => [device.id, device]));
  const coefficients = new Map(pmuIds.map(pmuId => {
    const values = (samplesByPmu.get(pmuId) ?? [])
      .map(sample => getSignalValue(sample, signal))
      .filter((value): value is number => Number.isFinite(value));
    return [pmuId, complexCoefficientAt(values, samplingRateHz, frequencyHz)];
  }));

  const referenceId = referencePmuId && coefficients.has(referencePmuId) ? referencePmuId : pmuIds[0];
  const referencePhase = coefficients.get(referenceId)?.phaseDegree ?? 0;

  return pmuIds.map(pmuId => {
    const coefficient = coefficients.get(pmuId) ?? { magnitude: 0, phaseDegree: 0 };
    const device = deviceById.get(pmuId);
    return {
      pmuId,
      pmuName: device?.name ?? pmuId,
      magnitude: coefficient.magnitude,
      phaseDegree: normalizeAngleDegree(coefficient.phaseDegree),
      relativePhaseDegree: normalizeAngleDegree(coefficient.phaseDegree - referencePhase),
      coherenceAverage: coherenceAverageByPmu?.get(pmuId),
    };
  });
};

export const buildCoherenceAverageMap = (
  cells: CoherenceCell[],
  pmuIds: string[],
): Map<string, number | undefined> =>
  new Map(pmuIds.map(pmuId => [pmuId, averageCoherenceForPmu(cells, pmuId)]));
