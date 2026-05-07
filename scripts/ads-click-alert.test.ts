import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildAlertMessage,
  evaluateClickAlert,
  parseAdsClickAlertArgs,
  parsePreloadArgs,
} from './ads-click-alert';

const ORIGINAL_FIRST_THRESHOLD = process.env.ADS_CLICKER_FIRST_THRESHOLD;
const ORIGINAL_INTERVAL_CLICKS = process.env.ADS_CLICKER_INTERVAL_CLICKS;

afterEach(() => {
  if (ORIGINAL_FIRST_THRESHOLD === undefined) {
    delete process.env.ADS_CLICKER_FIRST_THRESHOLD;
  } else {
    process.env.ADS_CLICKER_FIRST_THRESHOLD = ORIGINAL_FIRST_THRESHOLD;
  }

  if (ORIGINAL_INTERVAL_CLICKS === undefined) {
    delete process.env.ADS_CLICKER_INTERVAL_CLICKS;
  } else {
    process.env.ADS_CLICKER_INTERVAL_CLICKS = ORIGINAL_INTERVAL_CLICKS;
  }
});

describe('ads click alert script', () => {
  it('fires at 1 click and then every 10 clicks with catch-up thresholds', () => {
    expect(
      evaluateClickAlert({
        accountDate: '2026-04-14',
        currentClicks: 23,
        state: {
          accountDate: '2026-04-14',
          lastObservedClicks: 8,
          lastAlertedThreshold: 0,
        },
      })
    ).toMatchObject({
      shouldAlert: true,
      triggeredThresholds: [1, 10, 20],
      nextState: {
        accountDate: '2026-04-14',
        lastObservedClicks: 23,
        lastAlertedThreshold: 20,
      },
    });
  });

  it('resets threshold state when the account date changes', () => {
    expect(
      evaluateClickAlert({
        accountDate: '2026-04-15',
        currentClicks: 1,
        state: {
          accountDate: '2026-04-14',
          lastObservedClicks: 37,
          lastAlertedThreshold: 30,
        },
      })
    ).toMatchObject({
      shouldAlert: true,
      triggeredThresholds: [1],
      nextState: {
        accountDate: '2026-04-15',
        lastObservedClicks: 1,
        lastAlertedThreshold: 1,
      },
    });
  });

  it('supports per-click alerts without duplicating the first threshold', () => {
    expect(
      evaluateClickAlert({
        accountDate: '2026-04-14',
        currentClicks: 2,
        intervalClicks: 1,
        firstThreshold: 1,
        state: {
          accountDate: '2026-04-14',
          lastObservedClicks: 1,
          lastAlertedThreshold: 1,
        },
      })
    ).toMatchObject({
      shouldAlert: true,
      triggeredThresholds: [2],
      nextState: {
        accountDate: '2026-04-14',
        lastObservedClicks: 2,
        lastAlertedThreshold: 2,
      },
    });
  });

  it('does not duplicate the first threshold on the first per-click alert of the day', () => {
    expect(
      evaluateClickAlert({
        accountDate: '2026-04-15',
        currentClicks: 3,
        intervalClicks: 1,
        firstThreshold: 1,
        state: {
          accountDate: '2026-04-14',
          lastObservedClicks: 12,
          lastAlertedThreshold: 12,
        },
      })
    ).toMatchObject({
      shouldAlert: true,
      triggeredThresholds: [1, 2, 3],
      nextState: {
        accountDate: '2026-04-15',
        lastObservedClicks: 3,
        lastAlertedThreshold: 3,
      },
    });
  });

  it('builds a Feishu summary with totals and top rows', () => {
    expect(
      buildAlertMessage({
        accountName: 'mogged',
        customerId: '8817947507',
        accountDate: '2026-04-14',
        summary: {
          clicks: 23,
          impressions: 420,
          costMicros: 1_230_000,
          ctr: 0.05476,
          currencyCode: 'USD',
        },
        thresholds: [10, 20],
        campaigns: [
          {
            name: 'Brand Search',
            clicks: 11,
            impressions: 120,
            costMicros: 500_000,
          },
        ],
        adGroups: [
          {
            campaignName: 'Brand Search',
            name: 'HH Brand Core',
            clicks: 9,
            impressions: 90,
            costMicros: 330_000,
          },
        ],
        searchTerms: [
          {
            searchTerm: 'image editor ai',
            searchTermMatchType: 'EXACT',
            device: 'MOBILE',
            adNetworkType: 'SEARCH',
            campaignId: '23753690087',
            campaignName: 'HH0414_FR_T2V_MOB_EXA',
            adGroupId: '193754946445',
            adGroupName: 'HH0414_FR_T2V_MOB_EXA_BRAND',
            clicks: 1,
            impressions: 1,
            costMicros: 240_000,
          },
        ],
        keywords: [
          {
            keywordText: 'image editor ai',
            keywordMatchType: 'EXACT',
            device: 'MOBILE',
            adNetworkType: 'SEARCH',
            campaignId: '23753690087',
            campaignName: 'HH0414_FR_T2V_MOB_EXA',
            adGroupId: '193754946445',
            adGroupName: 'HH0414_FR_T2V_MOB_EXA_BRAND',
            clicks: 1,
            impressions: 1,
            costMicros: 240_000,
          },
        ],
      })
    ).toContain('thresholds: 10, 20');
    expect(
      buildAlertMessage({
        accountName: 'mogged',
        customerId: '8817947507',
        accountDate: '2026-04-14',
        summary: {
          clicks: 23,
          impressions: 420,
          costMicros: 1_230_000,
          ctr: 0.05476,
          currencyCode: 'USD',
        },
        thresholds: [10, 20],
        campaigns: [],
        adGroups: [],
        searchTerms: [
          {
            searchTerm: 'image editor ai',
            searchTermMatchType: 'EXACT',
            device: 'MOBILE',
            adNetworkType: 'SEARCH',
            campaignId: '23753690087',
            campaignName: 'HH0414_FR_T2V_MOB_EXA',
            adGroupId: '193754946445',
            adGroupName: 'HH0414_FR_T2V_MOB_EXA_BRAND',
            clicks: 1,
            impressions: 1,
            costMicros: 240_000,
          },
        ],
        keywords: [
          {
            keywordText: 'image editor ai',
            keywordMatchType: 'EXACT',
            device: 'MOBILE',
            adNetworkType: 'SEARCH',
            campaignId: '23753690087',
            campaignName: 'HH0414_FR_T2V_MOB_EXA',
            adGroupId: '193754946445',
            adGroupName: 'HH0414_FR_T2V_MOB_EXA_BRAND',
            clicks: 1,
            impressions: 1,
            costMicros: 240_000,
          },
        ],
      })
    ).toContain(
      'term "image editor ai" | term_match EXACT | device MOBILE | network SEARCH | campaign HH0414_FR_T2V_MOB_EXA (#23753690087) | ad_group HH0414_FR_T2V_MOB_EXA_BRAND (#193754946445)'
    );
  });

  it('parses args with the mogged customer id default', () => {
    expect(parseAdsClickAlertArgs([])).toMatchObject({
      customerId: '8817947507',
      intervalClicks: 10,
      firstThreshold: 1,
    });
  });

  it('parses cadence from env overrides', () => {
    process.env.ADS_CLICKER_FIRST_THRESHOLD = '1';
    process.env.ADS_CLICKER_INTERVAL_CLICKS = '1';

    expect(parseAdsClickAlertArgs([])).toMatchObject({
      customerId: '8817947507',
      intervalClicks: 1,
      firstThreshold: 1,
    });
  });

  it('extracts the workspace dir without choking on state-file args', () => {
    expect(
      parsePreloadArgs([
        '--workspace-dir',
        '/repo/mogged.games',
        '--state-file',
        '/Users/project/脚本/google-ads/ads-click-alert/state.json',
      ])
    ).toMatchObject({
      workspaceDir: '/repo/mogged.games',
    });
  });

  it('can boot from a deployed copy outside the repo without requiring local node_modules', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'ads-click-alert-'));
    const deployedScriptPath = join(fixtureRoot, 'deploy', 'ads-click-alert.ts');
    const runnerPath = join(fixtureRoot, 'runner.ts');
    const workspaceDir = join(fixtureRoot, 'workspace');
    const missingApiMdPath = join(fixtureRoot, 'missing-api.md');
    const missingSharedEnvPath = join(fixtureRoot, 'missing-google-ads.env');
    const tsxCliPath = resolve(
      process.cwd(),
      'node_modules',
      'tsx',
      'dist',
      'cli.mjs'
    );

    mkdirSync(join(fixtureRoot, 'deploy'), { recursive: true });
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(join(workspaceDir, '.env'), '', 'utf8');
    writeFileSync(join(workspaceDir, '.env-ref'), '', 'utf8');
    copyFileSync(
      resolve(process.cwd(), 'scripts', 'ads-click-alert.ts'),
      deployedScriptPath
    );
    writeFileSync(
      runnerPath,
      [
        `import { runAdsClickAlert } from ${JSON.stringify(deployedScriptPath)};`,
        '',
        'runAdsClickAlert([',
        `  '--workspace-dir', ${JSON.stringify(workspaceDir)},`,
        `  '--api-md-path', ${JSON.stringify(missingApiMdPath)},`,
        `  '--shared-env-path', ${JSON.stringify(missingSharedEnvPath)},`,
        "  '--dry-run',",
        ']).catch((error) => {',
        "  console.error(error instanceof Error ? error.message : String(error));",
        '  process.exitCode = 1;',
        '});',
        '',
      ].join('\n'),
      'utf8'
    );

    try {
      const result = spawnSync(
        process.execPath,
        [
          tsxCliPath,
          runnerPath,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            GOOGLE_ADS_DEVELOPER_TOKEN: '',
            GOOGLE_ADS_CLIENT_ID: '',
            GOOGLE_ADS_CLIENT_SECRET: '',
            GOOGLE_ADS_REFRESH_TOKEN: '',
            GOOGLE_ADS_LOGIN_CUSTOMER_ID: '',
            GOOGLE_ADS_CUSTOMER_ID: '',
          },
        }
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Missing Google Ads config');
      expect(result.stderr).not.toContain("Cannot find module 'dotenv'");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
