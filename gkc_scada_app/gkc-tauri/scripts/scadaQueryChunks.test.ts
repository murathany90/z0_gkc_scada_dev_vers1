import assert from 'node:assert/strict';
import {
  buildScadaQueryChunks,
  mergeScadaQuerySamples,
} from '../src/utils/scadaQueryChunks.ts';

const labels = (startIso: string, endIso: string) => {
  const result = buildScadaQueryChunks(startIso, endIso);
  assert.equal(result.status, 'ok');
  return result.chunks.map(chunk => `${chunk.startYtbs} -> ${chunk.endYtbs}`);
};

assert.deepEqual(labels('2026-05-16T12:00', '2026-05-16T17:59'), [
  '16.05.2026 12:00 -> 16.05.2026 17:59',
]);

assert.deepEqual(labels('2026-05-16T12:00', '2026-05-16T18:00'), [
  '16.05.2026 12:00 -> 16.05.2026 18:00',
]);

assert.deepEqual(labels('2026-05-16T12:00', '2026-05-16T18:01'), [
  '16.05.2026 12:00 -> 16.05.2026 18:00',
  '16.05.2026 18:00 -> 16.05.2026 18:01',
]);

const fullDay = buildScadaQueryChunks('2026-05-16T00:00', '2026-05-17T00:00');
assert.equal(fullDay.status, 'ok');
assert.equal(fullDay.isChunked, true);
assert.equal(fullDay.chunks.length, 4);
assert.deepEqual(fullDay.chunks.map(chunk => chunk.startYtbs), [
  '16.05.2026 00:00',
  '16.05.2026 06:00',
  '16.05.2026 12:00',
  '16.05.2026 18:00',
]);
assert.equal(fullDay.chunks[3].endYtbs, '17.05.2026 00:00');

const tooLong = buildScadaQueryChunks('2026-05-16T00:00', '2026-05-17T00:01');
assert.equal(tooLong.status, 'too_long');
assert.match(tooLong.message, /24 saatten fazla/);

const zeroDuration = buildScadaQueryChunks('2026-05-16T12:00', '2026-05-16T12:00');
assert.equal(zeroDuration.status, 'invalid');

const reversed = buildScadaQueryChunks('2026-05-16T12:01', '2026-05-16T12:00');
assert.equal(reversed.status, 'invalid');

const invalid = buildScadaQueryChunks('', '2026-05-16T12:00');
assert.equal(invalid.status, 'invalid');

const merged = mergeScadaQuerySamples([
  { zaman: '16.05.2026 18:00:00', deger: 180 },
  { zaman: '16.05.2026 12:00:00', deger: 120 },
  { zaman: '16.05.2026 18:00:00', deger: 181 },
  { zaman: '16.05.2026 17:59:00', deger: 179 },
]);

assert.deepEqual(merged, [
  { zaman: '16.05.2026 12:00:00', deger: 120 },
  { zaman: '16.05.2026 17:59:00', deger: 179 },
  { zaman: '16.05.2026 18:00:00', deger: 180 },
]);
