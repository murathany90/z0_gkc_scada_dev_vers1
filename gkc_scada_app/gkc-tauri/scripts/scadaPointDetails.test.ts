import assert from 'node:assert/strict';
import {
  SCADA_POINT_LIST,
  formatScadaVoltageLevelLabel,
  normalizeScadaVoltageLevelValue,
} from '../src/data/scadaPointList.ts';

const voltagePoint = SCADA_POINT_LIST.find(point => point.id === 'ba4abbfb-c9f6-4074-a667-21a1647fc96b');

assert.ok(voltagePoint, 'Expected enriched ADATOPRK voltage point to exist');
assert.equal(voltagePoint.aciklama1, 'Voltage Level');
assert.equal(voltagePoint.aciklama2, '0...184.8 kV');
assert.equal(voltagePoint.aciklama3, '0-32767');
assert.equal(voltagePoint.eslesmeDurumu, 'Tam eşleşme (Element Adı)');

const digitalPoint = SCADA_POINT_LIST.find(point => point.id === '8c52b95e-71b3-4f92-a4b9-5d32195b7fb7');

assert.ok(digitalPoint, 'Expected digital point to exist');
assert.equal(digitalPoint.aciklama1, '');
assert.equal(digitalPoint.aciklama2, '');
assert.equal(digitalPoint.aciklama3, '');
assert.equal(digitalPoint.eslesmeDurumu, '');

assert.equal(formatScadaVoltageLevelLabel('105'), '10.5');
assert.equal(formatScadaVoltageLevelLabel('63'), '6.3');
assert.equal(formatScadaVoltageLevelLabel('154'), '154');
assert.equal(formatScadaVoltageLevelLabel('10.5'), '10.5');

assert.equal(normalizeScadaVoltageLevelValue('315'), '31.5');
assert.equal(normalizeScadaVoltageLevelValue('336'), '33.6');
assert.equal(normalizeScadaVoltageLevelValue('345'), '34.5');
assert.equal(normalizeScadaVoltageLevelValue('275'), '27.5');
assert.equal(normalizeScadaVoltageLevelValue('144'), '14.4');
assert.equal(normalizeScadaVoltageLevelValue('105'), '10.5');
assert.equal(normalizeScadaVoltageLevelValue('63'), '6.3');
assert.equal(normalizeScadaVoltageLevelValue('31.5'), '31.5');

const decimalAliases = new Set(['315', '336', '345', '275', '144', '105', '63']);
const malformedVoltagePoints = SCADA_POINT_LIST.filter(point =>
  decimalAliases.has(point.b2Id) ||
  decimalAliases.has(point.b2Adi) ||
  decimalAliases.has(point.b3Id) ||
  decimalAliases.has(point.b3Adi)
);

assert.equal(malformedVoltagePoints.length, 0);
