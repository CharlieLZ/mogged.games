import 'server-only';

import type { MetadataRoute } from 'next';

import { getIndexNowRuntimeKey } from '@/shared/lib/indexnow-key';
import type {
  SiteMonitoringCheck,
  SiteMonitoringCheckStatus,
  SiteMonitoringCounts,
  SiteMonitoringDiscoveryRow,
  SiteMonitoringPageRow,
} from '@/shared/models/admin-report';

export type RealtimeSiteAuditResult = {
  generatedAt: string;
  expectedSitemapUrlCount: number;
  discovery: SiteMonitoringDiscoveryRow[];
  pages: SiteMonitoringPageRow[];
  counts: SiteMonitoringCounts;
};

function normalizeStatusCode(statusCode: number) {
  return Number.isFinite(statusCode) ? statusCode : null;
}

export function buildEmptySiteMonitoringCounts(): SiteMonitoringCounts {
  return {
    errorCount: 0,
    warningCount: 0,
    passCount: 0,
    skippedCount: 0,
  };
}

export function mergeSiteMonitoringCounts(
  countsList: readonly SiteMonitoringCounts[]
): SiteMonitoringCounts {
  return countsList.reduce(
    (result, counts) => ({
      errorCount: result.errorCount + counts.errorCount,
      warningCount: result.warningCount + counts.warningCount,
      passCount: result.passCount + counts.passCount,
      skippedCount: result.skippedCount + counts.skippedCount,
    }),
    buildEmptySiteMonitoringCounts()
  );
}

function buildCheck(params: {
  code: string;
  label: string;
  status: SiteMonitoringCheckStatus;
  value?: string | null;
  details?: string | null;
}): SiteMonitoringCheck {
  return params;
}

function countsFromChecks(checks: readonly SiteMonitoringCheck[]) {
  return checks.reduce((result, check) => {
    if (check.status === 'error') {
      result.errorCount += 1;
    } else if (check.status === 'warning') {
      result.warningCount += 1;
    } else if (check.status === 'pass') {
      result.passCount += 1;
    } else {
      result.skippedCount += 1;
    }

    return result;
  }, buildEmptySiteMonitoringCounts());
}

function toAbsoluteUrl(siteUrl: string, path: string) {
  return path === '/' ? siteUrl : `${siteUrl}${path}`;
}

function extractHtmlLang(html: string) {
  return html.match(/<html[^>]*\blang=["']([^"']+)["']/i)?.[1] || null;
}

function extractCanonical(html: string) {
  return (
    html.match(
      /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i
    )?.[1] || null
  );
}

function extractAlternateLanguages(html: string) {
  const languages: Record<string, string> = {};
  const pattern =
    /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi;

  for (const match of html.matchAll(pattern)) {
    const locale = match[1]?.trim();
    const href = match[2]?.trim();

    if (locale && href) {
      languages[locale] = href;
    }
  }

  return languages;
}

function extractTitle(html: string) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || null;
}

