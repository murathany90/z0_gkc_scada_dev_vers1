export const THRESHOLD_MISSING_MESSAGE = 'Threshold hesaplanamadı - açıklama veya analog veri eksik';
export const THRESHOLD_DIGITAL_MESSAGE = 'Dijital ölçüm için threshold hesaplanmaz';

const THRESHOLD_ANALOG_ELEMENTS = new Set(['P', 'Q', 'U', 'Frequ', 'Frequency']);

export interface AnalogRange {
  min: number;
  max: number;
  unit: string;
}

export interface RawRange {
  min: number;
  max: number;
}

export type ThresholdEstimate =
  | {
      status: 'ok';
      previousValue: number;
      currentValue: number;
      deltaValue: number;
      estimatedThresholdPercent: number;
      estimatedThresholdEngineering: number;
      estimatedRawDelta: number;
      analogRange: AnalogRange;
      rawRange: RawRange;
    }
  | { status: 'missing'; message: typeof THRESHOLD_MISSING_MESSAGE }
  | { status: 'digital'; message: typeof THRESHOLD_DIGITAL_MESSAGE };

export interface ThresholdInputSample {
  timestamp: number;
  value: number | undefined | null;
}

export interface ThresholdPointEstimate {
  timestamp: number;
  previousValue: number;
  currentValue: number;
  deltaValue: number;
  estimatedThresholdPercent: number;
  estimatedThresholdEngineering: number;
  estimatedRawDelta: number;
  analogRange: AnalogRange;
  rawRange: RawRange;
}

export type ThresholdSeriesEstimate =
  | {
      status: 'ok';
      points: ThresholdPointEstimate[];
      minThresholdPercent: number;
      maxThresholdPercent: number;
      averageThresholdPercent: number;
      averageThresholdEngineering: number;
      averageRawDelta: number;
      analogRange: AnalogRange;
      rawRange: RawRange;
    }
  | { status: 'missing'; message: typeof THRESHOLD_MISSING_MESSAGE; points: [] }
  | { status: 'digital'; message: typeof THRESHOLD_DIGITAL_MESSAGE; points: [] };

export const isThresholdAnalogElement = (elementAdi: string | undefined | null) =>
  THRESHOLD_ANALOG_ELEMENTS.has((elementAdi || '').trim());

const parseNumber = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseAnalogRange = (value: string | undefined | null): AnalogRange | null => {
  const source = (value || '').trim();
  const match = source.match(/^([+-]?\d+(?:[.,]\d+)?)\s*\.{3}\s*([+-]?\d+(?:[.,]\d+)?)(?:\s*([^\d\s].*))?$/);
  if (!match) return null;

  const min = parseNumber(match[1]);
  const max = parseNumber(match[2]);
  if (min === null || max === null) return null;

  return {
    min,
    max,
    unit: (match[3] || '').trim(),
  };
};

export const parseRawRange = (value: string | undefined | null): RawRange | null => {
  const source = (value || '').trim();
  const plusMinus = source.match(/^-\/\+(\d+(?:[.,]\d+)?)$/);
  if (plusMinus) {
    const max = parseNumber(plusMinus[1]);
    return max === null ? null : { min: -max, max };
  }

  const range = source.match(/^([+-]?\d+(?:[.,]\d+)?)\s*(?:\.{3}|-)\s*([+-]?\d+(?:[.,]\d+)?)$/);
  if (!range) return null;

  const min = parseNumber(range[1]);
  const max = parseNumber(range[2]);
  if (min === null || max === null) return null;
  return { min, max };
};

