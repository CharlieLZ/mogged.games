import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('cloudflare workers config', () => {
  const requiredAnalyticsVars = [
    'GOOGLE_ANALYTICS_ID = "G-D3SR4CETSK"',
    'PLAUSIBLE_DOMAIN = "mogged.games"',
    'PLAUSIBLE_SRC = "https://click.pageview.click/js/script.js"',
  ];
  const requiredTrackedWorkerVars = [
    '"GOOGLE_ANALYTICS_ID": "G-D3SR4CETSK"',
    '"PLAUSIBLE_DOMAIN": "mogged.games"',
    '"PLAUSIBLE_SRC": "https://click.pageview.click/js/script.js"',
    '"NEXT_PUBLIC_GOOGLE_ANALYTICS_ID": "G-D3SR4CETSK"',
    '"NEXT_PUBLIC_DOMAIN": "mogged.games"',
    '"NEXT_PUBLIC_PLAUSIBLE_URL": "https://click.pageview.click/js/script.js"',
    '"NEXT_PUBLIC_PLAUSIBLE_DOMAIN": "mogged.games"',
    '"NEXT_PUBLIC_PLAUSIBLE_SCRIPT": "https://click.pageview.click/js/script.js"',
  ];
  const requiredSyncedPlainTextVars = [
    'CLOUDFLARE_WORKER_SECRETS_API_TOKEN',
    "'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'",
    "'NEXT_PUBLIC_DOMAIN'",
    "'NEXT_PUBLIC_PLAUSIBLE_URL'",
    "'NEXT_PUBLIC_PLAUSIBLE_DOMAIN'",
    "'NEXT_PUBLIC_PLAUSIBLE_SCRIPT'",
  ];

  it('commits a wrangler example for OpenNext workers with modern node compatibility', () => {
    const wranglerPath = path.join(process.cwd(), 'wrangler.toml.example');

    expect(fs.existsSync(wranglerPath)).toBe(true);

    const wranglerSource = fs.readFileSync(wranglerPath, 'utf8');
    const compatibilityDateMatch = wranglerSource.match(
      /compatibility_date\s*=\s*"(\d{4}-\d{2}-\d{2})"/
    );

    expect(wranglerSource).toContain('main = "./worker.ts"');
    expect(wranglerSource).toContain('name = "mogged-games"');
    expect(wranglerSource).toContain('NEXT_PUBLIC_APP_NAME = "mogged"');
    expect(wranglerSource).toContain('compatibility_flags = ["nodejs_compat"]');
    expect(wranglerSource).toContain('crons = ["5 * * * *"]');
    expect(wranglerSource).toContain('binding = "HYPERDRIVE"');
    for (const requiredVar of requiredAnalyticsVars) {
      expect(wranglerSource).toContain(requiredVar);
    }
    const compatibilityDate = compatibilityDateMatch?.[1];

    expect(compatibilityDate).toBeDefined();
    expect(compatibilityDate && compatibilityDate >= '2025-09-01').toBe(true);
  });

  it('commits tracked wrangler vars for analytics bindings used by auto deploys', () => {
    const wranglerPath = path.join(process.cwd(), 'wrangler.jsonc');
    const wranglerSource = fs.readFileSync(wranglerPath, 'utf8');

    for (const requiredVar of requiredTrackedWorkerVars) {
      expect(wranglerSource).toContain(requiredVar);
    }
  });

  it('syncs Cloudflare plain-text analytics vars with the worker-secrets token fallback', () => {
    const syncScriptPath = path.join(process.cwd(), 'scripts/setup-cf-vars.mjs');
    const syncScriptSource = fs.readFileSync(syncScriptPath, 'utf8');

    for (const requiredValue of requiredSyncedPlainTextVars) {
      expect(syncScriptSource).toContain(requiredValue);
    }
  });

  it('documents the Cloudflare analytics runtime requirements and sanitized build behavior', () => {
    const readmePath = path.join(process.cwd(), 'README.md');
    const readurlPath = path.join(process.cwd(), 'readurl.md');
    const readmeSource = fs.readFileSync(readmePath, 'utf8');
    const readurlSource = fs.readFileSync(readurlPath, 'utf8');

    for (const requiredVar of requiredAnalyticsVars) {
      const key = requiredVar.split(' = ')[0];
      expect(readmeSource).toContain(key);
      expect(readurlSource).toContain(key);
    }
    expect(readmeSource).toContain('wrangler.jsonc');
    expect(readmeSource).toContain('cf:vars:sync');
    expect(readurlSource).toContain('wrangler.jsonc');
    expect(readurlSource).toContain('cf:vars:sync');
    expect(readurlSource).toContain('.open-next/cloudflare/next-env.mjs');
    expect(readurlSource).toContain('cf:secrets:sync');
  });

  it('defines an OpenNext Cloudflare config entrypoint', async () => {
    const { default: cloudflareConfig } = await import(
      pathToFileURL(path.join(process.cwd(), 'open-next.config.ts')).href
    );

    expect(cloudflareConfig).toBeDefined();
  });
});
