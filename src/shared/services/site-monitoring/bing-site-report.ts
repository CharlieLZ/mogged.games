import 'server-only';

import type { MetadataRoute } from 'next';

import type { CoreWebVitalsReport } from '@/extensions/google-web-performance';
import { getCoreWebVitalsReport } from '@/extensions/google-web-performance';
import { getAppUrl } from '@/shared/lib/brand';
import { getSiteSitemap } from '@/shared/lib/site-discovery';
import type {
  BingSiteMonitoringStatus,
  BingSiteReport,
  BingSiteReportApi,
  BingSiteReportExperience,
  SiteMonitoringCounts,
  SiteMonitoringMetric,
  SiteMonitoringMetricRating,
} from '@/shared/models/admin-report';

import { BingWebmasterClient } from './bing-webmaster-client';
import {
  buildEmptySiteMonitoringCounts,
  mergeSiteMonitoringCounts,
  runRealtimeSiteAudit,
} from './realtime-audit';

function trimValue(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSiteUrl(value = getAppUrl()) {
  return value.replace(/\/+$/, '');
}

function buildDefaultApiSection(
  status: BingSiteMonitoringStatus,
  message: string | null
): BingSiteReportApi {
  return {
    status,
    message,
    verifiedSite: false,
    userSitesCount: 0,
    roles: [],
    feeds: [],
    topQueries: [],
    topPages: [],
    crawlStats: [],
    urlSubmissionQuota: null,
    queryParameters: [],
    inspectedUrls: [],
  };
}

function toMetricRow(entry: Record<string, unknown>) {
  return {
    label: trimValue(String(entry.Query || entry.Url || 'unknown')) || 'unknown',
    clicks: toNumber(entry.Clicks),
    impressions: toNumber(entry.Impressions),
    avgClickPosition: toNumber(entry.AvgClickPosition),
    avgImpressionPosition: toNumber(entry.AvgImpressionPosition),
    date: trimValue(String(entry.Date || '')) || '',
    ...(trimValue(String(entry.Url || ''))
      ? { url: trimValue(String(entry.Url || '')) }
      : {}),
  };
}

function buildDefaultExperienceSection(
  siteUrl: string,
  status: BingSiteMonitoringStatus,
  message: string | null
): BingSiteReportExperience {
  return {
    status,
    message,
    targetUrl: siteUrl,
    cruxOrigin: siteUrl,
    cruxMetrics: [],
    psiMobileMetrics: [],
    psiDesktopMetrics: [],
    psiMobileScore: null,
    psiDesktopScore: null,
  };
}

function logBingMonitoringFallback(
  scope: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  console.warn('[bing-site-monitoring] fallback activated', {
    scope,
    error: error instanceof Error ? error.message : String(error),
    ...(context || {}),
  });
}

function buildSummaryMessage(counts: SiteMonitoringCounts) {
  if (counts.errorCount === 0 && counts.warningCount === 0) {
    return 'all checks passed';
  }

  return `${counts.warningCount} warnings, ${counts.errorCount} errors`;
}

function getMetricRating(name: string, value: number | null): SiteMonitoringMetricRating {
  if (value === null) {
    return 'unknown';
  }

  if (name === 'LCP') {
    return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
  }

  if (name === 'INP') {
    return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
  }

  if (name === 'CLS') {
    return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
  }

  return 'unknown';
}

function formatMetricValue(name: string, value: number | null) {
  if (value === null) {
    return 'n/a';
  }

  if (name === 'CLS') {
    return value.toFixed(2);
  }

  if (name === 'Score') {
    return `${Math.round(value * 100)} / 100`;
  }

  return `${Math.round(value)} ms`;
}

function buildMetric(
  name: string,
  value: number | null,
  source: 'crux' | 'psi'
): SiteMonitoringMetric {
  return {
    name,
    source,
    rating: getMetricRating(name, value),
    value,
    displayValue: formatMetricValue(name, value),
  };
}

function toExperienceSection(
  siteUrl: string,
  report: CoreWebVitalsReport
): BingSiteReportExperience {
  const mobileSnapshot = report.labSnapshots.find(
    (entry) => entry.strategy === 'mobile'
  );
  const desktopSnapshot = report.labSnapshots.find(
    (entry) => entry.strategy === 'desktop'
  );
  const cruxMetrics =
    report.source === 'crux' && report.fieldData
      ? [
          buildMetric(
            'LCP',
            report.fieldData.largestContentfulPaintMs,
            'crux'
          ),
          buildMetric(
            'INP',
            report.fieldData.interactionToNextPaintMs,
            'crux'
          ),
          buildMetric(
            'CLS',
            report.fieldData.cumulativeLayoutShift,
            'crux'
          ),
        ]
      : [];
  const psiMobileMetrics = mobileSnapshot
    ? [
        buildMetric(
          'LCP',
          mobileSnapshot.largestContentfulPaintMs,
          'psi'
        ),
        buildMetric(
          'CLS',
          mobileSnapshot.cumulativeLayoutShift,
          'psi'
        ),
      ]
    : [];
  const psiDesktopMetrics = desktopSnapshot
    ? [
        buildMetric(
          'LCP',
          desktopSnapshot.largestContentfulPaintMs,
          'psi'
        ),
        buildMetric(
          'CLS',
          desktopSnapshot.cumulativeLayoutShift,
          'psi'
        ),
      ]
    : [];
  const hasSignal =
    cruxMetrics.length > 0 || psiMobileMetrics.length > 0 || psiDesktopMetrics.length > 0;
  const status: BingSiteMonitoringStatus =
    cruxMetrics.length > 0 && psiMobileMetrics.length > 0
      ? 'ok'
      : hasSignal
        ? 'partial'
        : 'error';

  return {
    status,
    message:
      status === 'partial' && report.source !== 'crux'
        ? 'CrUX origin unavailable, using PSI mobile snapshot'
        : null,
    targetUrl: siteUrl,
    cruxOrigin: report.origin,
    cruxMetrics,
    psiMobileMetrics,
    psiDesktopMetrics,
    psiMobileScore: toNumber(mobileSnapshot?.performanceScore) || null,
    psiDesktopScore: toNumber(desktopSnapshot?.performanceScore) || null,
  };
}

function buildSitemapForBingAudit(): MetadataRoute.Sitemap {
  return getSiteSitemap();
}

async function buildBingApiSection(siteUrl: string, client: BingWebmasterClient) {
  const apiKey = trimValue(process.env.BING_WEBMASTER_API_KEY);

  if (!apiKey) {
    return buildDefaultApiSection(
      'config_error',
      'BING_WEBMASTER_API_KEY is missing'
    );
  }

  const [userSites, roles, topQueries, topPages, feeds, queryParameters] =
    await Promise.all([
      client.getUserSites(),
      client.getSiteRoles(siteUrl).catch((error) => {
        logBingMonitoringFallback('GetSiteRoles', error, {
          siteUrl,
        });
        return [];
      }),
      client.getQueryStats(siteUrl).catch((error) => {
        logBingMonitoringFallback('GetQueryStats', error, {
          siteUrl,
        });
        return [];
      }),
      client.getPageStats(siteUrl).catch((error) => {
        logBingMonitoringFallback('GetPageStats', error, {
          siteUrl,
        });
        return [];
      }),
      client.getFeeds(siteUrl).catch((error) => {
        logBingMonitoringFallback('GetFeeds', error, {
          siteUrl,
        });
        return [];
      }),
      client.getQueryParameters(siteUrl).catch((error) => {
        logBingMonitoringFallback('GetQueryParameters', error, {
          siteUrl,
        });
        return [];
      }),
    ]);
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const verifiedSite = userSites.some(
    (entry) => normalizeSiteUrl(entry) === normalizedSiteUrl
  );
  const quota = verifiedSite
    ? await client.getUrlSubmissionQuota(siteUrl)
    : null;

  return {
    status: verifiedSite ? 'ok' : 'partial',
    message: verifiedSite
      ? null
      : 'Site not found in Bing Webmaster Tools user sites',
    verifiedSite,
    userSitesCount: userSites.length,
    roles: roles
      .map((entry) =>
        trimValue(`${entry.Role || ''}${entry.Email ? `: ${entry.Email}` : ''}`)
      )
      .filter(Boolean),
    feeds: feeds
      .map((entry) => trimValue(String(entry.Url || entry.Path || '')))
      .filter(Boolean),
    topQueries: topQueries.slice(0, 10).map(toMetricRow),
    topPages: topPages.slice(0, 10).map(toMetricRow),
    crawlStats: [],
    urlSubmissionQuota: quota
      ? {
          dailyQuota: quota.DailyQuota,
          monthlyQuota: quota.MonthlyQuota,
        }
      : null,
    queryParameters: queryParameters
      .map((entry) => trimValue(String(entry.Name || entry.Parameter || '')))
      .filter(Boolean),
    inspectedUrls: [],
  } satisfies BingSiteReportApi;
}

async function buildExperienceSection(siteUrl: string) {
  const report = await getCoreWebVitalsReport({
    origin: siteUrl,
    representativeUrls: [siteUrl],
  });

  return toExperienceSection(siteUrl, report);
}

function deriveOverallStatus(params: {
  counts: SiteMonitoringCounts;
  api: BingSiteReportApi;
  experience: BingSiteReportExperience;
}) {
  if (
    params.counts.errorCount === 0 &&
    params.counts.warningCount === 0 &&
    params.api.status === 'ok' &&
    params.experience.status === 'ok'
  ) {
    return 'ok' satisfies BingSiteMonitoringStatus;
  }

  if (
    params.api.status === 'error' &&
    params.experience.status === 'error' &&
    params.counts.errorCount > 0
  ) {
    return 'error' satisfies BingSiteMonitoringStatus;
  }

  return 'partial' satisfies BingSiteMonitoringStatus;
}

export function buildBingSiteReportError(params: {
  message: string;
  siteUrl?: string;
  now?: Date;
}): BingSiteReport {
  const siteUrl = normalizeSiteUrl(params.siteUrl);

  return {
    provider: 'bing',
    siteUrl,
    generatedAt: (params.now || new Date()).toISOString(),
    status: 'error',
    summaryMessage: params.message,
    checkedUrlCount: 0,
    expectedSitemapUrlCount: 0,
    counts: buildEmptySiteMonitoringCounts(),
    discovery: [],
    pages: [],
    api: buildDefaultApiSection('error', params.message),
    experience: buildDefaultExperienceSection(siteUrl, 'error', params.message),
  };
}

export async function getBingSiteReport(params?: { now?: Date }) {
  const siteUrl = normalizeSiteUrl();
  const apiKey = trimValue(process.env.BING_WEBMASTER_API_KEY);
  const audit = await runRealtimeSiteAudit({
    siteUrl,
    sitemap: buildSitemapForBingAudit(),
  });
  const client = new BingWebmasterClient({
    apiKey,
  });
  const [apiResult, experienceResult] = await Promise.allSettled([
    buildBingApiSection(siteUrl, client),
    buildExperienceSection(siteUrl),
  ]);
  const api =
    apiResult.status === 'fulfilled'
      ? apiResult.value
      : (() => {
          logBingMonitoringFallback('buildBingApiSection', apiResult.reason, {
            siteUrl,
          });

          return buildDefaultApiSection(
            'error',
            apiResult.reason instanceof Error
              ? apiResult.reason.message
              : String(apiResult.reason)
          );
        })();
  const experience =
    experienceResult.status === 'fulfilled'
      ? experienceResult.value
      : (() => {
          logBingMonitoringFallback(
            'buildExperienceSection',
            experienceResult.reason,
            {
              siteUrl,
            }
          );

          return buildDefaultExperienceSection(
            siteUrl,
            'error',
            experienceResult.reason instanceof Error
              ? experienceResult.reason.message
              : String(experienceResult.reason)
          );
        })();
  const pages =
    api.status === 'config_error'
      ? audit.pages
      : await Promise.all(
          audit.pages.map(async (page) => {
            try {
              const inspection = await client.getUrlInfo(siteUrl, page.url);
              return {
                ...page,
                bingInspection: {
                  url: page.url,
                  httpStatus: toNumber(inspection.HttpStatus),
                  isPage: Boolean(inspection.IsPage),
                  anchorCount: toNumber(inspection.AnchorCount),
                  documentSize: toNumber(inspection.DocumentSize),
                  totalChildUrlCount: toNumber(inspection.TotalChildUrlCount),
                  discoveryDate:
                    trimValue(String(inspection.DiscoveryDate || '')) || null,
                  lastCrawledDate:
                    trimValue(String(inspection.LastCrawledDate || '')) || null,
                },
                checks: [
                  ...page.checks,
                  {
                    code: 'bing-http-status',
                    label: 'Bing HTTP status',
                    status:
                      toNumber(inspection.HttpStatus) === 200
                        ? ('pass' as const)
                        : ('warning' as const),
                    value: `${toNumber(inspection.HttpStatus) || 'unknown'}`,
                    details: 'Bing should last see a healthy 200 response',
                  },
                  {
                    code: 'bing-last-crawled',
                    label: 'Bing last crawled',
                    status: trimValue(String(inspection.LastCrawledDate || ''))
                      ? ('pass' as const)
                      : ('warning' as const),
                    value:
                      trimValue(String(inspection.LastCrawledDate || '')) ||
                      null,
                    details: 'Bing should have a recent crawl timestamp',
                  },
                ],
                counts: mergeSiteMonitoringCounts([
                  page.counts,
                  {
                    errorCount: 0,
                    warningCount:
                      toNumber(inspection.HttpStatus) === 200 &&
                      trimValue(String(inspection.LastCrawledDate || ''))
                        ? 0
                        : 1,
                    passCount:
                      toNumber(inspection.HttpStatus) === 200 &&
                      trimValue(String(inspection.LastCrawledDate || ''))
                        ? 2
                        : 1,
                    skippedCount: 0,
                  },
                  ]),
              };
            } catch (error) {
              logBingMonitoringFallback('GetUrlInfo', error, {
                siteUrl,
                url: page.url,
              });
              return page;
            }
          })
        );
  const counts = mergeSiteMonitoringCounts([
    ...audit.discovery.map((entry) => entry.counts),
    ...pages.map((page) => page.counts),
  ]);
  const inspectedUrls = pages
    .filter((page) => page.bingInspection)
    .map((page) => page.url);

  return {
    provider: 'bing',
    siteUrl,
    generatedAt: (params?.now || new Date()).toISOString(),
    status: deriveOverallStatus({
      counts,
      api: {
        ...api,
        inspectedUrls,
      },
      experience,
    }),
    summaryMessage: buildSummaryMessage(counts),
    checkedUrlCount: pages.length,
    expectedSitemapUrlCount: audit.expectedSitemapUrlCount,
    counts,
    discovery: audit.discovery,
    pages,
    api: {
      ...api,
      inspectedUrls,
    },
    experience,
  } satisfies BingSiteReport;
}
