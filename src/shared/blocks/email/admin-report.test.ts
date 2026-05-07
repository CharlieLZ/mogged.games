import { describe, expect, it } from 'vitest';

import { buildAdminReportEmail } from './admin-report';

describe('admin report email', () => {
  it('renders a Chinese-first digest with admin metrics and Google monitoring blocks', () => {
    const email = buildAdminReportEmail({
      to: ['ops@example.com'],
      summary: {
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
        taskBreakdown: [
          {
            scene: 'text-to-image',
            mediaType: 'image',
            created: 18,
            succeeded: 15,
            failed: 2,
            canceled: 1,
          },
        ],
        failureReasons: [
          {
            reason: 'provider timeout',
            count: 3,
            provider: 'kie',
            mediaType: 'image',
            scene: 'text-to-image',
          },
        ],
        recentRefunds: [
          {
            provider: 'stripe',
            orderNo: 'order_123',
            amount: 2900,
            currency: 'usd',
            createdAt: new Date('2026-05-05T08:45:00.000Z'),
          },
        ],
        googleSiteReport: {
          property: 'sc-domain:mogged.games',
          propertyUrl: 'https://search.google.com/search-console?resource_id=sc-domain%3Amogged.games',
          searchPerformance: {
            status: 'ok',
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
          },
          urlInspection: {
            status: 'ok',
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
          },
          sitemap: {
            status: 'ok',
            property: 'sc-domain:mogged.games',
            sitemapUrl: 'https://mogged.games/sitemap.xml',
            lastSubmitted: '2026-05-05T00:00:00.000Z',
            isPending: false,
            warnings: 0,
            errors: 0,
            type: 'sitemap',
            contentsSubmitted: 63,
            contentsIndexed: 61,
          },
          coreWebVitals: {
            status: 'ok',
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
          },
          checkCards: [
            {
              title: 'Page indexing',
              href: 'https://search.google.com/search-console/index?resource_id=sc-domain%3Amogged.games',
              description: '确认核心 canonical 页面没有被错误排除。',
            },
            {
              title: 'Manual actions',
              href: 'https://search.google.com/search-console/manual-actions?resource_id=sc-domain%3Amogged.games',
              description: '确认站点没有人工处罚。',
            },
            {
              title: 'Security issues',
              href: 'https://search.google.com/search-console/security-issues?resource_id=sc-domain%3Amogged.games',
              description: '确认站点没有安全风险告警。',
            },
          ],
          notes: ['Google 搜索数据按 PT 自然日统计。'],
        },
        siteMonitoring: {
          bing: {
            provider: 'bing',
            siteUrl: 'https://mogged.games',
            generatedAt: '2026-05-06T02:00:00.000Z',
            status: 'partial',
            summaryMessage: '2 warnings, 0 errors',
            checkedUrlCount: 2,
            expectedSitemapUrlCount: 2,
            counts: {
              errorCount: 0,
              warningCount: 2,
              passCount: 16,
              skippedCount: 0,
            },
            discovery: [
              {
                kind: 'endpoint',
                name: 'robots.txt',
                label: 'Robots.txt',
                url: 'https://mogged.games/robots.txt',
                statusCode: 200,
                contentType: 'text/plain; charset=utf-8',
                counts: {
                  errorCount: 0,
                  warningCount: 0,
                  passCount: 2,
                  skippedCount: 0,
                },
                checks: [
                  {
                    code: 'status',
                    label: 'HTTP 200',
                    status: 'pass',
                    value: '200',
                    details: 'robots.txt reachable',
                  },
                ],
              },
            ],
            pages: [
              {
                kind: 'page',
                url: 'https://mogged.games/pricing',
                path: '/pricing',
                locale: 'en',
                statusCode: 200,
                contentType: 'text/html; charset=utf-8',
                canonicalUrl: 'https://mogged.games/pricing',
                htmlLang: 'en',
                counts: {
                  errorCount: 0,
                  warningCount: 1,
                  passCount: 7,
                  skippedCount: 0,
                },
                bingInspection: {
                  url: 'https://mogged.games/pricing',
                  httpStatus: 200,
                  isPage: true,
                  anchorCount: 12,
                  documentSize: 8192,
                  totalChildUrlCount: 0,
                  discoveryDate: '2026-05-01T00:00:00.000Z',
                  lastCrawledDate: '2026-05-05T00:00:00.000Z',
                },
                checks: [
                  {
                    code: 'canonical',
                    label: 'Canonical',
                    status: 'pass',
                    value: 'https://mogged.games/pricing',
                    details: 'canonical matches',
                  },
                  {
                    code: 'description-length',
                    label: 'Description length',
                    status: 'warning',
                    value: '48',
                    details: 'description is a bit short',
                  },
                ],
              },
            ],
            api: {
              status: 'ok',
              message: null,
              verifiedSite: true,
              userSitesCount: 1,
              roles: [],
              feeds: [],
              topQueries: [
                {
                  label: 'image editor ai',
                  clicks: 21,
                  impressions: 300,
                  avgClickPosition: 1,
                  avgImpressionPosition: 2,
                  date: '2026-05-05T00:00:00.000Z',
                },
              ],
              topPages: [
                {
                  label: 'https://mogged.games/pricing',
                  clicks: 8,
                  impressions: 112,
                  avgClickPosition: 2,
                  avgImpressionPosition: 3,
                  date: '2026-05-05T00:00:00.000Z',
                  url: 'https://mogged.games/pricing',
                },
              ],
              crawlStats: [],
              urlSubmissionQuota: {
                dailyQuota: 25,
                monthlyQuota: 500,
              },
              queryParameters: [],
              inspectedUrls: [],
            },
            experience: {
              status: 'partial',
              message: 'CrUX origin ok, PSI homepage sampled',
              targetUrl: 'https://mogged.games',
              cruxOrigin: 'https://mogged.games',
              cruxMetrics: [
                {
                  name: 'LCP',
                  source: 'crux',
                  rating: 'good',
                  value: 2100,
                  displayValue: '2.1 s',
                },
              ],
              psiMobileMetrics: [
                {
                  name: 'LCP',
                  source: 'psi',
                  rating: 'needs-improvement',
                  value: 2800,
                  displayValue: '2.8 s',
                },
              ],
              psiDesktopMetrics: [],
              psiMobileScore: 0.86,
              psiDesktopScore: 0.97,
            },
          },
        },
      },
    });

    expect(email.subject).toContain('管理员汇总');
    expect(email.subject).toContain('日报');
    expect(email.subject).toContain('2026-05-05');
    expect(email.text).toContain('管理员汇总');
    expect(email.text).not.toContain('Admin Summary');
    expect(email.text).toContain('注册: 12');
    expect(email.text).toContain('退款: 1');
    expect(email.text).toContain('访客成本: 120');
    expect(email.text).toContain('失败任务: 5');
    expect(email.text).toContain('Google 搜索表现');
    expect(email.text).toContain('URL 检查');
    expect(email.text).toContain('Sitemap 状态');
    expect(email.text).toContain('Core Web Vitals');
    expect(email.text).toContain('Bing 站点体检 / Bing Site Monitoring');
    expect(email.text).toContain('Core Web Vitals / 核心网页指标');
    expect(email.text).toContain('image editor ai');
    expect(email.html).toContain('管理员汇总');
    expect(email.html).not.toContain('Admin Summary');
    expect(email.html).toContain('失败原因');
    expect(email.html).toContain('最近退款');
    expect(email.html).toContain('访客成本');
    expect(email.html).toContain('Google 搜索表现');
    expect(email.html).toContain('Page indexing');
    expect(email.html).toContain('Security issues');
    expect(email.html).toContain('Bing 站点体检 / Bing Site Monitoring');
    expect(email.html).toContain('Discovery Endpoints / 发现入口');
    expect(email.html).toContain('Core Web Vitals / 核心网页指标');
    expect(email.headers).toMatchObject({
      'X-ImageEditorAi-Email': 'admin-report',
      'X-ImageEditorAi-Report-Frequency': 'daily',
      'X-ImageEditorAi-Report-Period-Key': '2026-05-05',
    });
    expect(email.tags).toEqual(['admin-report', 'daily-report']);
  });
});
