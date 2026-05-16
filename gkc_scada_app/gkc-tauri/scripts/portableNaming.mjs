import { access, copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTABLE_PREFIX = 'gkc-scada-test';
const SOURCE_EXE = path.resolve('src-tauri', 'target', 'release', 'gkc-tauri.exe');
const OUTPUT_DIR = path.resolve('portable-builds');

const pad2 = value => String(value).padStart(2, '0');

export const formatDateStamp = (date = new Date()) => {
  const year = pad2(date.getFullYear() % 100);
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}${month}${day}`;
};

export const buildPortableExeName = (date = new Date(), version = 1) => {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Version must be a positive integer, got ${version}`);
  }

  return `${PORTABLE_PREFIX}_v${formatDateStamp(date)}_vers${version}.exe`;
};

export const buildPortableMetadata = (date = new Date(), version = 1) => {
  const exeName = buildPortableExeName(date, version);
  return {
    exeName,
    windowTitle: exeName.replace(/\.exe$/i, ''),
  };
};

export const createPortableBuildEnv = (metadata, baseEnv = process.env) => ({
  ...baseEnv,
  VITE_PORTABLE_EXE_NAME: metadata.exeName,
  VITE_PORTABLE_WINDOW_TITLE: metadata.windowTitle,
});

export const nextPortableVersion = (existingNames, date = new Date()) => {
  const stamp = formatDateStamp(date);
  const pattern = new RegExp(`^${PORTABLE_PREFIX}_v${stamp}_vers(\\d+)\\.exe$`, 'i');
  const maxVersion = existingNames.reduce((max, name) => {
    const match = pattern.exec(name);
    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 0);

  return maxVersion + 1;
};

export const resolveNextPortablePath = (outputDir, existingNames, date = new Date()) => {
  const version = nextPortableVersion(existingNames, date);
  const metadata = buildPortableMetadata(date, version);
  return {
    fileName: metadata.exeName,
    outputPath: path.join(outputDir, metadata.exeName),
    version,
    windowTitle: metadata.windowTitle,
  };
};

const parseArgs = argv => {
  const args = {
    sourcePath: SOURCE_EXE,
    outputDir: OUTPUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source') {
      args.sourcePath = path.resolve(argv[index + 1] ?? '');
      index += 1;
    } else if (arg === '--out') {
      args.outputDir = path.resolve(argv[index + 1] ?? '');
      index += 1;
    }
  }

  return args;
};

export const copyLatestPortableExe = async ({
  sourcePath = SOURCE_EXE,
  outputDir = OUTPUT_DIR,
  now = new Date(),
} = {}) => {
  await access(sourcePath);
  await mkdir(outputDir, { recursive: true });

  const existingNames = await readdir(outputDir);
  const resolved = resolveNextPortablePath(outputDir, existingNames, now);
  await copyFile(sourcePath, resolved.outputPath);
  return resolved;
};

const isMainModule = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  const args = parseArgs(process.argv.slice(2));
  copyLatestPortableExe(args)
    .then(result => {
      console.log(`Portable EXE created: ${result.outputPath}`);
    })
    .catch(error => {
      console.error(`Portable EXE naming failed: ${error.message}`);
      process.exitCode = 1;
    });
}
