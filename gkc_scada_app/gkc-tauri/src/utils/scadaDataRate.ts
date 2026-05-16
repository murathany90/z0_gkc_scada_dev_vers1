export interface ScadaDataRateInputSample {
  timestamp: number;
}

export interface ScadaDataRateBucket {
  startTimestamp: number;
  endTimestamp: number;
  midpointTimestamp: number;
  count: number;
  minutes: number;
  ratePerMinute: number;
}

export interface ScadaDataRateSeries {
  periodMinutes: number;
  averagePerMinute: number | null;
  buckets: ScadaDataRateBucket[];
  chartData: Array<[number, number]>;
  axisRange: [number, number] | null;
}

const MS_PER_MINUTE = 60 * 1000;

const isFiniteTimestamp = (value: number | undefined | null): value is number =>
  Number.isFinite(value);

export const buildScadaDataRateSeries = ({
  samples,
  startTimestamp,
  endTimestamp,
  periodMinutes,
}: {
  samples: ScadaDataRateInputSample[];
  startTimestamp: number;
  endTimestamp: number;
  periodMinutes: number;
}): ScadaDataRateSeries => {
  if (
    !isFiniteTimestamp(startTimestamp) ||
    !isFiniteTimestamp(endTimestamp) ||
    !Number.isFinite(periodMinutes) ||
    periodMinutes <= 0 ||
    endTimestamp <= startTimestamp
  ) {
    return {
      periodMinutes,
      averagePerMinute: null,
      buckets: [],
      chartData: [],
      axisRange: null,
    };
  }

  const periodMs = periodMinutes * MS_PER_MINUTE;
  const totalMinutes = (endTimestamp - startTimestamp) / MS_PER_MINUTE;
  const bucketCount = Math.ceil((endTimestamp - startTimestamp) / periodMs);
  const buckets: ScadaDataRateBucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = startTimestamp + index * periodMs;
    const bucketEnd = Math.min(bucketStart + periodMs, endTimestamp);
    const minutes = (bucketEnd - bucketStart) / MS_PER_MINUTE;
    return {
      startTimestamp: bucketStart,
      endTimestamp: bucketEnd,
      midpointTimestamp: bucketStart + (bucketEnd - bucketStart) / 2,
      count: 0,
      minutes,
      ratePerMinute: 0,
    };
  });

  samples.forEach(sample => {
    if (!isFiniteTimestamp(sample.timestamp) || sample.timestamp < startTimestamp || sample.timestamp > endTimestamp) {
      return;
    }

    const rawIndex = Math.floor((sample.timestamp - startTimestamp) / periodMs);
    const bucketIndex = Math.min(Math.max(rawIndex, 0), buckets.length - 1);
    buckets[bucketIndex].count += 1;
  });

  buckets.forEach(bucket => {
    bucket.ratePerMinute = bucket.minutes > 0 ? bucket.count / bucket.minutes : 0;
  });

  const validSampleCount = samples.filter(sample =>
    isFiniteTimestamp(sample.timestamp) &&
    sample.timestamp >= startTimestamp &&
    sample.timestamp <= endTimestamp
  ).length;

  return {
    periodMinutes,
    averagePerMinute: validSampleCount / totalMinutes,
    buckets,
    chartData: buckets.map(bucket => [bucket.midpointTimestamp, bucket.ratePerMinute]),
    axisRange: [startTimestamp, endTimestamp],
  };
};

export const formatDataRatePerMinute = (value: number | null | undefined): string =>
  Number.isFinite(value)
    ? `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} veri/dk`
    : '-';
