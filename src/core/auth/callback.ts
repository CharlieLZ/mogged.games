import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';

const AUTH_PAGE_PATHS: ReadonlySet<string> = new Set([
  '/sign-in',
  '/sign-up',
]);
const LOCALE_PREFIX_PATTERN = /^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/;

function normalizeAuthPath(pathname: string) {
  const normalizedPath = pathname.replace(LOCALE_PREFIX_PATTERN, '');
  return normalizedPath || '/';
}

export function getCurrentAuthCallback(fallback = DEFAULT_AUTH_CALLBACK) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const pathname = window.location.pathname || '/';
  const search = window.location.search || '';
  const normalizedPath = normalizeAuthPath(pathname);

  if (
    AUTH_PAGE_PATHS.has(normalizedPath) ||
    normalizedPath.startsWith('/api/auth')
  ) {
    return fallback;
  }

  return `${pathname}${search}` || fallback;
}

export function resolveClientAuthCallback(
  callbackUrl?: string,
  fallback = DEFAULT_AUTH_CALLBACK
) {
  const trimmedCallbackUrl = callbackUrl?.trim();
  return trimmedCallbackUrl || getCurrentAuthCallback(fallback);
}
