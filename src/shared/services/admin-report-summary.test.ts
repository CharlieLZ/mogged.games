import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  buildGoogleSiteReport: vi.fn(),
  getAdminReportDigestData: vi.fn(),
  getBingSiteReport: vi.fn(),
}));

vi.mock('@/shared/models/admin-report', async () => {
  const actual = await vi.importActual<typeof import('@/shared/models/admin-report')>(
    '@/shared/models/admin-report'
  );

  return {
    ...actual,
    getAdminReportDigestData: mocks.getAdminReportDigestData,
  };
});

vi.mock('./google-site-report', () => ({
  buildGoogleSiteReport: mocks.buildGoogleSiteReport,
}));

vi.mock('./site-monitoring/bing-site-report', async () => {
  const actual = await vi.importActual<
    typeof import('./site-monitoring/bing-site-report')
  >('./site-monitoring/bing-site-report');

  return {
    ...actual,
    getBingSiteReport: mocks.getBingSiteReport,
  };
});

import { getAdminReportEmailSummary } from './admin-report-summary';

describe('getAdminReportEmailSummary', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.buildGoogleSiteReport.mockReset();
    mocks.getAdminReportDigestData.mockReset();
    mocks.getBingSiteReport.mockReset();

    mocks.getAdminReportDigestData.mockResolvedValue({
      timezone: 'Asia/Shanghai',
      window: {
        frequency: 'daily',
        periodKey: '2026-05-05',
        label: '2026-05-05',
      },
      current: {
        signups: 12,
        firstSuccessfulUsers: 8,
        checkoutUsers: 5,
        paidUsers: 4,
        paidOrders: 6,
        grossRevenue: 128000,
        oneTimeRevenue: 68000,
        subscriptionRevenue: 60000,
        refundCount: 1,
        refundAmount: 2900,
        disputeCount: 1,
        netRevenue: 125100,
        creditsConsumed: 420,
        guestCreditsConsumed: 120,
        creditsGranted: 120,
        creditsRefunded: 36,
        tasksCreated: 31,
        taskSucceeded: 24,
        taskFailed: 5,
        taskCanceled: 2,
        successRate: 0.7742,
      },
      previous: {
        signups: 10,
        firstSuccessfulUsers: 6,
        checkoutUsers: 4,
        paidUsers: 3,
        paidOrders: 4,
        grossRevenue: 99000,
        oneTimeRevenue: 45000,
        subscriptionRevenue: 54000,
        refundCount: 0,
        refundAmount: 0,
        disputeCount: 0,
        netRevenue: 99000,
        creditsConsumed: 380,
        guestCreditsConsumed: 80,
        creditsGranted: 100,
        creditsRefunded: 12,
        tasksCreated: 28,
        taskSucceeded: 21,
        taskFailed: 4,
        taskCanceled: 3,
        successRate: 0.75,
      },
      taskBreakdown: [],
      failureReasons: [],
      recentRefunds: [],
    });

    mocks.buildGoogleSiteReport.mockResolvedValue({
      property: 'sc-domain:mogged.games',
      propertyUrl:
        'https://search.google.com/search-console?resource_id=sc-domain%3Amogged.games',
      searchPerformance: {
        status: 'ok',
        range: {
          label: '近 24 小时',
          startDate: '2026-05-05',
          endDate: '2026-05-05',
          dayCount: 1,
          googleTimeZone: 'America/Los_Angeles',
        },
        totals: null,
        topQueries: [],
        topPages: [],
        topCountries: [],
        topDevices: [],
      },
      urlInspection: {
        status: 'ok',
        inspectedAt: null,
        rows: [],
      },
      sitemap: {
        status: 'ok',
        property: 'sc-domain:mogged.games',
        sitemapUrl: 'https://mogged.games/sitemap.xml',
        lastSubmitted: null,
        isPending: false,
        warnings: 0,
        errors: 0,
        type: 'sitemap',
        contentsSubmitted: 0,
        contentsIndexed: 0,
      },
      coreWebVitals: {
        status: 'ok',
        source: 'psi',
        origin: 'https://mogged.games',
        fieldData: null,
        labSnapshots: [],
      },
      checkCards: [],
      notes: [],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('merges a Bing report into the current admin email summary shape', async () => {
    vi.stubEnv('ADMIN_REPORT_INCLUDE_BING_SITE_MONITORING', 'true');
    mocks.getBingSiteReport.mockResolvedValue({
      provider: 'bing',
      siteUrl: 'https://mogged.games',
      generatedAt: '2026-05-06T02:00:00.000Z',
      status: 'ok',
      summaryMessage: 'all checks passed',
      checkedUrlCount: 2,
      expectedSitemapUrlCount: 2,
      counts: {
        errorCount: 0,
        warningCount: 0,
        passCount: 18,
        skippedCount: 0,
      },
      discovery: [],
      pages: [],
      api: {
        status: 'ok',
        message: null,
        verifiedSite: true,
        userSitesCount: 1,
        roles: [],
        feeds: [],
        topQueries: [],
        topPages: [],
        crawlStats: [],
        urlSubmissionQuota: null,
        queryParameters: [],
        inspectedUrls: [],
      },
      experience: {
        status: 'partial',
        message: 'CrUX origin unavailable, using PSI mobile snapshot',
        targetUrl: 'https://mogged.games',
        cruxOrigin: 'https://mogged.games',
        cruxMetrics: [],
        psiMobileMetrics: [],
        psiDesktopMetrics: [],
        psiMobileScore: 0.91,
        psiDesktopScore: null,
      },
    });

    const summary = await getAdminReportEmailSummary({
      window: {
        frequency: 'daily',
        periodKey: '2026-05-05',
        label: '2026-05-05',
        timezone: 'Asia/Shanghai',
        startAt: new Date('2026-05-04T16:00:00.000Z'),
        endAt: new Date('2026-05-05T16:00:00.000Z'),
        previousPeriodKey: '2026-05-04',
        previousStartAt: new Date('2026-05-03T16:00:00.000Z'),
        previousEndAt: new Date('2026-05-04T16:00:00.000Z'),
      },
    });

    expect(summary.googleSiteReport.property).toBe('sc-domain:mogged.games');
    expect(summary.siteMonitoring?.bing?.status).toBe('ok');
    expect(summary.siteMonitoring?.bing?.checkedUrlCount).toBe(2);
  });

  it('degrades to a Bing error card instead of failing the whole summary', async () => {
    vi.stubEnv('ADMIN_REPORT_INCLUDE_BING_SITE_MONITORING', 'true');
    mocks.getBingSiteReport.mockRejectedValue(new Error('bing api offline'));

    const summary = await getAdminReportEmailSummary({
      window: {
        frequency: 'daily',
        periodKey: '2026-05-05',
        label: '2026-05-05',
        timezone: 'Asia/Shanghai',
        startAt: new Date('2026-05-04T16:00:00.000Z'),
        endAt: new Date('2026-05-05T16:00:00.000Z'),
        previousPeriodKey: '2026-05-04',
        previousStartAt: new Date('2026-05-03T16:00:00.000Z'),
        previousEndAt: new Date('2026-05-04T16:00:00.000Z'),
      },
    });

    expect(summary.googleSiteReport.property).toBe('sc-domain:mogged.games');
    expect(summary.siteMonitoring?.bing).toMatchObject({
      status: 'error',
      summaryMessage: 'bing api offline',
    });
  });
});
