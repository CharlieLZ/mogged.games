import { describe, expect, it } from 'vitest';

import {
  ADS_ATTRIBUTION_COOKIE_NAME,
  mergeAdsAttributionSnapshots,
  parseAdsAttributionCookie,
  serializeAdsAttributionCookie,
} from './ads-attribution';

describe('ads attribution helpers', () => {
  it('serializes and parses first-party attribution cookies', () => {
    const raw = serializeAdsAttributionCookie({
      gclid: 'gclid_123',
      landing_path: '/pricing',
      utm_source: 'google',
      utm_workflow: 'reference-to-video',
      utm_device: 'mobile',
    });

    expect(raw).toContain('gclid_123');
    expect(parseAdsAttributionCookie(raw)).toMatchObject({
      gclid: 'gclid_123',
      landing_path: '/pricing',
      utm_source: 'google',
      utm_workflow: 'reference-to-video',
      utm_device: 'mobile',
    });
  });

  it('merges cookie attribution with request-time context without dropping click ids', () => {
    expect(
      mergeAdsAttributionSnapshots({
        cookieSnapshot: {
          gclid: 'gclid_cookie',
          utm_source: 'google',
          utm_workflow: 'reference-to-video',
          landing_path: '/landing',
        },
        requestSnapshot: {
          source: 'google',
          locale: 'en',
          countryCode: 'US',
          utm_workflow: 'image-to-video',
        },
      })
    ).toMatchObject({
      gclid: 'gclid_cookie',
      utm_source: 'google',
      utm_workflow: 'reference-to-video',
      landing_path: '/landing',
      locale: 'en',
      countryCode: 'US',
    });
  });

  it('keeps the cookie name stable for browser and server usage', () => {
    expect(ADS_ATTRIBUTION_COOKIE_NAME).toBe('hh_ads_attribution');
  });
});
