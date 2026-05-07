import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const runnerPath = fileURLToPath(
  new URL('../../../scripts/run-in-sanitized-git-env.mjs', import.meta.url)
);

const tempDirs: string[] = [];

async function createTempDir(prefix: string) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((tempDir) =>
      rm(tempDir, {
        recursive: true,
        force: true,
      })
    )
  );
});

describe('run-in-sanitized-git-env script', () => {
  it('strips git worktree env before launching the child process', async () => {
    const tempDir = await createTempDir('imageeditorai-sanitized-git-env-');
    const childScriptPath = path.join(tempDir, 'print-env.mjs');
    await writeFile(
      childScriptPath,
      [
        "const payload = {",
        "  GIT_DIR: process.env.GIT_DIR ?? null,",
        "  GIT_WORK_TREE: process.env.GIT_WORK_TREE ?? null,",
        "  GIT_COMMON_DIR: process.env.GIT_COMMON_DIR ?? null,",
        "  GIT_INDEX_FILE: process.env.GIT_INDEX_FILE ?? null,",
        "  GIT_PREFIX: process.env.GIT_PREFIX ?? null,",
        "  CUSTOM_FLAG: process.env.CUSTOM_FLAG ?? null,",
        '};',
        'console.log(JSON.stringify(payload));',
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [runnerPath, process.execPath, childScriptPath],
      {
      cwd: '/Users/project/1B/sites/2026/mogged.games',
      encoding: 'utf8',
      env: {
        ...process.env,
        CUSTOM_FLAG: 'kept',
        GIT_DIR: '/tmp/git-dir',
        GIT_WORK_TREE: '/tmp/git-work-tree',
        GIT_COMMON_DIR: '/tmp/git-common-dir',
        GIT_INDEX_FILE: '/tmp/git-index-file',
        GIT_PREFIX: 'tmp-prefix',
      },
    }
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      GIT_DIR: null,
      GIT_WORK_TREE: null,
      GIT_COMMON_DIR: null,
      GIT_INDEX_FILE: null,
      GIT_PREFIX: null,
      CUSTOM_FLAG: 'kept',
    });
  });

  it('returns the child exit code unchanged', async () => {
    const tempDir = await createTempDir('imageeditorai-sanitized-git-exit-');
    const childScriptPath = path.join(tempDir, 'exit-7.mjs');
    await writeFile(childScriptPath, 'process.exit(7);\n', 'utf8');

    const result = spawnSync(
      process.execPath,
      [runnerPath, process.execPath, childScriptPath],
      {
        cwd: '/Users/project/1B/sites/2026/mogged.games',
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(7);
  });

  it('prepends the shared root node_modules bin when running from a worktree env', async () => {
    const repoRoot = await createTempDir('imageeditorai-shared-bin-root-');
    const sharedBinDir = path.join(repoRoot, 'node_modules', '.bin');
    const childScriptPath = path.join(repoRoot, 'print-path.mjs');
    const worktreeDir = path.join(repoRoot, '.worktrees', 'shared-bin-check');
    await mkdir(sharedBinDir, { recursive: true });
    await mkdir(worktreeDir, { recursive: true });
    await writeFile(
      childScriptPath,
      [
        "const payload = {",
        "  PATH: process.env.PATH ?? '',",
        "  GIT_COMMON_DIR: process.env.GIT_COMMON_DIR ?? null,",
        '};',
        'console.log(JSON.stringify(payload));',
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [runnerPath, process.execPath, childScriptPath],
      {
        cwd: worktreeDir,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: '/usr/bin',
          GIT_COMMON_DIR: path.join(repoRoot, '.git'),
        },
      }
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      PATH: `${sharedBinDir}${path.delimiter}/usr/bin`,
      GIT_COMMON_DIR: null,
    });
  });
});
