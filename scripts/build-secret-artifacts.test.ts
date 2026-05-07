import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const {
  collectSensitiveEnvValues,
  findBuildSecretLeaks,
  formatSecretLeakReport,
  sanitizeBuildArtifacts,
  validateDockerIgnore,
} = await import('./build-secret-artifacts.mjs');

const tempDirs: string[] = [];
const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url));

async function createTempDir(prefix: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
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

describe('build secret artifact guard', () => {
  it('collects sensitive runtime values without treating public config as secret', () => {
    const secrets = collectSensitiveEnvValues([
      {
        filePath: '.env',
        vars: {
          DATABASE_URL: 'postgres://user:pass@example.com/db',
          OPENROUTER_API_KEY: 'sk-live-runtime-secret',
          NEXT_PUBLIC_APP_URL: 'https://mogged.games',
          STRIPE_PUBLISHABLE_KEY: 'pk_live_public_value',
          CREEM_API_KEY: 'creem_xxx',
          CREEM_SIGNING_SECRET: 'whsec_xxx',
          EMPTY_SECRET: '',
        },
      },
    ]);

    expect(secrets.map((secret: { key: string }) => secret.key).sort()).toEqual([
      'DATABASE_URL',
      'OPENROUTER_API_KEY',
    ]);
  });

  it('sanitizes generated env files from OpenNext and standalone output', async () => {
    const cwd = await createTempDir('imageeditorai-build-secrets-');
    const openNextCloudflareDir = path.join(cwd, '.open-next', 'cloudflare');
    const openNextFunctionDir = path.join(
      cwd,
      '.open-next',
      'server-functions',
      'default'
    );
    const standaloneDir = path.join(cwd, '.next', 'standalone');

    await mkdir(openNextCloudflareDir, { recursive: true });
    await mkdir(openNextFunctionDir, { recursive: true });
    await mkdir(standaloneDir, { recursive: true });
    await writeFile(
      path.join(openNextCloudflareDir, 'next-env.mjs'),
      'export const production = {"DATABASE_URL":"postgres://secret"};\n',
      'utf8'
    );
    await writeFile(
      path.join(openNextFunctionDir, '.env'),
      'DATABASE_URL=postgres://secret\n',
      'utf8'
    );
    await writeFile(
      path.join(standaloneDir, '.env'),
      'DATABASE_URL=postgres://secret\n',
      'utf8'
    );

    const result = sanitizeBuildArtifacts({ cwd });

    await expect(
      readFile(path.join(openNextFunctionDir, '.env'), 'utf8')
    ).rejects.toThrow();
    await expect(readFile(path.join(standaloneDir, '.env'), 'utf8')).rejects.toThrow();
    await expect(
      readFile(path.join(openNextCloudflareDir, 'next-env.mjs'), 'utf8')
    ).resolves.toBe(
      [
        '// Runtime env is provided by Cloudflare/Vercel bindings.',
        'export const production = {};',
        'export const development = {};',
        'export const test = {};',
        '',
      ].join('\n')
    );
    expect(result.actions.map((action: { type: string }) => action.type)).toEqual(
      expect.arrayContaining(['rewrite-next-env', 'remove-env-file'])
    );
  });

  it('reports leaked key names and paths without printing secret values', async () => {
    const cwd = await createTempDir('imageeditorai-build-secret-leak-');
    const secretValue = 'sk-live-runtime-secret-value';
    const outputDir = path.join(cwd, '.next', 'standalone');

    await mkdir(outputDir, { recursive: true });
    await writeFile(
      path.join(cwd, '.env'),
      `OPENROUTER_API_KEY=${secretValue}\nNEXT_PUBLIC_APP_URL=https://mogged.games\n`,
      'utf8'
    );
    await writeFile(
      path.join(outputDir, 'server.js'),
      `globalThis.leaked = ${JSON.stringify(secretValue)};\n`,
      'utf8'
    );

    const leaks = findBuildSecretLeaks({ cwd });
    const report = formatSecretLeakReport(leaks);

    expect(leaks).toHaveLength(1);
    expect(report).toContain('OPENROUTER_API_KEY');
    expect(report).toContain('.next/standalone/server.js');
    expect(report).not.toContain(secretValue);
  });

  it('requires Docker context rules that keep local env files out', async () => {
    const cwd = await createTempDir('imageeditorai-dockerignore-');

    await writeFile(
      path.join(cwd, '.dockerignore'),
      ['.next', '.open-next', '.env*', '.dev.vars*', 'node_modules', ''].join(
        '\n'
      ),
      'utf8'
    );

    expect(validateDockerIgnore({ cwd })).toEqual([]);

    await writeFile(path.join(cwd, '.dockerignore'), 'node_modules\n', 'utf8');

    expect(validateDockerIgnore({ cwd }).map((issue: { pattern: string }) => issue.pattern)).toEqual(
      expect.arrayContaining(['.env*', '.dev.vars*', '.open-next'])
    );
  });

  it('wires build scripts through sanitize and guard steps', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['sanitize:build-secrets']).toBe(
      'node scripts/build-secret-artifacts.mjs sanitize'
    );
    expect(packageJson.scripts?.['guard:build-secrets']).toBe(
      'node scripts/build-secret-artifacts.mjs guard'
    );
    expect(packageJson.scripts?.['build:next']).toContain(
      'pnpm sanitize:build-secrets:next && pnpm guard:build-secrets:next'
    );
    expect(packageJson.scripts?.build).toContain(
      'pnpm sanitize:build-secrets && pnpm guard:build-secrets'
    );
    expect(packageJson.scripts?.['cf:build']).toContain(
      'pnpm sanitize:build-secrets && pnpm guard:build-secrets'
    );
  });
});
