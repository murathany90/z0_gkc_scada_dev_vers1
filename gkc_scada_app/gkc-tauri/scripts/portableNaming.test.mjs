import assert from 'node:assert/strict';
import {
  buildPortableMetadata,
  buildPortableExeName,
  createPortableBuildEnv,
  nextPortableVersion,
  resolveNextPortablePath,
} from './portableNaming.mjs';

const buildDate = new Date(2026, 4, 16, 12, 30, 0);

assert.equal(buildPortableExeName(buildDate, 1), 'gkc-scada-test_v260516_vers1.exe');
assert.equal(buildPortableExeName(buildDate, 12), 'gkc-scada-test_v260516_vers12.exe');

const metadata = buildPortableMetadata(buildDate, 4);
assert.equal(metadata.exeName, 'gkc-scada-test_v260516_vers4.exe');
assert.equal(metadata.windowTitle, 'gkc-scada-test_v260516_vers4');

const env = createPortableBuildEnv(metadata, { EXISTING_FLAG: '1' });
assert.equal(env.EXISTING_FLAG, '1');
assert.equal(env.VITE_PORTABLE_EXE_NAME, 'gkc-scada-test_v260516_vers4.exe');
assert.equal(env.VITE_PORTABLE_WINDOW_TITLE, 'gkc-scada-test_v260516_vers4');

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
