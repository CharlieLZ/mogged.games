import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(
  new URL('./run-tracked-vitest.mjs', import.meta.url)
);
const packageJsonPath = fileURLToPath(
  new URL('../package.json', import.meta.url)
);

const tempDirs: string[] = [];

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

describe('run-tracked-vitest script', () => {
  it('routes the pre-push gate through tracked unit tests', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['test:unit']).toBe(
      'node scripts/run-tracked-vitest.mjs'
    );
    expect(packageJson.scripts?.['test:unit:workspace']).toBe(
      'node scripts/run-local-binary.mjs vitest --run'
    );
    expect(packageJson.scripts?.pretypecheck).toBe(
      'node scripts/run-local-binary.mjs fumadocs-mdx'
    );
    expect(packageJson.scripts?.setup).toContain('pnpm db:push');
    expect(packageJson.scripts?.['db:push']).toBe(
      'NODE_OPTIONS=--conditions=react-server npx tsx scripts/db-push.ts'
    );
    expect(packageJson.scripts?.['db:sync']).toBe('pnpm db:push');
    expect(packageJson.scripts).not.toHaveProperty('db:migrate');
    expect(packageJson.scripts).not.toHaveProperty('db:migrate:psql');
    expect(packageJson.scripts).not.toHaveProperty('db:migrate:psql:dry-run');
    expect(packageJson.scripts).not.toHaveProperty('db:migrate:drizzle');
    expect(packageJson.scripts).not.toHaveProperty('db:generate');
    expect(packageJson.scripts?.['release:gate']).toContain('pnpm test:unit');
    expect(packageJson.scripts?.['gate:pre-push']).toBe('pnpm release:gate');
  });

  it('pins Next dev to port 3000 so conflicts fail instead of opening another localhost port', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.dev).toBe(
      'node scripts/dev-port-guard.mjs 3000 && node scripts/run-local-binary.mjs next dev --webpack --port 3000'
    );
    expect(packageJson.scripts?.['dev:webpack']).toBe(
      'node scripts/dev-port-guard.mjs 3000 && node scripts/run-local-binary.mjs next dev --webpack --port 3000'
    );
    expect(packageJson.scripts?.['dev:cloudflare']).toBe(
      'node scripts/dev-port-guard.mjs 3000 && OPENNEXT_CLOUDFLARE_DEV=true node scripts/run-local-binary.mjs next dev --port 3000'
    );
  });

  it('runs vitest against tracked test files only', async () => {
    const repoDir = await createTempDir('imageeditorai-tracked-vitest-');
    const srcDir = path.join(repoDir, 'src');
    const fakeBinDir = path.join(repoDir, 'bin');
    const vitestLogPath = path.join(repoDir, 'vitest-invocation.txt');
    const fakeVitestPath = path.join(fakeBinDir, 'vitest');

    await mkdir(srcDir, { recursive: true });
    await mkdir(fakeBinDir, { recursive: true });

    await writeFile(
      path.join(srcDir, 'tracked.test.ts'),
      'export const tracked = true;\n',
      'utf8'
    );
    await writeFile(
      path.join(srcDir, 'untracked.test.ts'),
      'export const untracked = true;\n',
      'utf8'
    );
    await writeFile(
      fakeVitestPath,
      `#!/bin/sh\nprintf '%s\\n' "$@" > "${vitestLogPath}"\nexit 0\n`,
      { encoding: 'utf8', mode: 0o755 }
    );

    execFileSync('git', ['init'], { cwd: repoDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'mogged Bot'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['config', 'user.email', 'bot@mogged.games'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['add', 'src/tracked.test.ts'], {
      cwd: repoDir,
      stdio: 'pipe',
    });

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: repoDir,
      env: {
        ...process.env,
        PATH: `${fakeBinDir}${path.delimiter}${process.env.PATH || ''}`,
      },
      encoding: 'utf8',
      stdio: 'pipe',
    });

    expect(result.status).toBe(0);

    const invocation = await readFile(vitestLogPath, 'utf8');
    expect(invocation.trim().split('\n')).toEqual(['--run', 'src/tracked.test.ts']);
  });
});
