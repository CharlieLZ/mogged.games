// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serializeAdsAttributionCookie } from './ads-attribution';
import {
  buildGoogleAdsSignupStorageKeys,
  convertMinorUnitsToGoogleAdsValue,
  formatGoogleAdsConversionDateTime,
  hasTrackedGoogleAdsSignup,
  markGoogleAdsSignupTracked,
  pickGoogleAdsClickIdentifier,
  resolveGoogleAdsConfigs,
  trackGoogleAdsSignupConversion,
} from './google-ads';

describe('google ads helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.gtag;
    document.cookie =
      'hh_ads_attribution=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('converts cent-based values into major currency units for ads tracking', () => {
    expect(convertMinorUnitsToGoogleAdsValue(118800, 'usd')).toBe(1188);
    expect(convertMinorUnitsToGoogleAdsValue(2900, 'USD')).toBe(29);
  });

  it('keeps zero-decimal currencies unchanged', () => {
    expect(convertMinorUnitsToGoogleAdsValue(5000, 'JPY')).toBe(5000);
  });

  it('resolves the ads tracking switch and purchase tracking mode from config', () => {
    expect(
      resolveGoogleAdsConfigs({
        enable_ads_tracking: 'false',
        google_ads_purchase_tracking_mode: 'server',
        google_ads_conversion_id: '1234567890',
      })
    ).toMatchObject({
      enabled: false,
      purchaseTrackingMode: 'server',
      conversionId: 'AW-1234567890',
    });
  });

  it('rejects ambiguous click identifiers when more than one google click id is present', () => {
    expect(
      pickGoogleAdsClickIdentifier({
        gclid: 'gclid_123',
        wbraid: 'wbraid_123',
      })
    ).toBeNull();
  });

  it('formats conversion timestamps in the google ads import format', () => {
    expect(
      formatGoogleAdsConversionDateTime(new Date('2026-04-14T06:07:08.000Z'))
    ).toBe('2026-04-14 06:07:08+00:00');
  });

  it('builds signup dedupe keys for both user id and email', () => {
    expect(
      buildGoogleAdsSignupStorageKeys({
        userId: 'user_123',
        email: 'Ads-E2E@example.com',
      })
    ).toEqual([
      'google_ads_signup_tracked:user_123',
      'google_ads_signup_tracked:ads-e2e@example.com',
    ]);
  });

  it('marks signup conversions as tracked across user and email identities', () => {
    markGoogleAdsSignupTracked({
      userId: 'user_123',
      email: 'Ads-E2E@example.com',
    });

    expect(
      hasTrackedGoogleAdsSignup({
        userId: 'user_123',
      })
    ).toBe(true);
    expect(
      hasTrackedGoogleAdsSignup({
        email: 'ads-e2e@example.com',
      })
    ).toBe(true);
  });

  it('tracks signup conversions immediately after successful registration and dedupes repeats', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    document.cookie = `hh_ads_attribution=${serializeAdsAttributionCookie({
      utm_source: 'google',
      utm_campaign: 'hh0414-en-t2v-pc-exa',
      gclid: 'gclid_123',
      landing_path: '/ai-video-generator/text-to-video',
    })}`;

    expect(
      trackGoogleAdsSignupConversion({
        configs: {
          enable_ads_tracking: 'true',
          google_ads_conversion_id: '18076962334',
          google_ads_signup_label: 'register-label',
        },
        email: 'ads-e2e@example.com',
      })
    ).toBe(true);

    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-18076962334/register-label',
      value: 1,
      currency: 'USD',
    });

    expect(
      trackGoogleAdsSignupConversion({
        configs: {
          enable_ads_tracking: 'true',
          google_ads_conversion_id: '18076962334',
          google_ads_signup_label: 'register-label',
        },
        email: 'ads-e2e@example.com',
      })
    ).toBe(false);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('does not track signup conversions without a google ads attribution cookie', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    expect(
      trackGoogleAdsSignupConversion({
        configs: {
          enable_ads_tracking: 'true',
          google_ads_conversion_id: '18076962334',
          google_ads_signup_label: 'register-label',
        },
        email: 'ads-e2e@example.com',
      })
    ).toBe(false);

    expect(gtag).not.toHaveBeenCalled();
  });
});
