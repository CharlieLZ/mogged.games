import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const INHERITED_GIT_ENV_KEYS = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_COMMON_DIR',
  'GIT_INDEX_FILE',
  'GIT_PREFIX',
];

function resolveSharedRepoRoot(sourceEnv = process.env, cwd = process.cwd()) {
  const rawGitCommonDir =
    String(sourceEnv.GIT_COMMON_DIR || '').trim() ||
    resolveGitCommonDirFromGit(cwd);

  if (!rawGitCommonDir) {
    return null;
  }

  const gitCommonDir = path.isAbsolute(rawGitCommonDir)
    ? rawGitCommonDir
    : path.resolve(cwd, rawGitCommonDir);

  return path.basename(gitCommonDir) === '.git'
    ? path.dirname(gitCommonDir)
    : null;
}

function resolveGitCommonDirFromGit(cwd = process.cwd()) {
  try {
    return execFileSync(
      'git',
      ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    ).trim();
  } catch {
    return '';
  }
}

export function resolveNodeModulesBinPaths(
  sourceEnv = process.env,
  cwd = process.cwd()
) {
  const binPaths = [];
  const localBinPath = path.join(cwd, 'node_modules', '.bin');
  const sharedRepoRoot = resolveSharedRepoRoot(sourceEnv, cwd);
  const sharedBinPath = sharedRepoRoot
    ? path.join(sharedRepoRoot, 'node_modules', '.bin')
    : null;

  for (const candidate of [localBinPath, sharedBinPath]) {
    if (!candidate || binPaths.includes(candidate) || !existsSync(candidate)) {
      continue;
    }

    binPaths.push(candidate);
  }

  return binPaths;
}

export function getSanitizedGitEnv(sourceEnv = process.env, cwd = process.cwd()) {
  const env = { ...sourceEnv };
  const nodeModulesBinPaths = resolveNodeModulesBinPaths(sourceEnv, cwd);
  const existingPath = String(env.PATH || '').trim();

  if (nodeModulesBinPaths.length > 0) {
    env.PATH = [...nodeModulesBinPaths, existingPath]
      .filter(Boolean)
      .join(path.delimiter);
  }

  for (const key of INHERITED_GIT_ENV_KEYS) {
    delete env[key];
  }

  return env;
}

export function isBlockedEnvFile(filePath) {
  const fileName = path.basename(String(filePath || '').trim());
  return /^\.env($|[.-])/.test(fileName);
}
