import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('user acquisition helpers', () => {
  it('builds an acquisition snapshot from request context and referer query params', async () => {
    const acquisitionModule = await import('./user-acquisition');

    const snapshot =
      acquisitionModule.buildAcquisitionSnapshotFromRequestContext({
        requestContext: {
          deviceType: 'desktop',
          locale: 'zh',
          countryCode: 'US',
          regionCode: 'CA',
          path: '/sign-up',
          referer:
            'https://mogged.games/pricing?utm_source=google&utm_medium=cpc&utm_campaign=brand&utm_term=imageeditorai&gclid=test-gclid',
        },
      });

    expect(snapshot).toMatchObject({
      source: 'google',
      referrer:
        'https://mogged.games/pricing?utm_source=google&utm_medium=cpc&utm_campaign=brand&utm_term=imageeditorai&gclid=test-gclid',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'brand',
      utm_term: 'imageeditorai',
      gclid: 'test-gclid',
      landing_path: '/sign-up',
      landing_url: 'https://mogged.games/sign-up',
      locale: 'zh',
      countryCode: 'US',
      regionCode: 'CA',
      deviceType: 'desktop',
    });
  });

  it('builds custom 0414 utm fields from the request context referer', async () => {
    const acquisitionModule = await import('./user-acquisition');

    const snapshot =
      acquisitionModule.buildAcquisitionSnapshotFromRequestContext({
        requestContext: {
          deviceType: 'mobile',
          locale: 'en',
          countryCode: 'US',
          regionCode: 'CA',
          path: '/ai-video-generator/reference-to-video',
          referer:
            'https://mogged.games/ai-video-generator/reference-to-video?utm_source=google&utm_medium=search&utm_batch=0414&utm_objective=brand_clicks_imageeditorai&utm_campaign=hh0414-en-r2v-mob-phr&utm_adgroup=hh0414-en-r2v-mob-phr-brand&utm_match=phrase&utm_lang=en&utm_device=mobile&utm_workflow=reference-to-video',
        },
      });

    expect(snapshot).toMatchObject({
      utm_batch: '0414',
      utm_objective: 'brand_clicks_imageeditorai',
      utm_campaign: 'hh0414-en-r2v-mob-phr',
      utm_adgroup: 'hh0414-en-r2v-mob-phr-brand',
      utm_match: 'phrase',
      utm_lang: 'en',
      utm_device: 'mobile',
      utm_workflow: 'reference-to-video',
    });
  });

  it('captures gbraid and wbraid identifiers from the referer url', async () => {
    const acquisitionModule = await import('./user-acquisition');

    const snapshot =
      acquisitionModule.buildAcquisitionSnapshotFromRequestContext({
        requestContext: {
          deviceType: 'mobile',
          locale: 'en',
          countryCode: 'US',
          regionCode: 'CA',
          path: '/pricing',
          referer:
            'https://mogged.games/?utm_source=google&utm_medium=cpc&gbraid=test-gbraid&wbraid=test-wbraid',
        },
      });

    expect(snapshot).toMatchObject({
      gbraid: 'test-gbraid',
      wbraid: 'test-wbraid',
    });
  });

  it('merges cookie attribution into the request snapshot without dropping custom workflow fields', async () => {
    const acquisitionModule = await import('./user-acquisition');

    const snapshot =
      acquisitionModule.buildMergedAcquisitionSnapshotFromRequestContext({
        requestContext: {
          deviceType: 'desktop',
          locale: 'zh',
          countryCode: 'JP',
          regionCode: '13',
          path: '/zh/sign-up',
          referer:
            'https://mogged.games/zh/sign-up?utm_source=google&utm_medium=search',
        },
        cookieHeader:
          'hh_ads_attribution=%7B%22utm_campaign%22%3A%22hh0414-zh-r2v-pc-exa%22%2C%22utm_adgroup%22%3A%22hh0414-zh-r2v-pc-exa-brand%22%2C%22utm_workflow%22%3A%22reference-to-video%22%2C%22utm_device%22%3A%22pc%22%2C%22gclid%22%3A%22cookie-gclid%22%7D',
      });

    expect(snapshot).toMatchObject({
      utm_source: 'google',
      utm_medium: 'search',
      utm_campaign: 'hh0414-zh-r2v-pc-exa',
      utm_adgroup: 'hh0414-zh-r2v-pc-exa-brand',
      utm_workflow: 'reference-to-video',
      utm_device: 'pc',
      gclid: 'cookie-gclid',
      locale: 'zh',
      countryCode: 'JP',
    });
  });

  it('preserves the first-touch landing fields when a later checkout touch updates the user snapshot', async () => {
    const acquisitionModule = await import('./user-acquisition');

    const snapshot = acquisitionModule.resolveStoredAcquisitionSnapshot({
      existing: {
        source: 'mogged.games',
        referrer: 'https://mogged.games/pricing',
        utmSource: null,
        utmMedium: null,
        utmBatch: null,
        utmObjective: null,
        utmCampaign: null,
        utmAdgroup: null,
        utmContent: null,
        utmTerm: null,
        utmMatch: null,
        utmLang: null,
        utmDevice: null,
        utmWorkflow: null,
        gclid: null,
        gbraid: null,
        wbraid: null,
        fbclid: null,
        msclkid: null,
        landingPath: '/api/payment/checkout',
        landingUrl: 'https://mogged.games/api/payment/checkout',
        locale: 'en',
        countryCode: 'US',
        regionCode: 'CA',
        deviceType: 'desktop',
        deviceLabelZh: null,
        metadata: {
          firstTouchSnapshot: {
            source: 'google',
            referrer:
              'https://mogged.games/zh/ai-video-generator/reference-to-video?utm_source=google&utm_campaign=hh0414-zh-r2v-pc-exa&gclid=test-gclid',
            utm_source: 'google',
            utm_campaign: 'hh0414-zh-r2v-pc-exa',
            utm_workflow: 'reference-to-video',
            gclid: 'test-gclid',
            landing_path: '/zh/ai-video-generator/reference-to-video',
            landing_url:
              'https://mogged.games/zh/ai-video-generator/reference-to-video',
            locale: 'zh',
            countryCode: 'US',
            regionCode: 'CA',
            deviceType: 'desktop',
          },
        },
      } as any,
      snapshot: {
        source: 'mogged.games',
        referrer: 'https://mogged.games/pricing',
        landing_path: '/api/payment/checkout',
        landing_url: 'https://mogged.games/api/payment/checkout',
        locale: 'en',
        countryCode: 'US',
        regionCode: 'CA',
        deviceType: 'desktop',
      },
    });

    expect(snapshot).toMatchObject({
      source: 'google',
      utm_source: 'google',
      utm_campaign: 'hh0414-zh-r2v-pc-exa',
      utm_workflow: 'reference-to-video',
      gclid: 'test-gclid',
      landing_path: '/zh/ai-video-generator/reference-to-video',
      landing_url:
        'https://mogged.games/zh/ai-video-generator/reference-to-video',
      locale: 'zh',
      countryCode: 'US',
      regionCode: 'CA',
      deviceType: 'desktop',
    });
  });
});
