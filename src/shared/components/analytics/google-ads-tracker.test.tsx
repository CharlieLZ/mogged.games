// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serializeAdsAttributionCookie } from '@/shared/lib/ads-attribution';

const testState = vi.hoisted(() => ({
  appContext: {
    user: {
      id: 'user_123',
      createdAt: new Date().toISOString(),
    },
    configs: {},
  },
  search: '',
  googleAds: {
    resolveGoogleAdsConfigs: vi.fn(),
    trackGoogleAdsConversion: vi.fn(),
    trackGoogleAdsSignupConversion: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    toString: () => testState.search,
  }),
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => testState.appContext,
}));

vi.mock('@/shared/lib/google-ads', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/google-ads')>();

  return {
    ...actual,
    resolveGoogleAdsConfigs: testState.googleAds.resolveGoogleAdsConfigs,
    trackGoogleAdsConversion: testState.googleAds.trackGoogleAdsConversion,
    trackGoogleAdsSignupConversion:
      testState.googleAds.trackGoogleAdsSignupConversion,
  };
});

import { GoogleAdsTracker } from './google-ads-tracker';

describe('GoogleAdsTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    document.cookie =
      'hh_ads_attribution=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.history.replaceState(null, '', '/pricing');
    testState.search = '';
    testState.appContext.user = {
      id: 'user_123',
      createdAt: new Date().toISOString(),
    };
    testState.googleAds.resolveGoogleAdsConfigs.mockReturnValue({
      enabled: true,
      purchaseTrackingMode: 'browser',
      conversionId: 'AW-1234567890',
      signupLabel: 'signupLabel',
      beginCheckoutLabel: '',
      purchaseLabel: 'purchaseLabel',
    });
    testState.googleAds.trackGoogleAdsConversion.mockReturnValue(true);
    testState.googleAds.trackGoogleAdsSignupConversion.mockReturnValue(true);
  });

  it('does not send signup conversions when ads tracking is disabled', async () => {
    testState.googleAds.resolveGoogleAdsConfigs.mockReturnValue({
      enabled: false,
      purchaseTrackingMode: 'browser',
      conversionId: 'AW-1234567890',
      signupLabel: 'signupLabel',
      beginCheckoutLabel: '',
      purchaseLabel: 'purchaseLabel',
    });

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(GoogleAdsTracker));
    });

    expect(
      testState.googleAds.trackGoogleAdsSignupConversion
    ).not.toHaveBeenCalled();
  });

  it('delegates fresh signup checks to the signup conversion helper', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(GoogleAdsTracker));
    });

    expect(
      testState.googleAds.trackGoogleAdsSignupConversion
    ).toHaveBeenCalledWith({
      configs: testState.appContext.configs,
      userId: 'user_123',
      email: undefined,
    });
  });

  it('still delegates signup tracking when ads attribution is present', async () => {
    document.cookie = `hh_ads_attribution=${serializeAdsAttributionCookie({
      utm_source: 'google',
      utm_campaign: 'hh0414-zh-r2v-pc-exa',
      gclid: 'gclid_cookie',
      landing_path: '/zh/ai-video-generator/reference-to-video',
    })}`;

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(GoogleAdsTracker));
    });

    expect(
      testState.googleAds.trackGoogleAdsSignupConversion
    ).toHaveBeenCalledWith({
      configs: testState.appContext.configs,
      userId: 'user_123',
      email: undefined,
    });
  });

  it('does not send browser purchase conversions in server tracking mode', async () => {
    testState.search =
      'google_ads_purchase=1&order_no=ord_123&google_ads_value=29&google_ads_currency=USD';
    testState.googleAds.resolveGoogleAdsConfigs.mockReturnValue({
      enabled: true,
      purchaseTrackingMode: 'server',
      conversionId: 'AW-1234567890',
      signupLabel: '',
      beginCheckoutLabel: '',
      purchaseLabel: 'purchaseLabel',
    });

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(GoogleAdsTracker));
    });

    expect(testState.googleAds.trackGoogleAdsConversion).not.toHaveBeenCalled();
  });
});
