#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TRACKED_TEST_PATHS = [
  ':(glob)src/**/*.test.ts',
  ':(glob)src/**/*.test.tsx',
];
const extraVitestArgs = process.argv.slice(2);

function readTrackedTestFiles() {
  try {
    const output = execFileSync(
      'git',
      ['ls-files', '--', ...TRACKED_TEST_PATHS],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'failed to read tracked test files';
    console.error(`[tracked-vitest] ${message}`);
    process.exit(1);
  }
}

const trackedFiles = readTrackedTestFiles();

if (trackedFiles.length === 0) {
  console.log('[tracked-vitest] no tracked src tests found, skipping');
  process.exit(0);
}

const runnerPath = fileURLToPath(
  new URL('./run-local-binary.mjs', import.meta.url)
);

const result = spawnSync(
  process.execPath,
  [
    runnerPath,
    'vitest',
    '--run',
    ...extraVitestArgs,
    ...trackedFiles,
  ],
  {
    stdio: 'inherit',
  }
);

if (result.error) {
  console.error(
    `[tracked-vitest] failed to launch tracked vitest runner: ${
      result.error.message || 'unknown error'
    }`
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
