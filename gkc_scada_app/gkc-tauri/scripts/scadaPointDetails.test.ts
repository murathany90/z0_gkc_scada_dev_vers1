import assert from 'node:assert/strict';
import { SCADA_POINT_LIST } from '../src/data/scadaPointList.ts';

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
