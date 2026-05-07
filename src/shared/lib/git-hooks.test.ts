import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(
  new URL('../../../scripts/install-git-hooks.mjs', import.meta.url)
);

const tempDirs: string[] = [];

async function createTempDir(prefix: string) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

async function seedHookFiles(repoDir: string) {
  const hooksDir = path.join(repoDir, '.githooks');
  await mkdir(hooksDir, { recursive: true });
  await writeFile(
    path.join(hooksDir, 'pre-commit'),
    '#!/bin/sh\nexit 0\n',
    'utf8'
  );
  await writeFile(path.join(hooksDir, 'pre-push'), '#!/bin/sh\nexit 0\n', 'utf8');
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

describe('install-git-hooks script', () => {
  it('configures core.hooksPath to the tracked .githooks directory', async () => {
    const repoDir = await createTempDir('imageeditorai-hooks-repo-');
    execFileSync('git', ['init'], { cwd: repoDir, stdio: 'pipe' });
    await seedHookFiles(repoDir);

    execFileSync('node', [scriptPath], {
      cwd: repoDir,
      stdio: 'pipe',
    });

    const hooksPath = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    expect(hooksPath).toBe('.githooks');
  });

  it('no-ops cleanly when run outside a git repository', async () => {
    const workingDir = await createTempDir('imageeditorai-hooks-non-git-');
    const leakedGitDir = path.join(process.cwd(), '.git');

    expect(() => {
      execFileSync('node', [scriptPath], {
        cwd: workingDir,
        env: {
          ...process.env,
          GIT_DIR: leakedGitDir,
        },
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});
