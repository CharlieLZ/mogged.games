import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackedEnvKeys = [
  'SEEDANCE_KIE_ENABLED',
  'ENABLE_ADS_TRACKING',
  'GOOGLE_ANALYTICS_ID',
  'GOOGLE_ADS_CONVERSION_ID',
  'GOOGLE_ADS_SIGNUP_LABEL',
  'GOOGLE_ADS_BEGIN_CHECKOUT_LABEL',
  'GOOGLE_ADS_PURCHASE_LABEL',
  'GOOGLE_ADS_PURCHASE_TRACKING_MODE',
  'GOOGLE_ADS_PURCHASE_UPLOAD_CONVERSION_ACTION_ID',
  'CLARITY_ID',
  'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
  'NEXT_PUBLIC_GOOGLE_ADS_IDS',
  'NEXT_PUBLIC_GADS_SIGNUP_LABEL',
  'NEXT_PUBLIC_GADS_BEGIN_CHECKOUT_LABEL',
  'NEXT_PUBLIC_GADS_PURCHASE_LABEL',
  'NEXT_PUBLIC_CLARITY_ID',
  'NEXT_PUBLIC_ENABLE_ADS_TRACKING',
  'NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_TRACKING_MODE',
  'NEXT_RUNTIME',
] as const;

const originalEnv = Object.fromEntries(
  trackedEnvKeys.map((key) => [key, process.env[key]])
) as Record<(typeof trackedEnvKeys)[number], string | undefined>;

describe('env config compatibility', () => {
  beforeEach(() => {
    for (const key of trackedEnvKeys) {
      delete process.env[key];
    }
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of trackedEnvKeys) {
      const originalValue = originalEnv[key];
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
    vi.resetModules();
  });

  it('falls back to legacy public google ads env names when canonical keys are absent', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = 'G-LEGACY123';
    process.env.NEXT_PUBLIC_GOOGLE_ADS_IDS = 'AW-1234567890';
    process.env.NEXT_PUBLIC_GADS_SIGNUP_LABEL = 'signup123';
    process.env.NEXT_PUBLIC_GADS_BEGIN_CHECKOUT_LABEL = 'checkout123';
    process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL = 'purchase123';

    const { envConfigs } = await import('./index');

    expect(envConfigs.google_analytics_id).toBe('G-LEGACY123');
    expect(envConfigs.google_ads_conversion_id).toBe('AW-1234567890');
    expect(envConfigs.google_ads_signup_label).toBe('signup123');
    expect(envConfigs.google_ads_begin_checkout_label).toBe('checkout123');
    expect(envConfigs.google_ads_purchase_label).toBe('purchase123');
  });

  it('falls back to legacy public ads toggles when canonical keys are absent', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    process.env.NEXT_PUBLIC_ENABLE_ADS_TRACKING = 'false';
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_TRACKING_MODE = 'server';

    const { envConfigs } = await import('./index');

    expect(envConfigs.enable_ads_tracking).toBe('false');
    expect(envConfigs.google_ads_purchase_tracking_mode).toBe('server');
  });

  it('falls back to legacy public clarity env name when the canonical key is absent', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    process.env.NEXT_PUBLIC_CLARITY_ID = 'wbmhlwkst2';

    const { envConfigs } = await import('./index');

    expect(envConfigs.clarity_id).toBe('wbmhlwkst2');
  });

  it('trims trailing whitespace from runtime setting env values', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    process.env.ENABLE_ADS_TRACKING = 'true\n';
    process.env.GOOGLE_ADS_PURCHASE_TRACKING_MODE = 'server\n';
    process.env.GOOGLE_ADS_PURCHASE_UPLOAD_CONVERSION_ACTION_ID = '7574625545\n';

    const { envConfigs } = await import('./index');

    expect(envConfigs.enable_ads_tracking).toBe('true');
    expect(envConfigs.google_ads_purchase_tracking_mode).toBe('server');
    expect(envConfigs.google_ads_purchase_upload_conversion_action_id).toBe(
      '7574625545'
    );
  });

  it('defaults the Seedance KIE runtime switch to enabled when the env key is absent', async () => {
    process.env.NEXT_RUNTIME = 'edge';

    const { envConfigs } = await import('./index');

    expect(envConfigs.seedance_kie_enabled).toBe('true');
  });
});
