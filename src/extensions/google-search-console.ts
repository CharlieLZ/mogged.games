import 'server-only';

import { fetchJsonWithRetry } from '@/extensions/google-fetch';
import { getGoogleServiceAccountAccessToken } from '@/extensions/google-service-account';
import {
  buildAbsoluteSiteUrl,
  getSearchConsoleProperty,
  getSearchConsolePropertyCandidates,
} from '@/shared/lib/google-site-report-config';
import type {
  GoogleSiteMetricRow,
  GoogleSiteMetricTotals,
  GoogleSiteReportRange,
  GoogleSiteSitemapSection,
  GoogleSiteUrlInspectionRow,
} from '@/shared/models/admin-report';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SEARCH_ANALYTICS_ENDPOINT = 'https://www.googleapis.com/webmasters/v3';
const URL_INSPECTION_ENDPOINT =
  'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

type SearchAnalyticsApiRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchAnalyticsApiResponse = {
  rows?: SearchAnalyticsApiRow[];
};

export type GoogleSearchAnalyticsReport = {
  property: string;
  range: GoogleSiteReportRange;
  totals: GoogleSiteMetricTotals;
  topQueries: GoogleSiteMetricRow[];
  topPages: GoogleSiteMetricRow[];
  topCountries: GoogleSiteMetricRow[];
  topDevices: GoogleSiteMetricRow[];
};

type UrlInspectionApiResponse = {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      indexingState?: string;
      robotsTxtState?: string;
      pageFetchState?: string;
      userCanonical?: string;
      googleCanonical?: string;
      lastCrawlTime?: string;
      sitemap?: string[];
    };
  };
};

export type GoogleUrlInspectionReport = {
  property: string;
  inspectedAt: string | null;
  rows: GoogleSiteUrlInspectionRow[];
};

type SitemapApiResponse = {
  lastSubmitted?: string;
  isPending?: boolean;
  warnings?: number | string;
  errors?: number | string;
  type?: string;
  contents?: Array<{
    submitted?: number | string;
    indexed?: number | string;
  }>;
};

export type GoogleSitemapReport = Omit<
  GoogleSiteSitemapSection,
  'status' | 'errorMessage'
>;

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSearchRow(row?: SearchAnalyticsApiRow): GoogleSiteMetricRow {
  return {
    key: row?.keys?.[0] || '',
    clicks: toNumber(row?.clicks),
    impressions: toNumber(row?.impressions),
    ctr: toNumber(row?.ctr),
    position: toNumber(row?.position),
  };
}

async function getSearchConsoleAccessToken() {
  return getGoogleServiceAccountAccessToken([SEARCH_CONSOLE_SCOPE]);
}

async function searchConsoleRequest<T>({
  path,
  method = 'GET',
  body,
  label,
}: {
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  label: string;
}) {
  const accessToken = await getSearchConsoleAccessToken();

  return fetchJsonWithRetry<T>({
    url: `${SEARCH_ANALYTICS_ENDPOINT}${path}`,
    label,
    init: {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  });
}

async function querySearchAnalytics(params: {
  property: string;
  range: GoogleSiteReportRange;
  dimensions?: string[];
  rowLimit?: number;
  aggregationType?: 'auto' | 'byPage' | 'byProperty';
}) {
  return searchConsoleRequest<SearchAnalyticsApiResponse>({
    path: `/sites/${encodeURIComponent(params.property)}/searchAnalytics/query`,
    method: 'POST',
    label: `gsc:search-analytics:${params.dimensions?.join(',') || 'totals'}`,
    body: {
      startDate: params.range.startDate,
      endDate: params.range.endDate,
      type: 'web',
      dimensions: params.dimensions || [],
      rowLimit: params.rowLimit || 5,
      aggregationType: params.aggregationType || 'auto',
      dataState: 'final',
    },
  });
}

function isSearchConsolePermissionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('403') &&
    (message.includes('permission') ||
      message.includes('do not own this site') ||
      message.includes('sufficient permission'))
  );
}

