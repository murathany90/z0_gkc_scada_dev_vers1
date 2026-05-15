import { buildYtbsCsv, formatCsvCellForExcelTr } from '../src/utils/csvExport.js';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) {
      throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
    }
  },
  ok(value: unknown) {
    if (!value) {
      throw new Error('Expected truthy value');
    }
  },
};

const formatted = formatCsvCellForExcelTr(4065.14258926128);
assert.equal(formatted, '4065,14258926128');
assert.ok(!formatted.includes('.'));

assert.equal(formatCsvCellForExcelTr(0), '0');
assert.equal(formatCsvCellForExcelTr(-88.643684), '-88,643684');
assert.equal(formatCsvCellForExcelTr('49.985774'), '49,985774');
assert.equal(formatCsvCellForExcelTr('10.05.2026 22:48'), '10.05.2026 22:48');
assert.equal(formatCsvCellForExcelTr('A;B "C"'), '"A;B ""C"""');

const csv = buildYtbsCsv([
  {
    zaman: '10.05.2026 22:48',
    y1: 49.985774,
    y3: 4065.14258926128,
    y11: 68.569088,
    y12: -88.643684,
  },
]);

assert.ok(csv.startsWith('\uFEFFsep=;\r\nZaman;y1 (Frekans)'));
assert.ok(csv.includes('49,985774'));
assert.ok(csv.includes('4065,14258926128'));
assert.ok(csv.includes('68,569088'));
assert.ok(csv.includes('-88,643684'));
assert.ok(!csv.includes('4065.14258926128'));
