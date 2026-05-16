import assert from 'node:assert/strict';
import {
  buildScadaQualityReportCsv,
  buildScadaQualityReportPrintHtml,
  buildScadaQualityRows,
  calculateDataRatePerMinute,
  calculateScadaQualityStats,
  filterAnalogScadaPointsByB1,
  formatDataRatePerMinute,
  resolveScadaQueryId,
} from '../src/utils/scadaQualityReport.ts';
import type { ScadaMeasurementPoint } from '../src/data/scadaPointList.ts';

const createPoint = (
  id: string,
  b1Adi: string,
  measurementKind: ScadaMeasurementPoint['measurementKind'],
): ScadaMeasurementPoint => ({
  id,
  b1Id: b1Adi,
  b1Adi,
  b2Id: '154',
  b2Adi: '154',
  b3Id: id === 'u-1' ? 'BB_1' : 'TR_A',
  b3Adi: id === 'u-1' ? 'BB_1' : 'TR_A',
  trafoMerkezi: '',
  anahtar: '',
  elementId: id === 'q-1' ? 'Reaktif Güç (MVAr) (Q)' : 'Gerilim (kV) (U)',
  elementAdi: id === 'q-1' ? 'Q' : measurementKind === 'digital' ? 'CB' : 'U',
  noel: measurementKind === 'digital' ? 'Anahtar (neSwitch)' : 'Ölçüm (neMeasVal)',
  nimset: id,
  esli: true,
  aktif: true,
  aciklama1: '',
  aciklama2: id === 'q-1' ? '-100...100 MVAr' : '0...200 kV',
  aciklama3: '0-1000',
  eslesmeDurumu: '',
  measurementKind,
  unit: id === 'q-1' ? 'MVAr' : 'kV',
});

const digitalTapPoint = createPoint('tap-1', 'BAGLUM', 'analog');
digitalTapPoint.elementId = 'Kademe (Dijital) (Tap_Chan)';
digitalTapPoint.elementAdi = 'Tap_Chan';
digitalTapPoint.noel = 'Kademe (neTapChan)';

const points = [
  createPoint('u-1', 'BAGLUM', 'analog'),
  createPoint('cb-1', 'BAGLUM', 'digital'),
  createPoint('q-1', 'BAGLUM', 'analog'),
  digitalTapPoint,
  createPoint('u-2', 'OTHER', 'analog'),
];

const filtered = filterAnalogScadaPointsByB1(points, 'BAGLUM');
assert.deepEqual(filtered.map(point => point.id), ['u-1', 'q-1']);

const rows = buildScadaQualityRows(filtered);
assert.equal(rows.length, 2);
assert.equal(rows[0].status, 'pending');
assert.equal(rows[0].point.id, 'u-1');

const stats = calculateScadaQualityStats(createPoint('u-1', 'BAGLUM', 'analog'), [
  { zaman: '16.05.2026 12:00:00', deger: 150 },
  { zaman: '16.05.2026 12:01:00', deger: 151 },
  { zaman: '16.05.2026 12:02:00', deger: 153 },
], '2026-05-16T12:00', '2026-05-16T12:03');

assert.equal(stats.sampleCount, 3);
assert.equal(stats.samplesPerMinute, 1);
assert.equal(stats.min, 150);
assert.equal(stats.max, 153);
assert.equal(stats.average, 151.33333333333334);
assert.equal(stats.averageThresholdPercent, 0.75);
assert.equal(stats.averageThresholdEngineering, 1.5);

const statsWithZeroThresholds = calculateScadaQualityStats(createPoint('u-1', 'BAGLUM', 'analog'), [
  { zaman: '16.05.2026 12:00:00', deger: 150 },
  { zaman: '16.05.2026 12:01:00', deger: 150 },
  { zaman: '16.05.2026 12:02:00', deger: 151 },
  { zaman: '16.05.2026 12:03:00', deger: 151 },
  { zaman: '16.05.2026 12:04:00', deger: 153 },
]);

assert.equal(statsWithZeroThresholds.sampleCount, 5);
assert.equal(Math.round(Number(statsWithZeroThresholds.averageThresholdPercent) * 1000) / 1000, 0.667);
assert.equal(Math.round(Number(statsWithZeroThresholds.averageThresholdEngineering) * 1000) / 1000, 1.333);

assert.equal(calculateDataRatePerMinute(160, '2026-05-16T14:00', '2026-05-16T15:20'), 2);
assert.equal(calculateDataRatePerMinute(0, '2026-05-16T14:00', '2026-05-16T15:20'), 0);
assert.equal(calculateDataRatePerMinute(10, '2026-05-16T14:00', '2026-05-16T14:00'), null);
assert.equal(formatDataRatePerMinute(2), '2 veri/dk');
assert.equal(formatDataRatePerMinute(null), '-');

assert.equal(resolveScadaQueryId(createPoint('u-1', 'BAGLUM', 'analog'), [
  { value: 'remote-p', label: 'P' },
  { value: 'remote-u', label: 'U' },
]), 'remote-u');

assert.equal(resolveScadaQueryId(createPoint('u-1', 'BAGLUM', 'analog'), [
  { value: 'u-1', label: 'Eski U' },
  { value: 'remote-u', label: 'U' },
]), 'u-1');

assert.equal(resolveScadaQueryId(createPoint('u-1', 'BAGLUM', 'analog'), []), 'u-1');

const emptyStats = calculateScadaQualityStats(createPoint('u-1', 'BAGLUM', 'analog'), []);
assert.equal(emptyStats.sampleCount, 0);
assert.equal(emptyStats.min, null);
assert.equal(emptyStats.max, null);
assert.equal(emptyStats.average, null);
assert.equal(emptyStats.averageThresholdPercent, null);

const csv = buildScadaQualityReportCsv([
  {
    id: 'u-1',
    point: createPoint('u-1', 'BAGLUM', 'analog'),
    status: 'done',
    stats,
    error: null,
  },
], {
  startTime: '16.05.2026 14:00',
  endTime: '16.05.2026 15:20',
  b1Name: 'BAĞLUM',
});

assert.ok(csv.startsWith('\uFEFFsep=;\r\n'));
assert.ok(csv.includes('B1 Adi;B2;B3;Element'));
assert.ok(csv.includes('B1 Adi;BAGLUM'));
assert.ok(csv.includes('BAGLUM;154;BB_1;Gerilim (kV) (U)'));
assert.ok(csv.includes('1 veri/dk'));

const html = buildScadaQualityReportPrintHtml([
  {
    id: 'u-1',
    point: createPoint('u-1', 'BAGLUM', 'analog'),
    status: 'done',
    stats,
    error: null,
  },
], {
  startTime: '16.05.2026 14:00',
  endTime: '16.05.2026 15:20',
  b1Name: 'BAĞLUM',
});

assert.ok(html.includes('<meta charset="UTF-8"'));
assert.ok(html.includes('YTBS SCADA Veri Kalitesi Raporu'));
assert.ok(html.includes('BAĞLUM'));
