import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  createPortableBuildEnv,
  resolveNextPortablePath,
} from './portableNaming.mjs';

const SOURCE_EXE = path.resolve('src-tauri', 'target', 'release', 'gkc-tauri.exe');
const OUTPUT_DIR = path.resolve('portable-builds');

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

const run = (command, args, env) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    env,
    stdio: 'inherit',
  });

  child.on('error', reject);
  child.on('exit', code => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
  });
});

const runNpm = (args, env) => {
  if (process.platform === 'win32') {
    return run('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], env);
  }

  return run('npm', args, env);
};

const buildPortable = async ({ sourcePath, outputDir }) => {
  await mkdir(outputDir, { recursive: true });
  const existingNames = await readdir(outputDir);
  const resolved = resolveNextPortablePath(outputDir, existingNames);
  const env = createPortableBuildEnv({
    exeName: resolved.fileName,
    windowTitle: resolved.windowTitle,
  });

  console.log(`Portable build title: ${resolved.windowTitle}`);
  await runNpm(['run', 'tauri', '--', 'build'], env);
  await copyFile(sourcePath, resolved.outputPath);
  console.log(`Portable EXE created: ${resolved.outputPath}`);
  return resolved;
};

buildPortable(parseArgs(process.argv.slice(2))).catch(error => {
  console.error(`Portable build failed: ${error.message}`);
  process.exitCode = 1;
});
