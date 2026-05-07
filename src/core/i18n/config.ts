import { defineRouting } from 'next-intl/routing';

import {
  defaultLocale,
  localeDetection,
  localePrefix,
  locales,
} from '@/config/locale';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
  localeDetection,
  // Keep locale preference client-managed so public pages can stay cacheable.
  localeCookie: false,
});
