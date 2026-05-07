#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

import { getSanitizedGitEnv } from './git-env-utils.mjs';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('[git-env] expected a command to run');
  process.exit(64);
}

const result = spawnSync(command, args, {
  env: getSanitizedGitEnv(),
  stdio: 'inherit',
});

if (result.error) {
  console.error(
    `[git-env] failed to launch command: ${result.error.message || command}`
  );
  process.exit(1);
}

process.exit(result.status ?? 1);

