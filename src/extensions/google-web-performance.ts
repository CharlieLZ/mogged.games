import 'server-only';

import { fetchJsonWithRetry } from '@/extensions/google-fetch';
import type {
  GoogleSiteCoreWebVitalsFieldData,
  GoogleSiteCoreWebVitalsLabSnapshot,
} from '@/shared/models/admin-report';

export type CoreWebVitalsReport = {
  source: 'crux' | 'psi' | null;
  origin: string;
  fieldData: GoogleSiteCoreWebVitalsFieldData | null;
  labSnapshots: GoogleSiteCoreWebVitalsLabSnapshot[];
};

type CruxApiResponse = {
  record?: {
    metrics?: Record<
      string,
      {
        percentiles?: {
          p75?: number;
        };
      }
    >;
  };
};

type PageSpeedApiResponse = {
  originLoadingExperience?: {
    overall_category?: string;
    metrics?: Record<
      string,
      {
        percentile?: number;
      }
    >;
  };
  lighthouseResult?: {
    categories?: {
      performance?: {
        score?: number;
      };
    };
    audits?: Record<
      string,
      {
        numericValue?: number;
      }
    >;
  };
};

function trimValue(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeClsValue(value: unknown) {
  const parsed = toNumber(value);

  if (parsed <= 1) {
    return parsed || null;
  }

  return parsed / 1000;
}

function getMetricPercentile(
  metrics: Record<string, { percentile?: number }> | undefined,
  candidates: string[]
) {
  for (const candidate of candidates) {
    const percentile = metrics?.[candidate]?.percentile;

    if (typeof percentile === 'number' && Number.isFinite(percentile)) {
      return percentile;
    }
  }

  return null;
}

async function queryCruxOrigin(origin: string, apiKey: string) {
  const response = await fetchJsonWithRetry<CruxApiResponse>({
    url: `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(apiKey)}`,
    label: 'crux:origin',
    init: {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        origin,
      }),
    },
  });

  const metrics = response.record?.metrics || {};
  const lcp = toNumber(metrics.largest_contentful_paint?.percentiles?.p75);
  const inp = toNumber(metrics.interaction_to_next_paint?.percentiles?.p75);
  const cls = normalizeClsValue(
    metrics.cumulative_layout_shift?.percentiles?.p75
  );

  return {
    scope: 'origin',
    collectionPeriod: 'recent_28d',
    overallCategory:
      lcp > 0 && lcp <= 2500 && inp > 0 && inp <= 200 && (cls || 0) <= 0.1
        ? 'GOOD'
        : 'NEEDS_IMPROVEMENT',
    largestContentfulPaintMs: lcp || null,
    interactionToNextPaintMs: inp || null,
    cumulativeLayoutShift: cls,
  } satisfies GoogleSiteCoreWebVitalsFieldData;
}

async function queryPageSpeed({
  url,
  strategy,
  apiKey,
}: {
  url: string;
  strategy: 'mobile' | 'desktop';
  apiKey?: string;
}) {
  const requestUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  requestUrl.searchParams.set('url', url);
  requestUrl.searchParams.set('strategy', strategy);
  requestUrl.searchParams.set('category', 'performance');

  if (trimValue(apiKey)) {
    requestUrl.searchParams.set('key', trimValue(apiKey));
  }

  return fetchJsonWithRetry<PageSpeedApiResponse>({
    url: requestUrl.toString(),
    label: `psi:${strategy}:${url}`,
  });
}

function toFieldDataFromPsi(response: PageSpeedApiResponse) {
  const metrics = response.originLoadingExperience?.metrics;

  if (!metrics) {
    return null;
  }

  return {
    scope: 'origin',
    collectionPeriod: 'recent_28d',
    overallCategory: response.originLoadingExperience?.overall_category || 'UNKNOWN',
    largestContentfulPaintMs: getMetricPercentile(metrics, [
      'LARGEST_CONTENTFUL_PAINT_MS',
    ]),
    interactionToNextPaintMs: getMetricPercentile(metrics, [
      'INTERACTION_TO_NEXT_PAINT',
      'EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT',
    ]),
    cumulativeLayoutShift: normalizeClsValue(
      getMetricPercentile(metrics, ['CUMULATIVE_LAYOUT_SHIFT_SCORE'])
    ),
  } satisfies GoogleSiteCoreWebVitalsFieldData;
}

function toLabSnapshot(
  url: string,
  strategy: 'mobile' | 'desktop',
  response: PageSpeedApiResponse
) {
  const performance = response.lighthouseResult?.categories?.performance?.score;
  const audits = response.lighthouseResult?.audits || {};

  return {
    url,
    strategy,
    performanceScore:
      typeof performance === 'number' && Number.isFinite(performance)
        ? performance
        : null,
    largestContentfulPaintMs:
      typeof audits['largest-contentful-paint']?.numericValue === 'number'
        ? audits['largest-contentful-paint']?.numericValue || null
        : null,
    totalBlockingTimeMs:
      typeof audits['total-blocking-time']?.numericValue === 'number'
        ? audits['total-blocking-time']?.numericValue || null
        : null,
    cumulativeLayoutShift:
      typeof audits['cumulative-layout-shift']?.numericValue === 'number'
        ? audits['cumulative-layout-shift']?.numericValue || null
        : null,
  } satisfies GoogleSiteCoreWebVitalsLabSnapshot;
}

function getCruxApiKey() {
  return (
    trimValue(process.env.CRUX_API_KEY) ||
    trimValue(process.env.GOOGLE_PAGESPEED_API_KEY) ||
    trimValue(process.env.PAGESPEED_API_KEY)
  );
}

function getPageSpeedApiKey() {
  return (
    trimValue(process.env.GOOGLE_PAGESPEED_API_KEY) ||
    trimValue(process.env.PAGESPEED_API_KEY)
  );
}

export async function getCoreWebVitalsReport(params: {
  origin: string;
  representativeUrls: string[];
}): Promise<CoreWebVitalsReport> {
  const pageSpeedApiKey = getPageSpeedApiKey();
  const cruxApiKey = getCruxApiKey();

  if (!pageSpeedApiKey && !cruxApiKey) {
    throw new Error(
      '缺少 CRUX_API_KEY / GOOGLE_PAGESPEED_API_KEY，无法稳定获取 Core Web Vitals'
    );
  }

  let fieldData: GoogleSiteCoreWebVitalsFieldData | null = null;
  let source: 'crux' | 'psi' | null = null;

  if (cruxApiKey) {
    try {
      fieldData = await queryCruxOrigin(params.origin, cruxApiKey);
      source = 'crux';
    } catch {
      fieldData = null;
      source = null;
    }
  }

  const psiSettled = await Promise.allSettled(
    params.representativeUrls.map(async (url) => {
      const response = await queryPageSpeed({
        url,
        strategy: 'mobile',
        apiKey: pageSpeedApiKey || undefined,
      });

      if (!fieldData) {
        fieldData = toFieldDataFromPsi(response);
        source = 'psi';
      }

      return toLabSnapshot(url, 'mobile', response);
    })
  );

  const labSnapshots = psiSettled
    .flatMap((entry) =>
      entry.status === 'fulfilled' ? [entry.value] : []
    );

  if (!fieldData && labSnapshots.length === 0) {
    const firstFailure = psiSettled.find((entry) => entry.status === 'rejected');
    throw firstFailure?.reason || new Error('Core Web Vitals 数据获取失败');
  }

  return {
    source,
    origin: params.origin,
    fieldData,
    labSnapshots,
  };
}
