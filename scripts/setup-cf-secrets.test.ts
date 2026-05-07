import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(
  new URL('./setup-cf-secrets.sh', import.meta.url)
);

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cf-secrets-'));
  tempDirs.push(dir);
  return dir;
}

describe('setup-cf-secrets script', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true }))
    );
  });

  it('dry-runs valid env keys without printing secret values', async () => {
    const dir = await makeTempDir();
    const envPath = path.join(dir, '.env');
    await writeFile(
      envPath,
      [
        'API_KEY=real-secret-value',
        'EMPTY_VALUE=',
        'PLACEHOLDER_VALUE=replace',
        'QUOTED_TOKEN="quoted-secret-value"',
        '',
      ].join('\n')
    );

    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        CF_SECRETS_DRY_RUN: '1',
        CF_SECRETS_ENV_FILE: envPath,
        CF_SECRETS_WORKER_NAME: 'example-worker',
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Dry run: values will not be uploaded');
    expect(result.stdout).toContain(
      'dry-run secret put API_KEY --name example-worker'
    );
    expect(result.stdout).toContain(
      'dry-run secret put QUOTED_TOKEN --name example-worker'
    );
    expect(result.stdout).toContain('skip EMPTY_VALUE: empty or placeholder');
    expect(result.stdout).toContain(
      'skip PLACEHOLDER_VALUE: empty or placeholder'
    );
    expect(result.stdout).not.toContain('real-secret-value');
    expect(result.stdout).not.toContain('quoted-secret-value');
  });

  it('fails fast when the env file is missing', () => {
    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        CF_SECRETS_ENV_FILE: '/tmp/missing-cf-secrets-env-file',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing env file');
  });

  it('returns a non-zero exit code when Wrangler upload fails', async () => {
    const dir = await makeTempDir();
    const binDir = path.join(dir, 'bin');
    const envPath = path.join(dir, '.env');
    const pnpmPath = path.join(binDir, 'pnpm');

    await mkdir(binDir);
    await writeFile(envPath, 'API_KEY=real-secret-value\n');
    await writeFile(pnpmPath, '#!/usr/bin/env bash\nexit 17\n');
    await chmod(pnpmPath, 0o755);

    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        CF_SECRETS_ENV_FILE: envPath,
        PATH: `${binDir}:${process.env.PATH || ''}`,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('upload API_KEY');
    expect(result.stdout).toContain('failed API_KEY');
    expect(result.stdout).toContain('ok: 0 | failed: 1');
  });
});
