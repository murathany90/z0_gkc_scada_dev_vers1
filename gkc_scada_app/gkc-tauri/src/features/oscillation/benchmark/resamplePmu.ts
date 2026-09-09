import type { PmuSample } from '../types/oscillationTypes.ts';
import type { PmuResampleResult } from './sasTypes.ts';

const DEFAULT_TARGET_RATE_HZ = 10;
const DEFAULT_CUTOFF_HZ = 4;

const median = (values: number[]): number | null => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const sinc = (value: number): number => Math.abs(value) < 1e-12 ? 1 : Math.sin(Math.PI * value) / (Math.PI * value);

const reflectIndex = (index: number, length: number): number => {
  if (length <= 1) return 0;
  let reflected = index;
  while (reflected < 0 || reflected >= length) {
    reflected = reflected < 0 ? -reflected : 2 * length - 2 - reflected;
  }
  return reflected;
};

const buildLowPassKernel = (sourceRateHz: number, cutoffHz: number): number[] => {
  const normalizedCutoff = cutoffHz / sourceRateHz;
  const halfLength = Math.max(10, Math.ceil(sourceRateHz / cutoffHz * 2));
  const tapCount = halfLength * 2 + 1;
  const kernel = Array.from({ length: tapCount }, (_unused, index) => {
    const distance = index - halfLength;
    const blackman = 0.42
      + 0.5 * Math.cos(Math.PI * distance / halfLength)
      + 0.08 * Math.cos(2 * Math.PI * distance / halfLength);
    return 2 * normalizedCutoff * sinc(2 * normalizedCutoff * distance) * blackman;
  });
  const total = kernel.reduce((sum, value) => sum + value, 0);
  return kernel.map(value => value / total);
};

const filterSeries = (values: Array<number | undefined>, kernel: number[]): Array<number | undefined> => {
  const halfLength = Math.floor(kernel.length / 2);
  return values.map((_value, outputIndex) => {
    let weighted = 0;
    let weight = 0;
    kernel.forEach((coefficient, kernelIndex) => {
      const sourceIndex = reflectIndex(outputIndex + kernelIndex - halfLength, values.length);
      const sourceValue = values[sourceIndex];
      if (!Number.isFinite(sourceValue)) return;
      weighted += coefficient * (sourceValue as number);
      weight += coefficient;
    });
    return Math.abs(weight) > Number.EPSILON ? weighted / weight : undefined;
  });
};

const numericSampleFields: Array<keyof Pick<
  PmuSample,
  'frequency' | 'voltage' | 'activePower' | 'reactivePower' | 'apparentPower'
  | 'voltageMagnitudeA' | 'voltageMagnitudeB' | 'voltageMagnitudeC'
  | 'voltageAngleA' | 'voltageAngleB' | 'voltageAngleC'
  | 'currentMagnitudeA' | 'currentMagnitudeB' | 'currentMagnitudeC'
  | 'currentAngleA' | 'currentAngleB' | 'currentAngleC'
>> = [
  'frequency', 'voltage', 'activePower', 'reactivePower', 'apparentPower',
  'voltageMagnitudeA', 'voltageMagnitudeB', 'voltageMagnitudeC',
  'voltageAngleA', 'voltageAngleB', 'voltageAngleC',
  'currentMagnitudeA', 'currentMagnitudeB', 'currentMagnitudeC',
  'currentAngleA', 'currentAngleB', 'currentAngleC',
];

export const estimateSampleRateHz = (samples: PmuSample[]): number | null => {
  const sorted = [...samples].sort((left, right) => left.timestampMs - right.timestampMs);
  const intervalMs = median(sorted.slice(1).map((sample, index) => sample.timestampMs - sorted[index].timestampMs).filter(value => value > 0));
  return intervalMs && intervalMs > 0 ? 1000 / intervalMs : null;
};

/**
 * Applies a windowed-sinc low-pass FIR before integer decimation.  It is kept
 * outside the YTBS query path so the production 10 Hz PMU contract is unchanged.
 */
export const resamplePmuToTenHz = (
  sourceSamples: PmuSample[],
  targetRateHz = DEFAULT_TARGET_RATE_HZ,
): PmuResampleResult => {
  const samples = [...sourceSamples].sort((left, right) => left.timestampMs - right.timestampMs);
  if (samples.length < 3) throw new Error('Resampling için en az üç PMU örneği gerekir.');
  const sourceRateHz = estimateSampleRateHz(samples);
  if (!sourceRateHz || sourceRateHz <= targetRateHz) {
    throw new Error(`50→10 Hz resampler için kaynak hız hedef hızdan büyük olmalıdır (ölçülen ${sourceRateHz?.toFixed(2) ?? '-'} Hz).`);
  }
  const decimationFactor = Math.round(sourceRateHz / targetRateHz);
  if (decimationFactor < 2 || Math.abs(sourceRateHz / decimationFactor - targetRateHz) > targetRateHz * 0.02) {
    throw new Error(`Kaynak örnekleme hızı ${sourceRateHz.toFixed(3)} Hz, güvenli tam sayı 10 Hz decimation oranına uygun değil.`);
  }
  const antiAliasCutoffHz = Math.min(DEFAULT_CUTOFF_HZ, targetRateHz * 0.4, sourceRateHz * 0.45);
  const kernel = buildLowPassKernel(sourceRateHz, antiAliasCutoffHz);
  const filtered = Object.fromEntries(numericSampleFields.map(field => [
    field,
    filterSeries(samples.map(sample => sample[field]), kernel),
  ])) as Record<typeof numericSampleFields[number], Array<number | undefined>>;

  const output: PmuSample[] = [];
  for (let index = 0; index < samples.length; index += decimationFactor) {
    const source = samples[index];
    const resampled: PmuSample = {
      ...source,
      timestamp: new Date(source.timestampMs).toISOString(),
      sourceZaman: source.sourceZaman ?? source.timestamp,
      quality: source.quality ? `${source.quality}; anti-alias FIR ${antiAliasCutoffHz.toFixed(1)}Hz` : `anti-alias FIR ${antiAliasCutoffHz.toFixed(1)}Hz`,
    };
    numericSampleFields.forEach(field => {
      resampled[field] = filtered[field][index];
    });
    output.push(resampled);
  }
  return {
    samples: output,
    sourceRateHz,
    targetRateHz,
    decimationFactor,
    antiAliasCutoffHz,
    firTapCount: kernel.length,
  };
};
