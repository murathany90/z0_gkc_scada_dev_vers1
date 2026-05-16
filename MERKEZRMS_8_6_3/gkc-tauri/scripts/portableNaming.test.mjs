import assert from 'node:assert/strict';
import {
  buildPortableExeName,
  nextPortableVersion,
  resolveNextPortablePath,
} from './portableNaming.mjs';

const buildDate = new Date(2026, 4, 16, 12, 30, 0);

assert.equal(buildPortableExeName(buildDate, 1), 'gkc-scada-test_v260516_vers1.exe');
assert.equal(buildPortableExeName(buildDate, 12), 'gkc-scada-test_v260516_vers12.exe');

assert.equal(
  nextPortableVersion([
    'gkc-scada-test_v260516_vers1.exe',
    'gkc-scada-test_v260516_vers2.exe',
    'gkc-scada-test_v260515_vers9.exe',
    'gkc-tauri.exe',
  ], buildDate),
  3,
);

assert.equal(
  nextPortableVersion([
    'gkc-scada-test_v260516_vers1.exe',
    'gkc-scada-test_v260516_vers3.exe',
  ], buildDate),
  4,
);

const resolved = resolveNextPortablePath('C:/repo/portable-builds', [
  'gkc-scada-test_v260516_vers1.exe',
], buildDate);

assert.equal(resolved.fileName, 'gkc-scada-test_v260516_vers2.exe');
assert.equal(resolved.version, 2);
assert.ok(resolved.outputPath.endsWith('gkc-scada-test_v260516_vers2.exe'));
