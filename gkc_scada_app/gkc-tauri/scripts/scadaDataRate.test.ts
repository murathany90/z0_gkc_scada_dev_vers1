import assert from 'node:assert/strict';
import {
  buildScadaDataRateSeries,
  formatDataRatePerMinute,
} from '../src/utils/scadaDataRate.ts';

const minute = 60 * 1000;
const start = Date.UTC(2026, 4, 16, 12, 0, 0);
const end = start + 35 * minute;
const samples = [
  { timestamp: start },
  { timestamp: start + 5 * minute },
  { timestamp: start + 14.5 * minute },
  { timestamp: start + 15 * minute },
  { timestamp: start + 34 * minute },
];

const tenMinuteRate = buildScadaDataRateSeries({
  samples,
  startTimestamp: start,
  endTimestamp: end,
  periodMinutes: 10,
});

assert.equal(tenMinuteRate.periodMinutes, 10);
assert.equal(tenMinuteRate.averagePerMinute, 5 / 35);
assert.deepEqual(tenMinuteRate.buckets.map(bucket => bucket.count), [2, 2, 0, 1]);
assert.deepEqual(tenMinuteRate.buckets.map(bucket => bucket.minutes), [10, 10, 10, 5]);
assert.deepEqual(tenMinuteRate.buckets.map(bucket => bucket.ratePerMinute), [0.2, 0.2, 0, 0.2]);
assert.deepEqual(
  tenMinuteRate.chartData.map(([timestamp, value]) => [timestamp, value]),
  [
    [start + 5 * minute, 0.2],
    [start + 15 * minute, 0.2],
    [start + 25 * minute, 0],
    [start + 32.5 * minute, 0.2],
  ],
);

const oneMinuteRate = buildScadaDataRateSeries({
  samples,
  startTimestamp: start,
  endTimestamp: end,
  periodMinutes: 1,
});

assert.equal(oneMinuteRate.buckets.length, 35);
assert.equal(oneMinuteRate.buckets[0].ratePerMinute, 1);
assert.equal(oneMinuteRate.buckets[5].ratePerMinute, 1);
assert.equal(oneMinuteRate.buckets[14].ratePerMinute, 1);
assert.equal(oneMinuteRate.buckets[15].ratePerMinute, 1);
assert.equal(oneMinuteRate.buckets[34].ratePerMinute, 1);

const fifteenMinuteRate = buildScadaDataRateSeries({
  samples,
  startTimestamp: start,
  endTimestamp: end,
  periodMinutes: 15,
});

assert.deepEqual(fifteenMinuteRate.buckets.map(bucket => bucket.count), [3, 1, 1]);
assert.deepEqual(fifteenMinuteRate.buckets.map(bucket => bucket.minutes), [15, 15, 5]);
assert.deepEqual(
  fifteenMinuteRate.buckets.map(bucket => Math.round(bucket.ratePerMinute * 1000) / 1000),
  [0.2, 0.067, 0.2],
);

const hourlyRate = buildScadaDataRateSeries({
  samples,
  startTimestamp: start,
  endTimestamp: end,
  periodMinutes: 60,
});

assert.equal(hourlyRate.buckets.length, 1);
assert.equal(hourlyRate.buckets[0].minutes, 35);
assert.equal(hourlyRate.buckets[0].ratePerMinute, 5 / 35);

assert.deepEqual(buildScadaDataRateSeries({
  samples,
  startTimestamp: start,
  endTimestamp: start,
  periodMinutes: 10,
}), {
  periodMinutes: 10,
  averagePerMinute: null,
  buckets: [],
  chartData: [],
  axisRange: null,
});

assert.equal(formatDataRatePerMinute(2), '2 veri/dk');
assert.equal(formatDataRatePerMinute(0.125), '0.13 veri/dk');
assert.equal(formatDataRatePerMinute(null), '-');
