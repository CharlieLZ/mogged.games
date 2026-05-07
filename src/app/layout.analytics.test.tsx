import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/style/global.css', () => ({}));

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock('@/config/locale', () => ({
  getDocumentLocaleAttributes: () => ({
    locale: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/shared/lib/brand', () => ({
  getAppName: () => 'mogged',
  getAppUrl: () => 'https://mogged.games',
}));

vi.mock('@/shared/lib/site-icons', () => ({
  SITE_BROWSERCONFIG_PATH: '/browserconfig.xml',
  SITE_FAVICON_SVG_PATH: '/favicon.svg',
  SITE_MANIFEST_PATH: '/site.webmanifest',
  SITE_METADATA_ICONS: [],
  SITE_THEME_COLOR: '#1a365d',
}));

const createEmptyService = () => ({
  getMetaTags: () => null,
  getHeadScripts: () => null,
  getBodyScripts: () => null,
});

vi.mock('@/shared/services/ads', () => ({
  getAdsService: async () => createEmptyService(),
}));

const createAnalyticsService = () => ({
  getMetaTags: () => null,
  getHeadScripts: () =>
    createElement('script', {
      id: 'analytics-head',
      dangerouslySetInnerHTML: {
        __html: 'window.__analytics_head = true;',
      },
    }),
  getBodyScripts: () =>
    createElement('script', {
      id: 'analytics-body',
      dangerouslySetInnerHTML: {
        __html: 'window.__analytics_body = true;',
      },
    }),
});

vi.mock('@/shared/services/analytics', () => ({
  getAnalyticsService: async () => createAnalyticsService(),
}));

vi.mock('@/shared/services/affiliate', () => ({
  getAffiliateService: async () => createEmptyService(),
}));

vi.mock('@/shared/services/customer_service', () => ({
  getCustomerService: async () => createEmptyService(),
}));

import RootLayout from './layout';

describe('RootLayout analytics scripts', () => {
  it('renders analytics head scripts inside head and body scripts inside body', async () => {
    const env = process.env as Record<string, string | undefined>;
    const originalNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';

    const element = await RootLayout({
      children: createElement('main', null, 'hello'),
      params: Promise.resolve({ locale: 'en' }),
    });

    const markup = renderToStaticMarkup(element);
    const headOpenIndex = markup.indexOf('<head>');
    const headScriptIndex = markup.indexOf('id="analytics-head"');
    const headCloseIndex = markup.indexOf('</head>');
    const bodyOpenIndex = markup.indexOf('<body');
    const bodyScriptIndex = markup.indexOf('id="analytics-body"');

    expect(headOpenIndex).toBeGreaterThanOrEqual(0);
    expect(headScriptIndex).toBeGreaterThan(headOpenIndex);
    expect(headScriptIndex).toBeLessThan(headCloseIndex);
    expect(bodyScriptIndex).toBeGreaterThan(bodyOpenIndex);
    expect(markup).not.toContain('self.__next_s');

    env.NODE_ENV = originalNodeEnv;
  });
});
