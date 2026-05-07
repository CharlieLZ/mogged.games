import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCoreWebVitalsReport: vi.fn(),
  getSearchAnalyticsReport: vi.fn(),
  getSitemapReport: vi.fn(),
  getUrlInspectionReport: vi.fn(),
}));

vi.mock('@/extensions/google-search-console', () => ({
  getSearchAnalyticsReport: mocks.getSearchAnalyticsReport,
  getSitemapReport: mocks.getSitemapReport,
  getUrlInspectionReport: mocks.getUrlInspectionReport,
}));

vi.mock('@/extensions/google-web-performance', () => ({
  getCoreWebVitalsReport: mocks.getCoreWebVitalsReport,
}));

import { buildGoogleSiteReport } from './google-site-report';

describe('google site report service', () => {
  beforeEach(() => {
    mocks.getCoreWebVitalsReport.mockReset();
    mocks.getSearchAnalyticsReport.mockReset();
    mocks.getSitemapReport.mockReset();
    mocks.getUrlInspectionReport.mockReset();

    mocks.getSearchAnalyticsReport.mockResolvedValue({
      property: 'sc-domain:mogged.games',
      range: {
        label: '近 24 小时',
        startDate: '2026-05-05',
        endDate: '2026-05-05',
        dayCount: 1,
        googleTimeZone: 'America/Los_Angeles',
      },
      totals: {
        clicks: 120,
        impressions: 3400,
        ctr: 0.0353,
        position: 11.2,
      },
      topQueries: [
        {
          key: 'image editor ai',
          clicks: 30,
          impressions: 200,
          ctr: 0.15,
          position: 2.4,
        },
      ],
      topPages: [
        {
          key: 'https://mogged.games/ai-image-generator',
          clicks: 55,
          impressions: 900,
          ctr: 0.0611,
          position: 4.2,
        },
      ],
      topCountries: [
        {
          key: 'USA',
          clicks: 80,
          impressions: 2000,
          ctr: 0.04,
          position: 10.2,
        },
      ],
      topDevices: [
        {
          key: 'MOBILE',
          clicks: 70,
          impressions: 2400,
          ctr: 0.0291,
          position: 12.1,
        },
      ],
    });

    mocks.getUrlInspectionReport.mockResolvedValue({
      property: 'sc-domain:mogged.games',
      inspectedAt: '2026-05-06T10:00:00.000Z',
      rows: [
        {
          url: 'https://mogged.games/',
          path: '/',
          verdict: 'PASS',
          coverageState: 'Submitted and indexed',
          indexingState: 'INDEXING_ALLOWED',
          robotsTxtState: 'ALLOWED',
          pageFetchState: 'SUCCESSFUL',
          userCanonical: 'https://mogged.games/',
          googleCanonical: 'https://mogged.games/',
          lastCrawlTime: '2026-05-05T01:00:00.000Z',
          sitemap: ['https://mogged.games/sitemap.xml'],
        },
      ],
    });

    mocks.getSitemapReport.mockResolvedValue({
      property: 'sc-domain:mogged.games',
      sitemapUrl: 'https://mogged.games/sitemap.xml',
      lastSubmitted: '2026-05-05T00:00:00.000Z',
      isPending: false,
      warnings: 0,
      errors: 0,
      type: 'sitemap',
      contentsSubmitted: 63,
      contentsIndexed: 61,
    });

    mocks.getCoreWebVitalsReport.mockResolvedValue({
      source: 'psi',
      origin: 'https://mogged.games',
      fieldData: {
        scope: 'origin',
        collectionPeriod: 'recent_28d',
        overallCategory: 'GOOD',
        largestContentfulPaintMs: 2100,
        interactionToNextPaintMs: 180,
        cumulativeLayoutShift: 0.04,
      },
      labSnapshots: [
        {
          url: 'https://mogged.games/',
          strategy: 'mobile',
          performanceScore: 0.91,
          largestContentfulPaintMs: 2200,
          totalBlockingTimeMs: 30,
          cumulativeLayoutShift: 0.05,
        },
      ],
    });
  });

  it('builds a Chinese google report summary for the requested frequency', async () => {
    const report = await buildGoogleSiteReport({
      frequency: 'daily',
      now: new Date('2026-05-06T10:00:00.000Z'),
    });

    expect(report.searchPerformance.status).toBe('ok');
    expect(report.searchPerformance.range.label).toBe('近 24 小时');
    expect(report.urlInspection.status).toBe('ok');
    expect(report.sitemap.status).toBe('ok');
    expect(report.coreWebVitals.status).toBe('ok');
    expect(report.checkCards).toHaveLength(3);
    expect(report.checkCards.map((card) => card.title)).toEqual([
      'Page indexing',
      'Manual actions',
      'Security issues',
    ]);
  });

  it('degrades only the failed section instead of aborting the whole report', async () => {
    mocks.getCoreWebVitalsReport.mockRejectedValue(
      new Error('CrUX API unavailable')
    );

    const report = await buildGoogleSiteReport({
      frequency: 'weekly',
      now: new Date('2026-05-06T10:00:00.000Z'),
    });

    expect(report.searchPerformance.status).toBe('ok');
    expect(report.coreWebVitals.status).toBe('degraded');
    expect(report.coreWebVitals.errorMessage).toContain('CrUX API unavailable');
    expect(report.searchPerformance.range.label).toBe('近 7 天');
  });
});
