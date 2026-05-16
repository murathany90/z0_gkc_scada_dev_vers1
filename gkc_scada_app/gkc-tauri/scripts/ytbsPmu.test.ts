import assert from 'node:assert/strict';
import {
  buildYtbsChartGroups,
  parseYtbsTimestamp,
} from '../src/utils/ytbsPmu.ts';
import {
  buildYtbsQueryChunks,
  formatYtbsQueryDateTime,
  mergeYtbsRawSamples,
} from '../src/utils/ytbsQueryChunks.ts';

const pmuSamples = [
  {
    zaman: '16.05.2026 22:00:02.000',
    y1: 50.02,
    y2: 405.1,
    y3: 406.2,
    y4: 404.3,
    y5: 1.1,
    y6: -118.9,
    y7: 121.0,
    y8: 980,
    y9: 981,
    y10: 982,
    y11: 10,
    y12: -110,
    y13: 130,
    y14: -368.12,
    y15: -66.01,
    y16: 374.11,
  },
  {
    zaman: '16.05.2026 22:00:02.100',
    y1: 50.03,
    y2: 405.2,
    y3: 406.3,
    y4: 404.4,
    y5: 1.2,
    y6: -118.8,
    y7: 121.1,
    y8: 983,
    y9: 984,
    y10: 985,
    y11: 11,
    y12: -109,
    y13: 131,
    y14: -369.12,
    y15: -67.01,
    y16: 375.11,
  },
];

assert.equal(parseYtbsTimestamp('16.05.2026 22:00:02.100') - parseYtbsTimestamp('16.05.2026 22:00:02.000'), 100);
assert.equal(parseYtbsTimestamp('16.05.2026 22:00:02.900') - parseYtbsTimestamp('16.05.2026 22:00:02.100'), 800);

const pmuGroups = buildYtbsChartGroups(pmuSamples, 'PMU');
assert.deepEqual(pmuGroups.map(group => group.key), [
  'guc',
  'gerilim',
  'gerilimFazoru',
  'akim',
  'akimFazoru',
  'frekans',
]);
assert.equal(pmuGroups.every(group => group.timeResolution === 'millisecond'), true);
assert.deepEqual(pmuGroups[0].series.map(series => series.label), ['Aktif Güç (y14)', 'Reaktif Güç (y15)', 'Görünen Güç (y16)']);
assert.deepEqual(pmuGroups[0].series[0].data.map(([, value]) => value), [-368.12, -369.12]);
assert.deepEqual(pmuGroups[1].series.map(series => series.label), ['Faz A (y2)', 'Faz B (y3)', 'Faz C (y4)']);
assert.deepEqual(pmuGroups[2].series.map(series => series.label), ['Faz A (y5)', 'Faz B (y6)', 'Faz C (y7)']);
assert.deepEqual(pmuGroups[3].series.map(series => series.label), ['Faz A (y8)', 'Faz B (y9)', 'Faz C (y10)']);
assert.deepEqual(pmuGroups[4].series.map(series => series.label), ['Faz A (y11)', 'Faz B (y12)', 'Faz C (y13)']);
assert.deepEqual(pmuGroups[5].series.map(series => series.label), ['Frekans (y1)']);

const pqGroups = buildYtbsChartGroups([{
  zaman: '16.05.2026 22:00:00',
  y1: 50,
  y3: 154,
  y4: 155,
  y5: 156,
  y7: 100,
  y8: 101,
  y9: 102,
  y11: 10,
  y12: 2,
  y13: 11,
}], 'PQ');
assert.deepEqual(pqGroups.map(group => group.key), ['guc', 'gerilim', 'akim', 'frekans']);
assert.equal(pqGroups.every(group => group.timeResolution === 'second'), true);

const exactThirty = buildYtbsQueryChunks({
  measurementType: 'PMU',
  startIso: '2026-05-16T12:00',
  endIso: '2026-05-16T12:30',
});
assert.equal(exactThirty.status, 'ok');
assert.equal(exactThirty.chunks.length, 1);
assert.equal(exactThirty.chunks[0].startYtbs, '16.05.2026 12:00');
assert.equal(exactThirty.chunks[0].endYtbs, '16.05.2026 12:30');

const thirtyOne = buildYtbsQueryChunks({
  measurementType: 'PMU',
  startIso: '2026-05-16T12:00',
  endIso: '2026-05-16T12:31',
});
assert.equal(thirtyOne.status, 'ok');
assert.equal(thirtyOne.chunks.length, 2);
assert.equal(thirtyOne.chunks[1].startYtbs, '16.05.2026 12:30');
assert.equal(thirtyOne.chunks[1].endYtbs, '16.05.2026 12:31');

const fourHours = buildYtbsQueryChunks({
  measurementType: 'PMU',
  startIso: '2026-05-16T12:00',
  endIso: '2026-05-16T16:00',
});
assert.equal(fourHours.status, 'ok');
assert.equal(fourHours.chunks.length, 8);

const tooLong = buildYtbsQueryChunks({
  measurementType: 'PMU',
  startIso: '2026-05-16T12:00',
  endIso: '2026-05-16T16:01',
});
assert.equal(tooLong.status, 'too_long');
assert.match(tooLong.message, /4 saatten fazla/);

const invalid = buildYtbsQueryChunks({
  measurementType: 'PMU',
  startIso: '2026-05-16T12:00',
  endIso: '2026-05-16T12:00',
});
assert.equal(invalid.status, 'invalid');

const pqLong = buildYtbsQueryChunks({
  measurementType: 'PQ',
  startIso: '2026-05-16T12:00',
  endIso: '2026-05-16T18:00',
});
assert.equal(pqLong.status, 'ok');
assert.equal(pqLong.chunks.length, 1);
assert.equal(pqLong.message, null);

const merged = mergeYtbsRawSamples([
  { zaman: '16.05.2026 22:00:02.100', y1: 50.02 },
  { zaman: '16.05.2026 22:00:02.000', y1: 50.01 },
  { zaman: '16.05.2026 22:00:02.100', y1: 50.03 },
]);
assert.deepEqual(merged.map(sample => sample.y1), [50.01, 50.02]);
assert.equal(formatYtbsQueryDateTime('2026-05-16T12:05'), '16.05.2026 12:05');
