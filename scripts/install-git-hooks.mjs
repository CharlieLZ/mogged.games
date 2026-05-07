#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getSanitizedGitEnv } from './git-env-utils.mjs';

const TRACKED_HOOKS_DIR = '.githooks';
const EXECUTABLE_HOOK_FILES = ['pre-commit', 'pre-push'];

function runGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    env: getSanitizedGitEnv(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function resolveRepoRoot(cwd = process.cwd()) {
  try {
    return runGit(['rev-parse', '--show-toplevel'], cwd);
  } catch {
    return null;
  }
}

export function installGitHooks(cwd = process.cwd()) {
  const repoRoot = resolveRepoRoot(cwd);

  if (!repoRoot) {
    console.log('[hooks] skipped: current directory is not a git repository');
    return {
      installed: false,
      reason: 'not_git_repo',
    };
  }

  const hooksDir = path.join(repoRoot, TRACKED_HOOKS_DIR);
  if (!existsSync(hooksDir)) {
    throw new Error(
      `[hooks] expected tracked hooks directory at ${TRACKED_HOOKS_DIR}`
    );
  }

  for (const hookFile of EXECUTABLE_HOOK_FILES) {
    const hookPath = path.join(hooksDir, hookFile);
    if (!existsSync(hookPath)) {
      throw new Error(`[hooks] missing required hook file: ${hookFile}`);
    }
    chmodSync(hookPath, 0o755);
  }

  runGit(['config', 'core.hooksPath', TRACKED_HOOKS_DIR], repoRoot);
  console.log(`[hooks] configured core.hooksPath=${TRACKED_HOOKS_DIR}`);

  return {
    installed: true,
    repoRoot,
    hooksPath: TRACKED_HOOKS_DIR,
  };
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFilePath === invokedPath) {
  installGitHooks();
}
