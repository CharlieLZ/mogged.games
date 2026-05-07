import {
  getLocaleBcp47,
  resolveAppLocale,
  type AppLocale,
} from '@/config/locale';
import {
  FREE_TOOL_LAST_MODIFIED_ISO,
  FREE_TOOL_PATHS,
  FREE_TOOLS_ROOT_PATH,
} from '@/shared/lib/free-tools-catalog';

export const AI_IMAGE_GENERATOR_ROOT_PATH = '/ai-image-generator';

export const AI_VIDEO_GENERATOR_ROOT_PATH = '/ai-video-generator';

export function isAiImageGeneratorPath(path: string) {
  return path === AI_IMAGE_GENERATOR_ROOT_PATH;
}

export function isAiVideoGeneratorPath(path: string) {
  return path === AI_VIDEO_GENERATOR_ROOT_PATH;
}

export const PUBLIC_PAGE_LAST_MODIFIED_ISO = {
  '/': '2026-05-07T00:00:00.000Z',
  '/pricing': '2026-05-07T00:00:00.000Z',
  '/leaderboard': '2026-05-07T00:00:00.000Z',
  [FREE_TOOLS_ROOT_PATH]: '2026-05-07T00:00:00.000Z',
  ...FREE_TOOL_LAST_MODIFIED_ISO,
  '/mission': '2026-05-07T00:00:00.000Z',
  '/privacy-policy': '2026-04-12T00:00:00.000Z',
  '/terms-of-service': '2026-04-12T00:00:00.000Z',
  '/refund-policy': '2026-04-12T00:00:00.000Z',
  '/acceptable-use-policy': '2026-05-05T00:00:00.000Z',
  '/content-moderation-policy': '2026-04-12T00:00:00.000Z',
  '/ai-wrapper-disclaimer': '2026-04-12T00:00:00.000Z',
} as const satisfies Record<string, string>;


export function normalizePublicSeoLocale(locale?: string): AppLocale {
  return resolveAppLocale(locale);
}

function normalizePath(path: string) {
  if (!path || path === '.') {
    return '/';
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    const url = new URL(path);
    return url.pathname === '' ? '/' : url.pathname.replace(/\/+$/, '') || '/';
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized === '/' ? '/' : normalized.replace(/\/+$/, '');
}

export const NOINDEX_PUBLIC_PAGE_PATHS = [
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
  '/acceptable-use-policy',
  '/content-moderation-policy',
  '/ai-wrapper-disclaimer',
  FREE_TOOLS_ROOT_PATH,
  ...FREE_TOOL_PATHS,
] as const;

const NOINDEX_PUBLIC_PAGE_PATH_SET = new Set<string>(NOINDEX_PUBLIC_PAGE_PATHS);

export function isNoIndexPublicPagePath(path: string) {
  return NOINDEX_PUBLIC_PAGE_PATH_SET.has(normalizePath(path));
}

export function getPublicPageLastModified(path: string) {
  const normalizedPath = normalizePath(path);
  const iso =
    PUBLIC_PAGE_LAST_MODIFIED_ISO[
      normalizedPath as keyof typeof PUBLIC_PAGE_LAST_MODIFIED_ISO
    ] || PUBLIC_PAGE_LAST_MODIFIED_ISO['/'];

  return new Date(iso);
}


export function formatPublicPageLastModified(path: string, locale?: string) {
  const normalizedLocale = normalizePublicSeoLocale(locale);

  return new Intl.DateTimeFormat(getLocaleBcp47(normalizedLocale), {
    year: 'numeric',
    month: normalizedLocale === 'zh' ? 'numeric' : 'long',
    day: 'numeric',
  }).format(getPublicPageLastModified(path));
}
