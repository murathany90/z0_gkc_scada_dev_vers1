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

export const formatThresholdPercent = (value: number | undefined | null) =>
  Number.isFinite(value) ? `%${Number(value).toFixed(2)}` : '-';
