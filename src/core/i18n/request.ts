import { getRequestConfig } from 'next-intl/server';

import {
  adminSurfaceLocaleMessagesPaths,
  authLocaleMessagesPaths,
  certificatePageLocaleMessagesPaths,
  defaultLocale,
  freeToolsPageLocaleMessagesPaths,
  landingPageLocaleMessagesPaths,
  normalizeAppLocale,
  pricingPageLocaleMessagesPaths,
  publicCoreLocaleMessagesPaths,
  requestConfigFallbackLocaleMessagesPaths,
  userWorkbenchLocaleMessagesPaths,
} from '@/config/locale';
import { getPathname } from '@/shared/lib/browser';
import { getPublicConfigs } from '@/shared/models/config';

import { routing } from './config';
import { loadMessages } from './load-messages';

export { loadMessages } from './load-messages';

function normalizeRoutePathname(pathname: string) {
  const cleanedPathname = pathname.split('?')[0]?.trim() || '/';
  const normalizedPathname = cleanedPathname.startsWith('/')
    ? cleanedPathname
    : `/${cleanedPathname}`;
  const parts = normalizedPathname.split('/').filter(Boolean);

  if (parts[0] && normalizeAppLocale(parts[0])) {
    parts.shift();
  }

  return parts.length > 0 ? `/${parts.join('/')}` : '/';
}

export function getLocaleMessagePathsForPathname(pathname: string) {
  const normalizedPathname = normalizeRoutePathname(pathname);

  if (normalizedPathname === '/') {
    return landingPageLocaleMessagesPaths;
  }

  if (
    normalizedPathname === '/admin' ||
    normalizedPathname.startsWith('/admin/')
  ) {
    return adminSurfaceLocaleMessagesPaths;
  }

  if (
    normalizedPathname === '/settings' ||
    normalizedPathname.startsWith('/settings/') ||
    normalizedPathname === '/activity' ||
    normalizedPathname.startsWith('/activity/')
  ) {
    return userWorkbenchLocaleMessagesPaths;
  }

  if (
    normalizedPathname === '/sign-in' ||
    normalizedPathname.startsWith('/sign-in/') ||
    normalizedPathname === '/sign-up' ||
    normalizedPathname.startsWith('/sign-up/') ||
    normalizedPathname === '/forgot-password' ||
    normalizedPathname.startsWith('/forgot-password/') ||
    normalizedPathname === '/reset-password' ||
    normalizedPathname.startsWith('/reset-password/')
  ) {
    return authLocaleMessagesPaths;
  }


  if (
    normalizedPathname === '/certificate' ||
    normalizedPathname.startsWith('/certificate/')
  ) {
    return certificatePageLocaleMessagesPaths;
  }

  if (
    normalizedPathname === '/free-tools' ||
    normalizedPathname.startsWith('/free-tools/')
  ) {
    return freeToolsPageLocaleMessagesPaths;
  }

  if (
    normalizedPathname === '/pricing' ||
    normalizedPathname.startsWith('/pricing/')
  ) {
    return pricingPageLocaleMessagesPaths;
  }

  return publicCoreLocaleMessagesPaths;
}

async function loadScopedMessages(
  locale: string,
  messagePaths: readonly string[]
) {
  const publicConfigs = await getPublicConfigs();
  const allMessages = await Promise.all(
    messagePaths.map((path) => loadMessages(path, locale, publicConfigs))
  );

  const messages: Record<string, unknown> = {};

  messagePaths.forEach((path, index) => {
    const localMessages = allMessages[index];
    const keys = path.split('/');
    let current = messages;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = localMessages;
  });

  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const effectiveLocale =
    normalizeAppLocale(requestedLocale) ?? routing.defaultLocale;
  const pathname = await getPathname();
  const messagePaths = pathname
    ? getLocaleMessagePathsForPathname(pathname)
    : requestConfigFallbackLocaleMessagesPaths;

  try {
    return {
      locale: effectiveLocale,
      messages: await loadScopedMessages(effectiveLocale, messagePaths),
    };
  } catch (error) {
    console.error('[i18n/request] scoped message load failed, falling back', {
      error,
      locale: effectiveLocale,
      pathname,
      messagePaths,
    });
    return {
      locale: defaultLocale,
      messages: await loadScopedMessages(defaultLocale, messagePaths),
    };
  }
});
