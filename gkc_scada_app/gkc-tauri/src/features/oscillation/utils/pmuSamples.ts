import { parseYtbsTimestamp, type YtbsRawSample } from '../../../utils/ytbsPmu.ts';
import type { PmuFider, PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';

const toFiniteNumber = (value: unknown): number | undefined => {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
  return Number.isFinite(numeric) ? numeric : undefined;
};

const averageDefined = (values: Array<number | undefined>): number | undefined => {
  const defined = values.filter((value): value is number => Number.isFinite(value));
  return defined.length ? defined.reduce((sum, value) => sum + value, 0) / defined.length : undefined;
};

export const rawYtbsRowsToPmuSamples = (
  rows: Array<Record<string, unknown>>,
  pmu: PmuFider,
): PmuSample[] => {
  const byTimestamp = new Map<number, PmuSample>();

  rows.forEach(row => {
    const zaman = typeof row.zaman === 'string' ? row.zaman : '';
    const timestampMs = parseYtbsTimestamp(zaman);
    if (!Number.isFinite(timestampMs)) {
      return;
    }

    const voltageMagnitudeA = toFiniteNumber(row.y2);
    const voltageMagnitudeB = toFiniteNumber(row.y3);
    const voltageMagnitudeC = toFiniteNumber(row.y4);
    const currentMagnitudeA = toFiniteNumber(row.y8);
    const currentMagnitudeB = toFiniteNumber(row.y9);
    const currentMagnitudeC = toFiniteNumber(row.y10);

    const existing = byTimestamp.get(timestampMs);
    byTimestamp.set(timestampMs, {
      ...(existing ?? {
        timestamp: new Date(timestampMs).toISOString(),
        timestampMs,
        sourceZaman: zaman,
        pmuId: pmu.id,
      }),
      frequency: toFiniteNumber(row.y1) ?? existing?.frequency,
      voltage: averageDefined([voltageMagnitudeA, voltageMagnitudeB, voltageMagnitudeC]) ?? existing?.voltage,
      activePower: toFiniteNumber(row.y14) ?? existing?.activePower,
      reactivePower: toFiniteNumber(row.y15) ?? existing?.reactivePower,
      apparentPower: toFiniteNumber(row.y16) ?? existing?.apparentPower,
      voltageMagnitudeA: voltageMagnitudeA ?? existing?.voltageMagnitudeA,
      voltageMagnitudeB: voltageMagnitudeB ?? existing?.voltageMagnitudeB,
      voltageMagnitudeC: voltageMagnitudeC ?? existing?.voltageMagnitudeC,
      voltageAngleA: toFiniteNumber(row.y5) ?? existing?.voltageAngleA,
      voltageAngleB: toFiniteNumber(row.y6) ?? existing?.voltageAngleB,
      voltageAngleC: toFiniteNumber(row.y7) ?? existing?.voltageAngleC,
      currentMagnitudeA: currentMagnitudeA ?? existing?.currentMagnitudeA,
      currentMagnitudeB: currentMagnitudeB ?? existing?.currentMagnitudeB,
      currentMagnitudeC: currentMagnitudeC ?? existing?.currentMagnitudeC,
      currentAngleA: toFiniteNumber(row.y11) ?? existing?.currentAngleA,
      currentAngleB: toFiniteNumber(row.y12) ?? existing?.currentAngleB,
      currentAngleC: toFiniteNumber(row.y13) ?? existing?.currentAngleC,
      quality: typeof row.quality === 'string' ? row.quality : existing?.quality,
    });
  });

  return [...byTimestamp.values()].sort((left, right) => left.timestampMs - right.timestampMs);
};

export const pmuSamplesToRawRows = (samples: PmuSample[]): Array<Record<string, string | number | undefined>> =>
  samples.map(sample => ({
    zaman: sample.sourceZaman ?? sample.timestamp,
    pmuId: sample.pmuId,
    frequency: sample.frequency,
    voltage: sample.voltage,
    activePower: sample.activePower,
    reactivePower: sample.reactivePower,
  }));

export const getSignalValue = (sample: PmuSample, signal: PmuSignalKey): number | undefined => {
  if (signal === 'frequency') return sample.frequency;
  if (signal === 'voltage') return sample.voltage;
  if (signal === 'activePower') return sample.activePower;
  return sample.reactivePower;
};

export const toYtbsRawSamples = (rows: Array<Record<string, unknown>>): YtbsRawSample[] =>
  rows
    .filter(row => typeof row.zaman === 'string')
    .map(row => row as YtbsRawSample);