async function withPropertyFallback<T>(
  property: string,
  executor: (candidate: string) => Promise<T>
) {
  const candidates = getSearchConsolePropertyCandidates(property);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      return await executor(candidate);
    } catch (error) {
      lastError = error;

      if (!isSearchConsolePermissionError(error) || candidate === candidates.at(-1)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Search Console property fallback failed');
}

export async function getSearchAnalyticsReport(params: {
  property: string;
  range: GoogleSiteReportRange;
}): Promise<GoogleSearchAnalyticsReport> {
  return withPropertyFallback(params.property, async (property) => {
    const [totalsResponse, queriesResponse, pagesResponse, countriesResponse, devicesResponse] =
      await Promise.all([
        querySearchAnalytics({
          property,
          range: params.range,
          rowLimit: 1,
        }),
        querySearchAnalytics({
          property,
          range: params.range,
          dimensions: ['query'],
        }),
        querySearchAnalytics({
          property,
          range: params.range,
          dimensions: ['page'],
          aggregationType: 'byPage',
        }),
        querySearchAnalytics({
          property,
          range: params.range,
          dimensions: ['country'],
        }),
        querySearchAnalytics({
          property,
          range: params.range,
          dimensions: ['device'],
        }),
      ]);

    const totalsRow = normalizeSearchRow(totalsResponse.rows?.[0]);

    return {
      property,
      range: params.range,
      totals: {
        clicks: totalsRow.clicks,
        impressions: totalsRow.impressions,
        ctr: totalsRow.ctr,
        position: totalsRow.position,
      },
      topQueries: (queriesResponse.rows || []).map(normalizeSearchRow),
      topPages: (pagesResponse.rows || []).map(normalizeSearchRow),
      topCountries: (countriesResponse.rows || []).map(normalizeSearchRow),
      topDevices: (devicesResponse.rows || []).map(normalizeSearchRow),
    };
  });
}

export async function getUrlInspectionReport(params: {
  property: string;
  paths: readonly string[];
}): Promise<GoogleUrlInspectionReport> {
  return withPropertyFallback(params.property, async (property) => {
    const accessToken = await getSearchConsoleAccessToken();
    const settled = await Promise.allSettled(
      params.paths.map(async (path) => {
        const url = buildAbsoluteSiteUrl(path);
        const response = await fetchJsonWithRetry<UrlInspectionApiResponse>({
          url: URL_INSPECTION_ENDPOINT,
          label: `gsc:url-inspection:${path}`,
          init: {
            method: 'POST',
            headers: {
              authorization: `Bearer ${accessToken}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              inspectionUrl: url,
              siteUrl: property,
            }),
          },
        });
        const result = response.inspectionResult?.indexStatusResult;

        return {
          url,
          path,
          verdict: result?.verdict || 'UNKNOWN',
          coverageState: result?.coverageState || 'unknown',
          indexingState: result?.indexingState || 'unknown',
          robotsTxtState: result?.robotsTxtState || 'unknown',
          pageFetchState: result?.pageFetchState || 'unknown',
          userCanonical: result?.userCanonical || null,
          googleCanonical: result?.googleCanonical || null,
          lastCrawlTime: result?.lastCrawlTime || null,
          sitemap: Array.isArray(result?.sitemap) ? result.sitemap : [],
        } satisfies GoogleSiteUrlInspectionRow;
      })
    );

    const rows = settled
      .filter(
        (
          entry
        ): entry is PromiseFulfilledResult<GoogleSiteUrlInspectionRow> =>
          entry.status === 'fulfilled'
      )
      .map((entry) => entry.value);

    if (rows.length === 0) {
      const firstFailure = settled.find((entry) => entry.status === 'rejected');
      throw (
        firstFailure?.reason ||
        new Error('GSC URL Inspection 所有核心页面都查询失败')
      );
    }

    return {
      property,
      inspectedAt: new Date().toISOString(),
      rows,
    };
  });
}

export async function getSitemapReport({
  property = getSearchConsoleProperty(),
}: {
  property: string;
}): Promise<GoogleSitemapReport> {
  return withPropertyFallback(property, async (candidate) => {
    const sitemapUrl = buildAbsoluteSiteUrl('/sitemap.xml');
    const response = await searchConsoleRequest<SitemapApiResponse>({
      path: `/sites/${encodeURIComponent(candidate)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
      label: 'gsc:sitemap',
    });
    const firstContent = Array.isArray(response.contents)
      ? response.contents[0]
      : null;

    return {
      property: candidate,
      sitemapUrl,
      lastSubmitted: response.lastSubmitted || null,
      isPending: response.isPending === true,
      warnings: toNumber(response.warnings),
      errors: toNumber(response.errors),
      type: response.type || null,
      contentsSubmitted: toNumber(firstContent?.submitted),
      contentsIndexed: toNumber(firstContent?.indexed),
    };
  });
}
