#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { getSanitizedGitEnv, isBlockedEnvFile } from './git-env-utils.mjs';

const ZERO_OID = /^0+$/;

function runGit(args) {
  try {
    return execFileSync(
      'git',
      args,
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: getSanitizedGitEnv(),
      }
    )
      .trim()
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseArgs(argv) {
  const options = {
    mode: 'staged',
    remoteName: '',
    updatesFile: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length);
      continue;
    }

    if (arg === '--mode') {
      options.mode = argv[index + 1] || options.mode;
      index += 1;
      continue;
    }

    if (arg.startsWith('--remote-name=')) {
      options.remoteName = arg.slice('--remote-name='.length);
      continue;
    }

    if (arg === '--remote-name') {
      options.remoteName = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg.startsWith('--updates-file=')) {
      options.updatesFile = arg.slice('--updates-file='.length);
      continue;
    }

    if (arg === '--updates-file') {
      options.updatesFile = argv[index + 1] || '';
      index += 1;
    }
  }

  return options;
}

function collectBlockedFiles(files) {
  return Array.from(
    new Set(files.filter((file) => isBlockedEnvFile(file)).sort())
  );
}

function getStagedFiles() {
  return runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
}

function readUpdateLines(updatesFile) {
  const source = updatesFile
    ? readFileSync(updatesFile, 'utf8')
    : readFileSync(0, 'utf8');

  return source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getOutgoingCommits(options) {
  const commits = new Set();

  for (const line of readUpdateLines(options.updatesFile)) {
    const [localRef, localOid, remoteRef, remoteOid] = line.split(/\s+/);

    if (!localRef || !localOid || !remoteRef || !remoteOid) {
      continue;
    }

    if (ZERO_OID.test(localOid)) {
      continue;
    }

    const revListArgs = ZERO_OID.test(remoteOid)
      ? [
          'rev-list',
          localOid,
          '--not',
          options.remoteName ? `--remotes=${options.remoteName}` : '--remotes',
        ]
      : ['rev-list', `${remoteOid}..${localOid}`];

    for (const commit of runGit(revListArgs)) {
      commits.add(commit);
    }
  }

  return Array.from(commits);
}

function getPushFiles(options) {
  const files = new Set();

  for (const commit of getOutgoingCommits(options)) {
    for (const file of runGit([
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      '--root',
      '--diff-filter=ACMR',
      commit,
    ])) {
      files.add(file);
    }
  }

  return Array.from(files);
}

function printBlockedFiles(blockedFiles, mode) {
  const prefix = mode === 'push' ? '[pre-push]' : '[pre-commit]';
  const scope =
    mode === 'push' ? 'pushed commit scope' : 'commit scope';

  console.error(`${prefix} blocked env file(s) in ${scope}:`);
  for (const file of blockedFiles) {
    console.error(`  - ${file}`);
  }
  console.error(
    `${prefix} rule: never commit or push env files like .env, .env.*, .env-ref, or .env.example.`
  );
}

const options = parseArgs(process.argv.slice(2));
const files =
  options.mode === 'push' ? getPushFiles(options) : getStagedFiles();
const blockedFiles = collectBlockedFiles(files);

if (blockedFiles.length > 0) {
  printBlockedFiles(blockedFiles, options.mode);
  process.exit(1);
}
