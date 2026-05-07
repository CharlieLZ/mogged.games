import { defaultLocale, locales } from '@/config/locale';

type SearchLike =
  | string
  | Pick<URLSearchParams, 'toString'>
  | null
  | undefined;

function isAbsoluteUrl(path: string) {
  return path.startsWith('http://') || path.startsWith('https://');
}

function normalizeInternalPath(path = '/') {
  if (!path || path === '.') {
    return '/';
  }

  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized === '/' ? '/' : normalized.replace(/\/+$/, '');
}

function stripLocalePrefix(path: string) {
  if (path === '/') {
    return path;
  }

  const segments = path.split('/');
  const firstSegment = segments[1];

  if (!firstSegment || !locales.includes(firstSegment as (typeof locales)[number])) {
    return path;
  }

  const remainder = segments.slice(2).join('/');
  return remainder ? `/${remainder}` : '/';
}

export function normalizeLocalizedPath(path = '/') {
  return stripLocalePrefix(normalizeInternalPath(path));
}

export function getLocalizedPath(path: string, locale: string) {
  const normalizedPath = normalizeLocalizedPath(path);

  if (isAbsoluteUrl(normalizedPath)) {
    return normalizedPath;
  }

  if (locale === defaultLocale) {
    return normalizedPath;
  }

  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`;
}

function normalizeSearch(search?: SearchLike) {
  if (!search) {
    return '';
  }

  const searchString = typeof search === 'string' ? search : search.toString();
  if (!searchString) {
    return '';
  }

  return searchString.startsWith('?') ? searchString : `?${searchString}`;
}

function normalizeHash(hash?: string | null) {
  if (!hash) {
    return '';
  }

  return hash.startsWith('#') ? hash : `#${hash}`;
}

export function getDefaultLocaleCanonicalPath(path: string) {
  const normalizedPath = normalizeInternalPath(path);
  const defaultLocalePrefix = `/${defaultLocale}`;

  if (normalizedPath === defaultLocalePrefix) {
    return '/';
  }

  if (normalizedPath.startsWith(`${defaultLocalePrefix}/`)) {
    return normalizedPath.slice(defaultLocalePrefix.length) || '/';
  }

  return null;
}

export function getLocalizedHref({
  pathname = '/',
  locale,
  search,
  hash,
}: {
  pathname?: string;
  locale: string;
  search?: SearchLike;
  hash?: string | null;
}) {
  const localizedPath = getLocalizedPath(pathname, locale);

  if (isAbsoluteUrl(localizedPath)) {
    return localizedPath;
  }

  return `${localizedPath}${normalizeSearch(search)}${normalizeHash(hash)}`;
}
