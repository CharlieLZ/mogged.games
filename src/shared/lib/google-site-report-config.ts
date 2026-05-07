import { getAppDomain, getAppUrl } from '@/shared/lib/brand';

export const GOOGLE_SEARCH_CONSOLE_TIME_ZONE = 'America/Los_Angeles';

export const GOOGLE_SEARCH_CONSOLE_INSPECTION_PATHS = [
  '/',
  '/pricing',
  '/leaderboard',
] as const;

export const GOOGLE_CORE_WEB_VITALS_PATHS = [
  '/',
  '/pricing',
  '/leaderboard',
] as const;

function normalizeSearchConsoleProperty(value?: string | null) {
  const normalized = value?.trim();

  if (normalized) {
    return normalized;
  }

  return `sc-domain:${getAppDomain()}`;
}

export function getSearchConsoleProperty() {
  return normalizeSearchConsoleProperty(process.env.GSC_SITE_URL);
}

export function getSearchConsolePropertyCandidates(
  property = getSearchConsoleProperty()
) {
  const candidates = [property];

  if (!process.env.GSC_SITE_URL?.trim() && property.startsWith('sc-domain:')) {
    candidates.push(`${getAppUrl()}/`);
  }

  return Array.from(new Set(candidates));
}

export function getSearchConsolePropertyHomeUrl(property = getSearchConsoleProperty()) {
  return `https://search.google.com/search-console?resource_id=${encodeURIComponent(property)}`;
}

export function buildSearchConsoleResourceUrl(
  path: string,
  property = getSearchConsoleProperty()
) {
  return `https://search.google.com/search-console/${path}?resource_id=${encodeURIComponent(property)}`;
}

export function buildSearchConsoleCheckCards(property = getSearchConsoleProperty()) {
  return [
    {
      title: 'Page indexing',
      href: buildSearchConsoleResourceUrl('index', property),
      description: '确认核心 canonical 页面没有被错误排除，重点看抓取、索引和 canonical 判定。',
    },
    {
      title: 'Manual actions',
      href: buildSearchConsoleResourceUrl('manual-actions', property),
      description: '确认站点没有人工处罚，避免流量突然被硬性压制。',
    },
    {
      title: 'Security issues',
      href: buildSearchConsoleResourceUrl('security-issues', property),
      description: '确认站点没有安全风险告警，避免被 Google 或浏览器拦截。',
    },
  ] as const;
}

export function buildAbsoluteSiteUrl(path: string) {
  const baseUrl = getAppUrl();
  const normalizedPath = path === '/' ? '' : path;
  return `${baseUrl}${normalizedPath}`;
}
