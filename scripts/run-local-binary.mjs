#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { resolveNodeModulesBinPaths } from './git-env-utils.mjs';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('[run-local-binary] expected a command to run');
  process.exit(64);
}

const env = { ...process.env };
const binPaths = resolveNodeModulesBinPaths(process.env, process.cwd());
const existingPath = String(env.PATH || '').trim();

if (binPaths.length > 0) {
  env.PATH = [...binPaths, existingPath].filter(Boolean).join(path.delimiter);
}

const result = spawnSync(command, args, {
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(
    `[run-local-binary] failed to launch ${command}: ${
      result.error.message || 'unknown error'
    }`
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
