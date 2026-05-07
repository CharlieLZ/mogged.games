import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(
  new URL('../../../scripts/guard-env-commits.mjs', import.meta.url)
);

const tempDirs: string[] = [];

async function createTempRepo(prefix: string) {
  const repoDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(repoDir);
  execFileSync('git', ['init'], {
    cwd: repoDir,
    stdio: 'pipe',
  });
  return repoDir;
}

function commitAll(repoDir: string, message: string) {
  execFileSync(
    'git',
    [
      '-c',
      'user.name=mogged Tests',
      '-c',
      'user.email=tests@mogged.games',
      'commit',
      '-m',
      message,
    ],
    {
      cwd: repoDir,
      stdio: 'pipe',
    }
  );
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

describe('guard-env-commits script', () => {
  it('blocks commits that stage .env.example', async () => {
    const repoDir = await createTempRepo('imageeditorai-env-guard-');
    await writeFile(path.join(repoDir, '.env.example'), 'SECRET=false\n', 'utf8');
    execFileSync('git', ['add', '.env.example'], {
      cwd: repoDir,
      stdio: 'pipe',
    });

    const result = spawnSync('node', [scriptPath], {
      cwd: repoDir,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.env.example');
  });

  it('blocks commits that stage any env-related file variant', async () => {
    const repoDir = await createTempRepo('imageeditorai-env-guard-');
    await mkdir(path.join(repoDir, 'config'), { recursive: true });
    await writeFile(
      path.join(repoDir, 'config/.env.production'),
      'SECRET=true\n',
      'utf8'
    );
    execFileSync('git', ['add', 'config/.env.production'], {
      cwd: repoDir,
      stdio: 'pipe',
    });

    const result = spawnSync('node', [scriptPath], {
      cwd: repoDir,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('config/.env.production');
  });

  it('allows commits that only stage non-env files', async () => {
    const repoDir = await createTempRepo('imageeditorai-env-guard-');
    await writeFile(path.join(repoDir, 'README.md'), '# mogged\n', 'utf8');
    execFileSync('git', ['add', 'README.md'], {
      cwd: repoDir,
      stdio: 'pipe',
    });

    const result = spawnSync('node', [scriptPath], {
      cwd: repoDir,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
  });

  it('blocks pushes whose outgoing commits contain env-related files', async () => {
    const repoDir = await createTempRepo('imageeditorai-env-push-guard-');
    await writeFile(path.join(repoDir, 'README.md'), '# mogged\n', 'utf8');
    execFileSync('git', ['add', 'README.md'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    commitAll(repoDir, 'chore: seed repo');
    const baseSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    await writeFile(path.join(repoDir, '.env.local'), 'SECRET=true\n', 'utf8');
    execFileSync('git', ['add', '.env.local'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    commitAll(repoDir, 'chore: add env file');
    const localSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    const updatesPath = path.join(repoDir, 'push-updates.txt');
    await writeFile(
      updatesPath,
      `refs/heads/main ${localSha} refs/heads/main ${baseSha}\n`,
      'utf8'
    );

    const result = spawnSync(
      'node',
      [
        scriptPath,
        '--mode=push',
        '--remote-name=origin',
        '--updates-file',
        updatesPath,
      ],
      {
        cwd: repoDir,
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.env.local');
  });

  it('allows pushes when outgoing commits only contain non-env files', async () => {
    const repoDir = await createTempRepo('imageeditorai-env-push-guard-');
    await writeFile(path.join(repoDir, 'README.md'), '# mogged\n', 'utf8');
    execFileSync('git', ['add', 'README.md'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    commitAll(repoDir, 'chore: seed repo');
    const baseSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    await writeFile(path.join(repoDir, 'CHANGELOG.md'), 'seedance\n', 'utf8');
    execFileSync('git', ['add', 'CHANGELOG.md'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    commitAll(repoDir, 'docs: add changelog');
    const localSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    const updatesPath = path.join(repoDir, 'push-updates.txt');
    await writeFile(
      updatesPath,
      `refs/heads/main ${localSha} refs/heads/main ${baseSha}\n`,
      'utf8'
    );

    const result = spawnSync(
      'node',
      [
        scriptPath,
        '--mode=push',
        '--remote-name=origin',
        '--updates-file',
        updatesPath,
      ],
      {
        cwd: repoDir,
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(0);
  });
});