function extractMetaContent(html: string, name: string, attribute = 'name') {
  const pattern = new RegExp(
    `<meta[^>]*${attribute}=["']${name}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );

  return html.match(pattern)?.[1]?.trim() || null;
}

function containsNoIndex(value?: string | null) {
  return /\bnoindex\b/i.test(value || '');
}

function inferLocale(url: string, htmlLang: string | null) {
  try {
    const pathname = new URL(url).pathname;
    const firstSegment = pathname.split('/').filter(Boolean)[0];

    if (firstSegment && firstSegment.length <= 5) {
      return firstSegment;
    }
  } catch {
    // ignore invalid URL parsing and fall back to html lang
  }

  return htmlLang?.split('-')[0] || null;
}

async function auditEndpoint(params: {
  siteUrl: string;
  name: string;
  label: string;
  path: string;
}) {
  const url = toAbsoluteUrl(params.siteUrl, params.path);
  const response = await fetch(url);
  const body = await response.text();
  const statusCode = normalizeStatusCode(response.status);
  const checks: SiteMonitoringCheck[] = [
    buildCheck({
      code: 'status',
      label: 'HTTP 200',
      status: response.ok ? 'pass' : 'error',
      value: `${statusCode ?? 'unknown'}`,
      details: `${params.label} reachable`,
    }),
  ];

  if (params.path === '/robots.txt') {
    checks.push(
      buildCheck({
        code: 'sitemap-reference',
        label: 'Sitemap reference',
        status: body.includes(`${params.siteUrl}/sitemap.xml`) ? 'pass' : 'warning',
        details: 'robots.txt should point to sitemap.xml',
      })
    );
  }

  if (params.path === '/sitemap.xml') {
    checks.push(
      buildCheck({
        code: 'contains-urlset',
        label: 'Contains urlset',
        status: /<urlset[\s>]/i.test(body) ? 'pass' : 'warning',
        details: 'sitemap.xml should expose a urlset payload',
      })
    );
  }

  return {
    kind: 'endpoint',
    name: params.name,
    label: params.label,
    url,
    statusCode,
    contentType: response.headers.get('content-type'),
    counts: countsFromChecks(checks),
    checks,
  } satisfies SiteMonitoringDiscoveryRow;
}

async function auditPage(
  entry: MetadataRoute.Sitemap[number]
): Promise<SiteMonitoringPageRow> {
  const response = await fetch(entry.url);
  const html = await response.text();
  const statusCode = normalizeStatusCode(response.status);
  const canonicalUrl = extractCanonical(html);
  const htmlLang = extractHtmlLang(html);
  const locale = inferLocale(entry.url, htmlLang);
  const title = extractTitle(html);
  const description = extractMetaContent(html, 'description');
  const metaRobots = extractMetaContent(html, 'robots');
  const ogTitle = extractMetaContent(html, 'og:title', 'property');
  const ogDescription = extractMetaContent(html, 'og:description', 'property');
  const ogImage = extractMetaContent(html, 'og:image', 'property');
  const ogUrl = extractMetaContent(html, 'og:url', 'property');
  const xRobotsTag = response.headers.get('x-robots-tag');
  const alternateLanguages = extractAlternateLanguages(html);
  const expectedLanguages = entry.alternates?.languages || {};
  const requiredHreflangEntries = Object.entries(expectedLanguages);
  const hreflangMatches =
    requiredHreflangEntries.length === 0 ||
    requiredHreflangEntries.every(
      ([candidateLocale, href]) => alternateLanguages[candidateLocale] === href
    );
  const checks: SiteMonitoringCheck[] = [
    buildCheck({
      code: 'html-status',
      label: 'HTTP 200',
      status: response.ok ? 'pass' : 'error',
      value: `${statusCode ?? 'unknown'}`,
      details: 'html page reachable',
    }),
    buildCheck({
      code: 'canonical',
      label: 'Canonical',
      status: canonicalUrl === entry.url ? 'pass' : 'warning',
      value: canonicalUrl,
      details: 'canonical should match the sitemap URL',
    }),
    buildCheck({
      code: 'hreflang',
      label: 'Hreflang',
      status: hreflangMatches ? 'pass' : 'warning',
      details: 'alternate language links should match sitemap metadata',
    }),
    buildCheck({
      code: 'html-lang',
      label: 'HTML lang',
      status:
        htmlLang && locale && htmlLang.toLowerCase().startsWith(locale.toLowerCase())
          ? 'pass'
          : 'warning',
      value: htmlLang,
      details: 'html lang should align with the localized page locale',
    }),
    buildCheck({
      code: 'title',
      label: 'Title',
      status: title ? 'pass' : 'error',
      value: title,
      details: 'title should be present',
    }),
    buildCheck({
      code: 'description',
      label: 'Description',
      status: description ? 'pass' : 'error',
      value: description,
      details: 'meta description should be present',
    }),
    buildCheck({
      code: 'x-robots-tag',
      label: 'X-Robots-Tag',
      status: containsNoIndex(xRobotsTag) ? 'error' : 'pass',
      value: xRobotsTag,
      details: 'response headers should allow indexing',
    }),
    buildCheck({
      code: 'meta-robots',
      label: 'Meta robots',
      status: containsNoIndex(metaRobots) ? 'error' : 'pass',
      value: metaRobots,
      details: 'meta robots should allow indexing',
    }),
    buildCheck({
      code: 'open-graph',
      label: 'Open Graph',
      status:
        ogTitle && ogDescription && ogImage && ogUrl === entry.url
          ? 'pass'
          : 'warning',
      value: ogUrl,
      details:
        'og:title, og:description, og:image, and og:url should be present',
    }),
  ];

  return {
    kind: 'page',
    url: entry.url,
    path: new URL(entry.url).pathname,
    locale,
    statusCode,
    contentType: response.headers.get('content-type'),
    canonicalUrl,
    htmlLang,
    counts: countsFromChecks(checks),
    bingInspection: null,
    checks,
  };
}

function uniqueSitemapEntries(sitemap: MetadataRoute.Sitemap) {
  const seen = new Set<string>();

  return sitemap.filter((entry) => {
    if (seen.has(entry.url)) {
      return false;
    }

    seen.add(entry.url);
    return true;
  });
}

export async function runRealtimeSiteAudit(params: {
  sitemap: MetadataRoute.Sitemap;
  siteUrl: string;
}): Promise<RealtimeSiteAuditResult> {
  const sitemap = uniqueSitemapEntries(params.sitemap);
  const discoveryPaths = [
    {
      name: 'robots.txt',
      label: 'Robots.txt',
      path: '/robots.txt',
    },
    {
      name: 'sitemap.xml',
      label: 'Sitemap.xml',
      path: '/sitemap.xml',
    },
    {
      name: 'BingSiteAuth.xml',
      label: 'BingSiteAuth.xml',
      path: '/BingSiteAuth.xml',
    },
    {
      name: 'indexnow-key',
      label: 'IndexNow key',
      path: `/${getIndexNowRuntimeKey()}.txt`,
    },
  ] as const;

  const [discovery, pages] = await Promise.all([
    Promise.all(
      discoveryPaths.map((entry) =>
        auditEndpoint({
          siteUrl: params.siteUrl,
          ...entry,
        })
      )
    ),
    Promise.all(sitemap.map((entry) => auditPage(entry))),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    expectedSitemapUrlCount: sitemap.length,
    discovery,
    pages,
    counts: mergeSiteMonitoringCounts([
      ...discovery.map((entry) => entry.counts),
      ...pages.map((entry) => entry.counts),
    ]),
  };
}
