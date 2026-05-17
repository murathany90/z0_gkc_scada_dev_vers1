import type { PmuFider, PmuSample } from '../types/oscillationTypes.ts';

const sine = (
  index: number,
  samplingRateHz: number,
  frequencyHz: number,
  amplitude: number,
  phase = 0,
): number => amplitude * Math.sin((2 * Math.PI * frequencyHz * index / samplingRateHz) + phase);

export const buildOscillationDemoSamples = (
  pmuDevices: PmuFider[],
  startMs: number,
  seconds: number,
  samplingRateHz: number,
): Record<string, PmuSample[]> => {
  const sampleCount = Math.max(0, Math.round(seconds * samplingRateHz));
  const intervalMs = 1000 / samplingRateHz;

  return Object.fromEntries(pmuDevices.map((pmu, pmuIndex) => {
    const phase = pmuIndex * 0.42;
    const interareaAmplitude = pmuIndex === 0 ? 0.012 : 0.004;
    const torsionAmplitude = pmuIndex === 1 ? 0.018 : 0.003;

    const samples = Array.from({ length: sampleCount }, (_unused, index): PmuSample => {
      const timestampMs = startMs + Math.round(index * intervalMs);
      const frequency =
        50
        + sine(index, samplingRateHz, 0.2, interareaAmplitude, phase)
        + sine(index, samplingRateHz, 4.7, torsionAmplitude, phase / 2);
      const voltage =
        400
        + sine(index, samplingRateHz, 0.8, 24, phase)
        + sine(index, samplingRateHz, 0.2, 1.2, phase / 3);
      const activePower =
        1000
        + sine(index, samplingRateHz, 1.0, 65, phase)
        + sine(index, samplingRateHz, 0.2, 6, phase / 4);
      const reactivePower =
        120
        + sine(index, samplingRateHz, 2.7, 8, phase)
        + sine(index, samplingRateHz, 0.35, 0.5, phase / 5);

      return {
        timestamp: new Date(timestampMs).toISOString(),
        timestampMs,
        pmuId: pmu.id,
        frequency,
        voltage,
        activePower,
        reactivePower,
        apparentPower: Math.hypot(activePower, reactivePower),
      };
    });

    return [pmu.id, samples];
  }));
};
