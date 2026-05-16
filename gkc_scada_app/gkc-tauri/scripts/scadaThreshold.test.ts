import assert from 'node:assert/strict';
import {
  THRESHOLD_MISSING_MESSAGE,
  calculateThresholdEstimate,
  calculateThresholdSeriesEstimate,
  formatThresholdPercent,
  isThresholdAnalogElement,
  parseAnalogRange,
  parseRawRange,
} from '../src/utils/scadaThreshold.ts';

assert.deepEqual(parseAnalogRange('0...184.8 kV'), { min: 0, max: 184.8, unit: 'kV' });
assert.deepEqual(parseAnalogRange('-1974...1974'), { min: -1974, max: 1974, unit: '' });
assert.deepEqual(parseAnalogRange('47...53'), { min: 47, max: 53, unit: '' });
assert.deepEqual(parseAnalogRange('-384.1...384.1'), { min: -384.1, max: 384.1, unit: '' });
assert.equal(parseAnalogRange(''), null);
assert.equal(parseAnalogRange('not-range'), null);

assert.deepEqual(parseRawRange('0-32767'), { min: 0, max: 32767 });
assert.deepEqual(parseRawRange('0...32767'), { min: 0, max: 32767 });
assert.deepEqual(parseRawRange('-/+32767'), { min: -32767, max: 32767 });
assert.deepEqual(parseRawRange('-/+32760'), { min: -32760, max: 32760 });
assert.equal(parseRawRange(''), null);

assert.equal(isThresholdAnalogElement('P'), true);
assert.equal(isThresholdAnalogElement('Q'), true);
assert.equal(isThresholdAnalogElement('U'), true);
assert.equal(isThresholdAnalogElement('Frequ'), true);
assert.equal(isThresholdAnalogElement('Frequency'), true);
assert.equal(isThresholdAnalogElement('CB'), false);

const estimate = calculateThresholdEstimate({
  elementAdi: 'U',
  previousValue: 154,
  currentValue: 155,
  aciklama2: '0...184.8 kV',
  aciklama3: '0-32767',
});

assert.equal(estimate.status, 'ok');
if (estimate.status === 'ok') {
  assert.equal(estimate.previousValue, 154);
  assert.equal(estimate.currentValue, 155);
  assert.equal(estimate.deltaValue, 1);
  assert.equal(Math.round(estimate.estimatedThresholdPercent * 1000) / 1000, 0.541);
  assert.equal(estimate.estimatedThresholdEngineering, 1);
  assert.equal(Math.round(estimate.estimatedRawDelta * 1000) / 1000, 177.311);
  assert.equal(formatThresholdPercent(estimate.estimatedThresholdPercent), '%0.54');
}

const seriesEstimate = calculateThresholdSeriesEstimate({
  elementAdi: 'U',
  samples: [
    { timestamp: 1000, value: 150 },
    { timestamp: 2000, value: 151 },
    { timestamp: 3000, value: 153 },
    { timestamp: 4000, value: 152 },
  ],
  aciklama2: '0...200 kV',
  aciklama3: '0-1000',
});

assert.equal(seriesEstimate.status, 'ok');
if (seriesEstimate.status === 'ok') {
  assert.equal(seriesEstimate.points.length, 3);
  assert.deepEqual(seriesEstimate.points.map(point => point.timestamp), [2000, 3000, 4000]);
  assert.deepEqual(seriesEstimate.points.map(point => point.deltaValue), [1, 2, 1]);
  assert.equal(seriesEstimate.minThresholdPercent, 0.5);
  assert.equal(seriesEstimate.maxThresholdPercent, 1);
  assert.equal(Math.round(seriesEstimate.averageThresholdPercent * 1000) / 1000, 0.667);
  assert.equal(Math.round(seriesEstimate.averageThresholdEngineering * 1000) / 1000, 1.333);
}

const nonZeroSeriesEstimate = calculateThresholdSeriesEstimate({
  elementAdi: 'U',
  samples: [
    { timestamp: 1000, value: 150 },
    { timestamp: 2000, value: 150 },
    { timestamp: 3000, value: 151 },
    { timestamp: 4000, value: 151 },
    { timestamp: 5000, value: 153 },
  ],
  aciklama2: '0...200 kV',
  aciklama3: '0-1000',
});

assert.equal(nonZeroSeriesEstimate.status, 'ok');
if (nonZeroSeriesEstimate.status === 'ok') {
  assert.deepEqual(nonZeroSeriesEstimate.points.map(point => point.timestamp), [3000, 4000, 5000]);
  assert.deepEqual(nonZeroSeriesEstimate.points.map(point => point.deltaValue), [1, 0, 2]);
  assert.deepEqual(nonZeroSeriesEstimate.points.map(point => point.estimatedThresholdEngineering), [1, 1, 2]);
  assert.equal(nonZeroSeriesEstimate.minThresholdPercent, 0.5);
  assert.equal(nonZeroSeriesEstimate.maxThresholdPercent, 1);
  assert.equal(Math.round(nonZeroSeriesEstimate.averageThresholdPercent * 1000) / 1000, 0.667);
  assert.equal(Math.round(nonZeroSeriesEstimate.averageThresholdEngineering * 1000) / 1000, 1.333);
}

assert.deepEqual(calculateThresholdSeriesEstimate({
  elementAdi: 'U',
  samples: [
    { timestamp: 1000, value: 150 },
    { timestamp: 2000, value: 150 },
    { timestamp: 3000, value: 150 },
  ],
  aciklama2: '0...200 kV',
  aciklama3: '0-1000',
}), {
  status: 'missing',
  message: THRESHOLD_MISSING_MESSAGE,
  points: [],
});

assert.deepEqual(calculateThresholdSeriesEstimate({
  elementAdi: 'P',
  samples: [
    { timestamp: 1000, value: 1 },
    { timestamp: 2000, value: 2 },
  ],
  aciklama2: '',
  aciklama3: '0-32767',
}), {
  status: 'missing',
  message: THRESHOLD_MISSING_MESSAGE,
  points: [],
});

assert.deepEqual(calculateThresholdEstimate({
  elementAdi: 'CB',
  previousValue: 0,
  currentValue: 1,
  aciklama2: '0...1',
  aciklama3: '0-32767',
}), {
  status: 'digital',
  message: 'Dijital ölçüm için threshold hesaplanmaz',
});

assert.deepEqual(calculateThresholdEstimate({
  elementAdi: 'P',
  previousValue: 1,
  currentValue: 2,
  aciklama2: '',
  aciklama3: '0-32767',
}), {
  status: 'missing',
  message: 'Threshold hesaplanamadı - açıklama veya analog veri eksik',
});
