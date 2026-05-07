'use client';

import { useEffect, useState } from 'react';

import { defaultLocale, resolveAppLocale, type AppLocale } from '@/config/locale';

import { getCommonCopy } from '@/shared/lib/common-copy';

function detectRuntimeLocale(): AppLocale {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return resolveAppLocale(document.documentElement.lang);
  }

  if (typeof window !== 'undefined') {
    const pathLocale = window.location.pathname.split('/').filter(Boolean)[0];
    return resolveAppLocale(pathLocale);
  }

  return defaultLocale;
}

export function useClientCommonCopy() {
  const [locale, setLocale] = useState<AppLocale>(defaultLocale);

  useEffect(() => {
    setLocale(detectRuntimeLocale());
  }, []);

  return {
    locale,
    copy: getCommonCopy(locale),
  };
}
