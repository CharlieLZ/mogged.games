import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { MetadataRoute } from 'next';

import { getIndexNowRuntimeKey } from '@/shared/lib/indexnow-key';
import { getAppUrl } from '@/shared/lib/brand';
import { getLocalizedAlternates, getLocalizedUrl } from '@/shared/lib/seo';

import { runRealtimeSiteAudit } from './realtime-audit';

describe('runRealtimeSiteAudit', () => {
  const originalFetch = global.fetch;
  const appUrl = getAppUrl();

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it('audits discovery endpoints and localized canonical pages', async () => {
    const sitemap: MetadataRoute.Sitemap = [
      {
        url: `${appUrl}/pricing`,
        alternates: {
          languages: getLocalizedAlternates('/pricing').languages,
        },
      },
      {
        url: `${appUrl}/zh/pricing`,
        alternates: {
          languages: getLocalizedAlternates('/pricing').languages,
        },
      },
    ];
    const hreflangLinks = Object.entries(
      getLocalizedAlternates('/pricing').languages
    )
      .map(
        ([locale, href]) =>
          `<link rel="alternate" hreflang="${locale}" href="${href}">`
      )
      .join('');
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url === `${appUrl}/robots.txt`) {
        return new Response(`User-agent: *\nSitemap: ${appUrl}/sitemap.xml\n`, {
          status: 200,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
        });
      }

      if (url === `${appUrl}/sitemap.xml`) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>${appUrl}/pricing</loc></url><url><loc>${appUrl}/zh/pricing</loc></url></urlset>`,
          {
            status: 200,
            headers: {
              'content-type': 'application/xml; charset=utf-8',
            },
          }
        );
      }

      if (url === `${appUrl}/BingSiteAuth.xml`) {
        return new Response('<users><user>ok</user></users>', {
          status: 200,
          headers: {
            'content-type': 'application/xml',
          },
        });
      }

      if (url.endsWith('.txt')) {
        return new Response(getIndexNowRuntimeKey(), {
          status: 200,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
        });
      }

      if (url === `${appUrl}/pricing`) {
        return new Response(
          `<!doctype html><html lang="en"><head><title>Pricing | mogged</title><meta name="description" content="Pricing details for mogged with credits and plans."><meta property="og:title" content="Pricing | mogged"><meta property="og:description" content="Pricing details for mogged with credits and plans."><meta property="og:image" content="${appUrl}/og.png"><meta property="og:url" content="${appUrl}/pricing"><link rel="canonical" href="${appUrl}/pricing">${hreflangLinks}</head><body>Pricing</body></html>`,
          {
            status: 200,
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
          }
        );
      }

      if (url === `${appUrl}/zh/pricing`) {
        return new Response(
          `<!doctype html><html lang="zh"><head><title>价格 | mogged</title><meta name="description" content="mogged 价格与积分说明，适合中文用户查看，同时覆盖多语言公开站监控。"><meta property="og:title" content="价格 | mogged"><meta property="og:description" content="mogged 价格与积分说明，适合中文用户查看，同时覆盖多语言公开站监控。"><meta property="og:image" content="${appUrl}/og.png"><meta property="og:url" content="${appUrl}/zh/pricing"><link rel="canonical" href="${appUrl}/zh/pricing">${hreflangLinks}</head><body>价格</body></html>`,
          {
            status: 200,
            headers: {
              'content-type': 'text/html; charset=utf-8',
              'x-robots-tag': 'all',
            },
          }
        );
      }

      return new Response('not found', { status: 404 });
    });

    const result = await runRealtimeSiteAudit({
      sitemap,
      siteUrl: appUrl,
    });

    expect(result.discovery).toHaveLength(4);
    expect(result.pages).toHaveLength(2);
    expect(result.counts.errorCount).toBe(0);
    expect(result.counts.warningCount).toBe(0);

    const englishPricing = result.pages.find(
      (page) => page.url === getLocalizedUrl('/pricing', 'en')
    );
    expect(englishPricing?.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'html-status',
          status: 'pass',
        }),
        expect.objectContaining({
          code: 'canonical',
          status: 'pass',
        }),
        expect.objectContaining({
          code: 'hreflang',
          status: 'pass',
        }),
      ])
    );
  });
});
