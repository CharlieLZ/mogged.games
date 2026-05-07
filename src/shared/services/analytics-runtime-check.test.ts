import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Configs } from '@/shared/models/config';

import {
  resetCloudflareAnalyticsRuntimeWarningState,
  resolveCloudflareAnalyticsRuntimeIssues,
  warnAboutCloudflareAnalyticsRuntimeConfig,
} from './analytics-runtime-check';

function buildConfigs(overrides: Partial<Configs> = {}): Configs {
  return {
    google_analytics_id: '',
    plausible_domain: '',
    plausible_src: '',
    ...overrides,
  };
}

describe('cloudflare analytics runtime check', () => {
  beforeEach(() => {
    resetCloudflareAnalyticsRuntimeWarningState();
  });

  it('reports missing Google Analytics and Plausible config on production workers', () => {
    const issues = resolveCloudflareAnalyticsRuntimeIssues(buildConfigs(), {
      isCloudflareWorker: true,
      isProductionLike: true,
      runtimeEnv: {},
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing-google-analytics' }),
        expect.objectContaining({ code: 'missing-plausible' }),
      ])
    );
  });

  it('reports partial Plausible config when only the domain resolves', () => {
    const issues = resolveCloudflareAnalyticsRuntimeIssues(
      buildConfigs({ plausible_domain: 'mogged.games' }),
      {
        isCloudflareWorker: true,
        isProductionLike: true,
        runtimeEnv: {
          PLAUSIBLE_DOMAIN: 'mogged.games',
        },
      }
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'partial-plausible-config' }),
      ])
    );
  });

  it('does not report issues when analytics resolve from runtime config', () => {
    const issues = resolveCloudflareAnalyticsRuntimeIssues(
      buildConfigs({
        google_analytics_id: 'G-D3SR4CETSK',
        plausible_domain: 'mogged.games',
        plausible_src: 'https://click.pageview.click/js/script.js',
      }),
      {
        isCloudflareWorker: true,
        isProductionLike: true,
        runtimeEnv: {
          GOOGLE_ANALYTICS_ID: 'G-D3SR4CETSK',
          PLAUSIBLE_DOMAIN: 'mogged.games',
          PLAUSIBLE_SRC: 'https://click.pageview.click/js/script.js',
        },
      }
    );

    expect(issues).toEqual([]);
  });

  it('warns only once per isolate when issues are present', () => {
    const warn = vi.fn();

    warnAboutCloudflareAnalyticsRuntimeConfig(buildConfigs(), {
      isCloudflareWorker: true,
      isProductionLike: true,
      runtimeEnv: {},
      logger: warn,
    });
    warnAboutCloudflareAnalyticsRuntimeConfig(buildConfigs(), {
      isCloudflareWorker: true,
      isProductionLike: true,
      runtimeEnv: {},
      logger: warn,
    });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(
      '[analytics/runtime-check] Cloudflare Worker analytics config is incomplete'
    );
  });
});
