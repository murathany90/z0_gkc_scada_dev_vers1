import type { SpectrumPoint } from '../types/oscillationTypes.ts';

const TWO_PI = Math.PI * 2;

export const mean = (values: number[]): number =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export const rms = (values: number[]): number | null => {
  if (!values.length) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
};

export const linearDetrend = (values: number[]): number[] => {
  if (values.length < 2) {
    return values.map(value => value - mean(values));
  }

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < n; index += 1) {
    const xCentered = index - xMean;
    numerator += xCentered * (values[index] - yMean);
    denominator += xCentered * xCentered;
  }

  const slope = denominator > 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  return values.map((value, index) => value - (intercept + slope * index));
};

export const peakToPeak = (values: number[]): number | null => {
  if (!values.length) return null;
  let min = values[0];
  let max = values[0];
  values.forEach(value => {
    if (value < min) min = value;
    if (value > max) max = value;
  });
  return max - min;
};

const hannWindow = (length: number, index: number): number =>
  length <= 1 ? 1 : 0.5 * (1 - Math.cos(TWO_PI * index / (length - 1)));

const chooseSegments = (values: number[], segmentLength: number, maxSegments = 12): number[][] => {
  if (values.length <= segmentLength) {
    return [values];
  }

  const maxStart = values.length - segmentLength;
  const count = Math.min(maxSegments, Math.max(1, Math.floor(values.length / segmentLength)));
  return Array.from({ length: count }, (_unused, index) => {
    const start = count === 1 ? 0 : Math.round(index * maxStart / (count - 1));
    return values.slice(start, start + segmentLength);
  });
};

export const buildSpectrum = (
  values: number[],
  samplingRateHz: number,
  fMin = 0.02,
  fMax = 4.5,
): SpectrumPoint[] => {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length < 8) {
    return [];
  }

  const detrended = linearDetrend(finiteValues);
  const segmentLength = Math.min(2048, detrended.length);
  const segments = chooseSegments(detrended, segmentLength);
  const kMin = Math.max(1, Math.ceil(fMin * segmentLength / samplingRateHz));
  const kMax = Math.min(Math.floor(segmentLength / 2), Math.floor(fMax * segmentLength / samplingRateHz));
  const points: SpectrumPoint[] = [];

  for (let k = kMin; k <= kMax; k += 1) {
    let powerSum = 0;
    let segmentCount = 0;

    segments.forEach(segment => {
      if (segment.length !== segmentLength) return;
      let real = 0;
      let imaginary = 0;
      let windowPower = 0;

      for (let index = 0; index < segmentLength; index += 1) {
        const windowValue = hannWindow(segmentLength, index);
        const value = segment[index] * windowValue;
        const angle = TWO_PI * k * index / segmentLength;
        real += value * Math.cos(angle);
        imaginary -= value * Math.sin(angle);
        windowPower += windowValue * windowValue;
      }

      powerSum += (real * real + imaginary * imaginary) / Math.max(windowPower, 1);
      segmentCount += 1;
    });

    points.push({
      frequencyHz: k * samplingRateHz / segmentLength,
      power: segmentCount ? powerSum / segmentCount : 0,
    });
  }

  return points;
};

export const estimateDominantFrequency = (
  spectrum: SpectrumPoint[],
  fMin: number,
  fMax: number,
): number | null => {
  const candidates = spectrum.filter(point => point.frequencyHz >= fMin && point.frequencyHz <= fMax);
  if (!candidates.length) return null;

  const dominant = candidates.reduce((best, point) => point.power > best.power ? point : best, candidates[0]);
  return dominant.power > 0 ? dominant.frequencyHz : null;
};

export const spectralEnergy = (
  spectrum: SpectrumPoint[],
  fMin: number,
  fMax: number,
): number | null => {
  const values = spectrum.filter(point => point.frequencyHz >= fMin && point.frequencyHz <= fMax);
  if (!values.length) return null;
  return values.reduce((sum, point) => sum + point.power, 0);
};

export const estimateDampingRatio = (
  detrendedValues: number[],
  samplingRateHz: number,
  dominantFrequencyHz: number | null,
): { dampingRatioPercent: number | null; dampingSigma: number | null } => {
  if (!dominantFrequencyHz || dominantFrequencyHz <= 0 || detrendedValues.length < 20) {
    return { dampingRatioPercent: null, dampingSigma: null };
  }

  const envelopeWindow = Math.max(3, Math.round(samplingRateHz / dominantFrequencyHz / 3));
  const envelopes: Array<{ t: number; value: number }> = [];

  for (let index = 0; index < detrendedValues.length; index += envelopeWindow) {
    const segment = detrendedValues.slice(index, index + envelopeWindow);
    const segmentRms = rms(segment);
    if (segmentRms && segmentRms > 0) {
      envelopes.push({ t: (index + segment.length / 2) / samplingRateHz, value: segmentRms });
    }
  }

  if (envelopes.length < 4) {
    return { dampingRatioPercent: null, dampingSigma: null };
  }

  const tMean = mean(envelopes.map(point => point.t));
  const yMean = mean(envelopes.map(point => Math.log(point.value)));
  let numerator = 0;
  let denominator = 0;

  envelopes.forEach(point => {
    const tCentered = point.t - tMean;
    numerator += tCentered * (Math.log(point.value) - yMean);
    denominator += tCentered * tCentered;
  });

  if (denominator <= 0) {
    return { dampingRatioPercent: null, dampingSigma: null };
  }

  const sigma = numerator / denominator;
  const omegaD = TWO_PI * dominantFrequencyHz;
  const zeta = -sigma / Math.sqrt(sigma * sigma + omegaD * omegaD);
  return {
    dampingRatioPercent: Number.isFinite(zeta) ? zeta * 100 : null,
    dampingSigma: Number.isFinite(sigma) ? sigma : null,
  };
};

export const normalizeAngleDegree = (angle: number): number => {
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized <= -180) normalized += 360;
  return normalized;
};

export const complexCoefficientAt = (
  values: number[],
  samplingRateHz: number,
  frequencyHz: number,
): { real: number; imaginary: number; magnitude: number; phaseDegree: number } => {
  const detrended = linearDetrend(values.filter(Number.isFinite));
  if (!detrended.length || frequencyHz <= 0) {
    return { real: 0, imaginary: 0, magnitude: 0, phaseDegree: 0 };
  }

  let real = 0;
  let imaginary = 0;
  detrended.forEach((value, index) => {
    const angle = TWO_PI * frequencyHz * index / samplingRateHz;
    real += value * Math.cos(angle);
    imaginary -= value * Math.sin(angle);
  });

  const magnitude = Math.sqrt(real * real + imaginary * imaginary) / detrended.length;
  const phaseDegree = Math.atan2(imaginary, real) * 180 / Math.PI;
  return { real, imaginary, magnitude, phaseDegree };
};
