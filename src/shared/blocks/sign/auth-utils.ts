import { defaultLocale } from '@/config/locale';
import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';

const AUTH_CALLBACK_BLOCKLIST = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
] as const;
const LOCALE_PREFIX_PATTERN = /^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/;

function normalizeAuthPathname(pathname: string) {
  const normalizedPath = pathname.replace(LOCALE_PREFIX_PATTERN, '');
  return normalizedPath || '/';
}

function hasLocalePrefix(path: string) {
  return LOCALE_PREFIX_PATTERN.test(path);
}

function isBlockedAuthCallbackPath(path: string) {
  const pathname = path.split('?')[0]?.split('#')[0] || '/';
  const normalizedPathname = normalizeAuthPathname(pathname);

  return (
    AUTH_CALLBACK_BLOCKLIST.some(
      (blockedPath) =>
        normalizedPathname === blockedPath ||
        normalizedPathname.startsWith(`${blockedPath}/`)
    ) || normalizedPathname.startsWith('/api/auth')
  );
}

function toRelativeAuthPath(path: string) {
  const normalizedPath = path.trim();

  if (!normalizedPath || normalizedPath.startsWith('//')) {
    return null;
  }

  if (normalizedPath.startsWith('/')) {
    return normalizedPath;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const url = new URL(normalizedPath, window.location.origin);

    if (url.origin !== window.location.origin) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function isGoogleAuthReady(configs: Record<string, string>) {
  return (
    configs.google_auth_enabled === 'true' && Boolean(configs.google_client_id)
    // 客户端不需要拿到 secret，是否存在由服务端校验
  );
}

export function isGithubAuthReady(configs: Record<string, string>) {
  return (
    configs.github_auth_enabled === 'true' && Boolean(configs.github_client_id)
  );
}

export function getAuthAvailability(configs: Record<string, string>) {
  const googleEnabled = isGoogleAuthReady(configs);
  const githubEnabled = isGithubAuthReady(configs);
  const emailEnabled =
    configs.email_auth_enabled !== 'false' ||
    (!googleEnabled && !githubEnabled);
  const magicLinkEnabled =
    emailEnabled && configs.email_delivery_enabled !== 'false';

  return {
    googleEnabled,
    githubEnabled,
    emailEnabled,
    magicLinkEnabled,
  };
}

export function localizeRelativeAuthPath(
  path: string,
  locale: string,
  fallback = DEFAULT_AUTH_CALLBACK
) {
  const normalizedPath = toRelativeAuthPath(path);

  if (!normalizedPath || isBlockedAuthCallbackPath(normalizedPath)) {
    return fallback;
  }

  if (
    locale === defaultLocale ||
    normalizedPath.startsWith(`/${locale}`) ||
    hasLocalePrefix(normalizedPath)
  ) {
    return normalizedPath;
  }

  return `/${locale}${normalizedPath}`;
}

export function appendCallbackUrlToAuthPath(
  path: string,
  callbackUrl?: string | null
) {
  const normalizedPath = path.trim();
  const normalizedCallbackUrl = callbackUrl?.trim();

  if (
    !normalizedPath ||
    !normalizedCallbackUrl ||
    !normalizedPath.startsWith('/')
  ) {
    return normalizedPath;
  }

  try {
    const url = new URL(normalizedPath, 'https://mogged.games');
    url.searchParams.set(
      'callbackUrl',
      toRelativeAuthPath(normalizedCallbackUrl) ?? DEFAULT_AUTH_CALLBACK
    );
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return normalizedPath;
  }
}
