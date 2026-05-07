import type {
  GoogleSearchAnalyticsReport,
  GoogleSitemapReport,
  GoogleUrlInspectionReport,
} from '@/extensions/google-search-console';
import {
  getSearchAnalyticsReport,
  getSitemapReport,
  getUrlInspectionReport,
} from '@/extensions/google-search-console';
import type { CoreWebVitalsReport } from '@/extensions/google-web-performance';
import { getCoreWebVitalsReport } from '@/extensions/google-web-performance';
import type { AdminReportFrequency } from '@/shared/lib/admin-report-period';
import type {
  GoogleSiteCoreWebVitalsSection,
  GoogleSiteReport,
  GoogleSiteSearchPerformanceSection,
  GoogleSiteSitemapSection,
  GoogleSiteUrlInspectionSection,
} from '@/shared/models/admin-report';
import {
  buildAbsoluteSiteUrl,
  buildSearchConsoleCheckCards,
  getSearchConsoleProperty,
  getSearchConsolePropertyHomeUrl,
  GOOGLE_CORE_WEB_VITALS_PATHS,
  GOOGLE_SEARCH_CONSOLE_INSPECTION_PATHS,
} from '@/shared/lib/google-site-report-config';
import type { GoogleSiteReportRange } from '@/shared/lib/google-site-report-period';
import { resolveGoogleSiteReportRange } from '@/shared/lib/google-site-report-period';

type SearchPerformanceSection = GoogleSiteSearchPerformanceSection;
type UrlInspectionSection = GoogleSiteUrlInspectionSection;
type SitemapSection = GoogleSiteSitemapSection;
type CoreWebVitalsSection = GoogleSiteCoreWebVitalsSection;

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildDefaultSearchPerformanceSection(
  range: GoogleSiteReportRange,
  errorMessage?: string
): SearchPerformanceSection {
  return {
    status: errorMessage ? 'degraded' : 'ok',
    range,
    totals: null,
    topQueries: [],
    topPages: [],
    topCountries: [],
    topDevices: [],
    ...(errorMessage ? { errorMessage } : {}),
  };
}

function buildDefaultUrlInspectionSection(errorMessage?: string): UrlInspectionSection {
  return {
    status: errorMessage ? 'degraded' : 'ok',
    inspectedAt: null,
    rows: [],
    ...(errorMessage ? { errorMessage } : {}),
  };
}

function buildDefaultSitemapSection(property: string, errorMessage?: string): SitemapSection {
  return {
    status: errorMessage ? 'degraded' : 'ok',
    property,
    sitemapUrl: buildAbsoluteSiteUrl('/sitemap.xml'),
    lastSubmitted: null,
    isPending: false,
    warnings: 0,
    errors: 0,
    type: null,
    contentsSubmitted: 0,
    contentsIndexed: 0,
    ...(errorMessage ? { errorMessage } : {}),
  };
}

function buildDefaultCoreWebVitalsSection(errorMessage?: string): CoreWebVitalsSection {
  return {
    status: errorMessage ? 'degraded' : 'ok',
    source: null,
    origin: buildAbsoluteSiteUrl('/'),
    fieldData: null,
    labSnapshots: [],
    ...(errorMessage ? { errorMessage } : {}),
  };
}

function maybePushErrorNote(notes: string[], title: string, errorMessage?: string) {
  if (!errorMessage) {
    return;
  }

  notes.push(`${title} 获取失败：${errorMessage}`);
}

export async function buildGoogleSiteReport({
  frequency,
  now = new Date(),
  property = getSearchConsoleProperty(),
}: {
  frequency: AdminReportFrequency;
  now?: Date;
  property?: string;
}): Promise<GoogleSiteReport> {
  const range = resolveGoogleSiteReportRange({
    frequency,
    now,
  });
  const propertyUrl = getSearchConsolePropertyHomeUrl(property);
  const notes = ['Google 搜索数据按 PT 自然日统计。'];

  const [
    searchPerformanceResult,
    urlInspectionResult,
    sitemapResult,
    coreWebVitalsResult,
  ]: [
    PromiseSettledResult<GoogleSearchAnalyticsReport>,
    PromiseSettledResult<GoogleUrlInspectionReport>,
    PromiseSettledResult<GoogleSitemapReport>,
    PromiseSettledResult<CoreWebVitalsReport>,
  ] = await Promise.allSettled([
    getSearchAnalyticsReport({
      property,
      range,
    }),
    getUrlInspectionReport({
      property,
      paths: GOOGLE_SEARCH_CONSOLE_INSPECTION_PATHS,
    }),
    getSitemapReport({
      property,
    }),
    getCoreWebVitalsReport({
      origin: buildAbsoluteSiteUrl('/'),
      representativeUrls: GOOGLE_CORE_WEB_VITALS_PATHS.map((path) =>
        buildAbsoluteSiteUrl(path)
      ),
    }),
  ]);

  const searchPerformance: SearchPerformanceSection =
    searchPerformanceResult.status === 'fulfilled'
        ? {
          status: 'ok' as const,
          range,
          totals: searchPerformanceResult.value.totals,
          topQueries: searchPerformanceResult.value.topQueries,
          topPages: searchPerformanceResult.value.topPages,
          topCountries: searchPerformanceResult.value.topCountries,
          topDevices: searchPerformanceResult.value.topDevices,
          errorMessage: undefined,
        }
      : buildDefaultSearchPerformanceSection(
          range,
          toErrorMessage(searchPerformanceResult.reason)
        );

  const urlInspection: UrlInspectionSection =
    urlInspectionResult.status === 'fulfilled'
        ? {
          status: 'ok' as const,
          inspectedAt: urlInspectionResult.value.inspectedAt,
          rows: urlInspectionResult.value.rows,
          errorMessage: undefined,
        }
      : buildDefaultUrlInspectionSection(
          toErrorMessage(urlInspectionResult.reason)
        );

  const sitemap: SitemapSection =
    sitemapResult.status === 'fulfilled'
        ? {
          status: 'ok' as const,
          ...sitemapResult.value,
          errorMessage: undefined,
        }
      : buildDefaultSitemapSection(property, toErrorMessage(sitemapResult.reason));

  const coreWebVitals: CoreWebVitalsSection =
    coreWebVitalsResult.status === 'fulfilled'
        ? {
          status: 'ok' as const,
          source: coreWebVitalsResult.value.source,
          origin: coreWebVitalsResult.value.origin,
          fieldData: coreWebVitalsResult.value.fieldData,
          labSnapshots: coreWebVitalsResult.value.labSnapshots,
          errorMessage: undefined,
        }
      : buildDefaultCoreWebVitalsSection(
          toErrorMessage(coreWebVitalsResult.reason)
        );

  if (coreWebVitals.status === 'ok' && coreWebVitals.source === 'psi') {
    notes.push('CrUX API key 缺失或不可用时，Core Web Vitals 会自动回退到 PSI 数据。');
  }

  maybePushErrorNote(notes, 'Google 搜索表现', searchPerformance.errorMessage);
  maybePushErrorNote(notes, 'URL 检查', urlInspection.errorMessage);
  maybePushErrorNote(notes, 'Sitemap 状态', sitemap.errorMessage);
  maybePushErrorNote(notes, 'Core Web Vitals', coreWebVitals.errorMessage);

  return {
    property,
    propertyUrl,
    searchPerformance,
    urlInspection,
    sitemap,
    coreWebVitals,
    checkCards: [...buildSearchConsoleCheckCards(property)],
    notes,
  };
}
