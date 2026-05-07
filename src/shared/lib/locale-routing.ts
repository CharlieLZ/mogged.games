import { AppLocale } from '@/config/locale';
import { getLocalizedHref } from '@/core/i18n/localized-path';

import { cacheSet } from './cache';

export const PREFERRED_LOCALE_KEY = 'locale';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export function persistLocalePreference(locale: AppLocale) {
  cacheSet(PREFERRED_LOCALE_KEY, locale);

  if (typeof document !== 'undefined') {
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; SameSite=Lax`;
  }
}

export function buildLocaleSwitchHref({
  pathname,
  locale,
  search,
  hash,
}: {
  pathname?: string;
  locale: AppLocale;
  search?: string | Pick<URLSearchParams, 'toString'> | null;
  hash?: string | null;
}) {
  return getLocalizedHref({
    pathname: pathname || '/',
    locale,
    search,
    hash,
  });
}