export const calculateThresholdEstimate = ({
  elementAdi,
  previousValue,
  currentValue,
  aciklama2,
  aciklama3,
}: {
  elementAdi: string | undefined | null;
  previousValue: number | undefined | null;
  currentValue: number | undefined | null;
  aciklama2: string | undefined | null;
  aciklama3: string | undefined | null;
}): ThresholdEstimate => {
  if (!isThresholdAnalogElement(elementAdi)) {
    return { status: 'digital', message: THRESHOLD_DIGITAL_MESSAGE };
  }

  const analogRange = parseAnalogRange(aciklama2);
  const rawRange = parseRawRange(aciklama3);
  const analogSpan = analogRange ? analogRange.max - analogRange.min : 0;
  const rawSpan = rawRange ? rawRange.max - rawRange.min : 0;

  if (
    previousValue === null ||
    previousValue === undefined ||
    currentValue === null ||
    currentValue === undefined ||
    !Number.isFinite(previousValue) ||
    !Number.isFinite(currentValue) ||
    !analogRange ||
    !rawRange ||
    analogSpan <= 0 ||
    rawSpan <= 0
  ) {
    return { status: 'missing', message: THRESHOLD_MISSING_MESSAGE };
  }

  const deltaValue = Math.abs(currentValue - previousValue);

  return {
    status: 'ok',
    previousValue,
    currentValue,
    deltaValue,
    estimatedThresholdPercent: (deltaValue / analogSpan) * 100,
    estimatedThresholdEngineering: deltaValue,
    estimatedRawDelta: (deltaValue / analogSpan) * rawSpan,
    analogRange,
    rawRange,
  };
};

export const calculateThresholdSeriesEstimate = ({
  elementAdi,
  samples,
  aciklama2,
  aciklama3,
}: {
  elementAdi: string | undefined | null;
  samples: ThresholdInputSample[];
  aciklama2: string | undefined | null;
  aciklama3: string | undefined | null;
}): ThresholdSeriesEstimate => {
  if (!isThresholdAnalogElement(elementAdi)) {
    return { status: 'digital', message: THRESHOLD_DIGITAL_MESSAGE, points: [] };
  }

  const analogRange = parseAnalogRange(aciklama2);
  const rawRange = parseRawRange(aciklama3);
  const analogSpan = analogRange ? analogRange.max - analogRange.min : 0;
  const rawSpan = rawRange ? rawRange.max - rawRange.min : 0;

  if (!analogRange || !rawRange || analogSpan <= 0 || rawSpan <= 0 || samples.length < 2) {
    return { status: 'missing', message: THRESHOLD_MISSING_MESSAGE, points: [] };
  }

  const points: ThresholdPointEstimate[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previousValue = samples[index - 1]?.value;
    const currentValue = samples[index]?.value;
    const timestamp = samples[index]?.timestamp;
    if (
      !Number.isFinite(previousValue) ||
      !Number.isFinite(currentValue) ||
      !Number.isFinite(timestamp)
    ) {
      continue;
    }

    const deltaValue = Math.abs(Number(currentValue) - Number(previousValue));
    if (deltaValue === 0) {
      continue;
    }

    points.push({
      timestamp: Number(timestamp),
      previousValue: Number(previousValue),
      currentValue: Number(currentValue),
      deltaValue,
      estimatedThresholdPercent: (deltaValue / analogSpan) * 100,
      estimatedThresholdEngineering: deltaValue,
      estimatedRawDelta: (deltaValue / analogSpan) * rawSpan,
      analogRange,
      rawRange,
    });
  }

  if (points.length === 0) {
    return { status: 'missing', message: THRESHOLD_MISSING_MESSAGE, points: [] };
  }

  let minThresholdPercent = points[0].estimatedThresholdPercent;
  let maxThresholdPercent = points[0].estimatedThresholdPercent;
  let thresholdPercentTotal = 0;
  let thresholdEngineeringTotal = 0;
  let rawDeltaTotal = 0;

  points.forEach(point => {
    minThresholdPercent = Math.min(minThresholdPercent, point.estimatedThresholdPercent);
    maxThresholdPercent = Math.max(maxThresholdPercent, point.estimatedThresholdPercent);
    thresholdPercentTotal += point.estimatedThresholdPercent;
    thresholdEngineeringTotal += point.estimatedThresholdEngineering;
    rawDeltaTotal += point.estimatedRawDelta;
  });

  return {
    status: 'ok',
    points,
    minThresholdPercent,
    maxThresholdPercent,
    averageThresholdPercent: thresholdPercentTotal / points.length,
    averageThresholdEngineering: thresholdEngineeringTotal / points.length,
    averageRawDelta: rawDeltaTotal / points.length,
    analogRange,
    rawRange,
  };
};

export const formatThresholdPercent = (value: number | undefined | null) =>
  Number.isFinite(value) ? `%${Number(value).toFixed(2)}` : '-';
