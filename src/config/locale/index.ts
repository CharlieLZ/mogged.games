import { envConfigs } from '..';

// 多语言路由：默认英语无前缀，其他语言有前缀（如 /zh/pricing）
export const locales = [
  'en',
  'zh',
  'de',
  'fr',
  'es',
  'ja',
  'it',
  'ko',
  'ar',
] as const;

export type AppLocale = (typeof locales)[number];

export type LocaleRolloutStage = 'live' | 'planned' | 'backlog';

type LocaleDefinition = {
  englishName: string;
  nativeName: string;
  bcp47: string;
  openGraphLocale: string;
  dayjsLocale: string;
  rtl: boolean;
  publicSite: LocaleRolloutStage;
  userWorkbench: LocaleRolloutStage;
  adminWorkbench: LocaleRolloutStage;
};

const DEFAULT_APP_LOCALE: AppLocale = 'en';

export const localeCatalog = {
  en: {
    englishName: 'English',
    nativeName: 'English',
    bcp47: 'en-US',
    openGraphLocale: 'en_US',
    dayjsLocale: 'en',
    rtl: false,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'live',
  },
  zh: {
    englishName: 'Chinese',
    nativeName: '中文',
    bcp47: 'zh-CN',
    openGraphLocale: 'zh_CN',
    dayjsLocale: 'zh-cn',
    rtl: false,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'live',
  },
  de: {
    englishName: 'German',
    nativeName: 'Deutsch',
    bcp47: 'de-DE',
    openGraphLocale: 'de_DE',
    dayjsLocale: 'de',
    rtl: false,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'planned',
  },
  fr: {
    englishName: 'French',
    nativeName: 'Français',
    bcp47: 'fr-FR',
    openGraphLocale: 'fr_FR',
    dayjsLocale: 'fr',
    rtl: false,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'planned',
  },
  es: {
    englishName: 'Spanish',
    nativeName: 'Español',
    bcp47: 'es-ES',
    openGraphLocale: 'es_ES',
    dayjsLocale: 'es',
    rtl: false,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'planned',
  },
  ja: {
    englishName: 'Japanese',
    nativeName: '日本語',
    bcp47: 'ja-JP',
    openGraphLocale: 'ja_JP',
    dayjsLocale: 'ja',
    rtl: false,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'planned',
  },
  it: {
    englishName: 'Italian',
    nativeName: 'Italiano',
    bcp47: 'it-IT',
    openGraphLocale: 'it_IT',
    dayjsLocale: 'it',
    rtl: false,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'planned',
  },
  ko: {
    englishName: 'Korean',
    nativeName: '한국어',
    bcp47: 'ko-KR',
    openGraphLocale: 'ko_KR',
    dayjsLocale: 'ko',
    rtl: false,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'planned',
  },
  ar: {
    englishName: 'Arabic',
    nativeName: 'العربية',
    bcp47: 'ar',
    openGraphLocale: 'ar_AR',
    dayjsLocale: 'ar',
    rtl: true,
    publicSite: 'live',
    userWorkbench: 'live',
    adminWorkbench: 'backlog',
  },
} as const satisfies Record<AppLocale, LocaleDefinition>;

export const localeNames: Record<AppLocale, string> = Object.fromEntries(
  locales.map((locale) => [locale, localeCatalog[locale].nativeName])
) as Record<AppLocale, string>;

function getLocalesByRollout(
  surface: 'publicSite' | 'userWorkbench' | 'adminWorkbench',
  stage: LocaleRolloutStage
) {
  return locales.filter((locale) => localeCatalog[locale][surface] === stage);
}

export const publicSiteLocales = getLocalesByRollout('publicSite', 'live');

export const plannedPublicSiteLocales = getLocalesByRollout(
  'publicSite',
  'planned'
);

export const backlogPublicSiteLocales = getLocalesByRollout(
  'publicSite',
  'backlog'
);

export const userWorkbenchLocales = getLocalesByRollout(
  'userWorkbench',
  'live'
);

export const plannedUserWorkbenchLocales = getLocalesByRollout(
  'userWorkbench',
  'planned'
);

export const backlogUserWorkbenchLocales = getLocalesByRollout(
  'userWorkbench',
  'backlog'
);

export const adminWorkbenchLocales = getLocalesByRollout(
  'adminWorkbench',
  'live'
);

export const plannedAdminWorkbenchLocales = getLocalesByRollout(
  'adminWorkbench',
  'planned'
);

export const backlogAdminWorkbenchLocales = getLocalesByRollout(
  'adminWorkbench',
  'backlog'
);

export const localeSelectorLocales = [...publicSiteLocales];

export const rtlLocales = locales.filter(
  (locale) => localeCatalog[locale].rtl
) as AppLocale[];

export function isSupportedLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

export function normalizeAppLocale(value?: string | null): AppLocale | null {
  const normalized = value?.trim().toLowerCase().replace(/_/g, '-');

  if (!normalized) {
    return null;
  }

  for (const locale of locales) {
    if (normalized === locale || normalized.startsWith(`${locale}-`)) {
      return locale;
    }
  }

  return null;
}

export function normalizeLocale(value?: string | null): AppLocale | undefined {
  return normalizeAppLocale(value) ?? undefined;
}

export function resolveAppLocale(
  value?: string | null,
  fallback: AppLocale = DEFAULT_APP_LOCALE
): AppLocale {
  return normalizeAppLocale(value) ?? fallback;
}

export function getLocaleDefinition(locale?: string | null) {
  return localeCatalog[resolveAppLocale(locale)];
}

export function getLocaleBcp47(locale?: string | null) {
  return getLocaleDefinition(locale).bcp47;
}

export function getLocaleTag(locale?: string | null) {
  return getLocaleBcp47(locale);
}

export function getLocaleOpenGraph(locale?: string | null) {
  return getLocaleDefinition(locale).openGraphLocale;
}

export function getLocaleOpenGraphLocale(locale?: string | null) {
  return getLocaleOpenGraph(locale);
}

export function getLocaleDayjsCode(locale?: string | null) {
  return getLocaleDefinition(locale).dayjsLocale;
}

export function getDayjsLocale(locale?: string | null) {
  return getLocaleDayjsCode(locale);
}

export function getLocaleDisplayName(locale?: string | null) {
  return getLocaleDefinition(locale).nativeName;
}

export function getLocaleDirection(locale?: string | null) {
  return getLocaleDefinition(locale).rtl ? 'rtl' : 'ltr';
}

export function isRtlLocale(locale?: string | null) {
  return getLocaleDefinition(locale).rtl;
}

export function getDocumentLocaleAttributes(locale?: string | null) {
  const resolvedLocale = resolveAppLocale(locale);

  return {
    locale: resolvedLocale,
    dir: getLocaleDirection(resolvedLocale),
  } as const;
}

export function getStaticLocaleParams() {
  // Next.js 16 dev can corrupt `.next/dev/prerender-manifest.json` when
  // app routes concurrently regenerate dynamic params. Keep dev fully
  // request-driven and only emit locale prerender params for real builds.
  if (process.env.NODE_ENV === 'development') {
    return [];
  }

  return publicSiteLocales.map((locale) => ({ locale }));
}

export const defaultLocale: AppLocale = resolveAppLocale(
  envConfigs.locale,
  DEFAULT_APP_LOCALE
);

export const localePrefix = 'as-needed';

export const localeDetection = false;

export const localeMessagesPaths = [
  'common',
  'landing',
  'pricing',
  'certificate',
  'settings/sidebar',
  'settings/profile',
  'settings/security',
  'settings/billing',
  'settings/payments',
  'settings/credits',
  'admin/apikeys',
  'admin/sidebar',
  'admin/users',
  'admin/roles',
  'admin/permissions',
  'admin/dashboard',
  'admin/daily',
  'admin/weekly',
  'admin/monthly',
  'admin/payments',
  'admin/subscriptions',
  'admin/credits',
  'admin/settings',
  'admin/aitasks',
  'ai/video',
  'ai/image',
  'activity/sidebar',
  'activity/aitasks',
  'activity/notifications',
];

function uniqueLocaleMessagePaths(paths: readonly string[]) {
  return [...new Set(paths)] as readonly string[];
}

export const publicLocaleMessagesPaths = [
  'common',
  'landing',
  'pricing',
  'certificate',
  'ai/video',
] as const;

export const authLocaleMessagesPaths = uniqueLocaleMessagePaths([
  'common',
  'settings/security',
]);

export const publicCoreLocaleMessagesPaths = uniqueLocaleMessagePaths([
  'common',
  'landing',
]);

export const publicPageLocaleMessagesPaths = uniqueLocaleMessagePaths([
  ...publicCoreLocaleMessagesPaths,
  ...publicLocaleMessagesPaths,
  'settings/sidebar',
]);

export const landingPageLocaleMessagesPaths = uniqueLocaleMessagePaths([
  ...publicCoreLocaleMessagesPaths,
  'ai/image',
]);

export const videoGeneratorPageLocaleMessagesPaths = uniqueLocaleMessagePaths([
  ...publicCoreLocaleMessagesPaths,
  'ai/video',
]);

export const imageGeneratorPageLocaleMessagesPaths = uniqueLocaleMessagePaths([
  ...publicCoreLocaleMessagesPaths,
  'ai/image',
]);

export const pricingPageLocaleMessagesPaths = uniqueLocaleMessagePaths([
  ...publicCoreLocaleMessagesPaths,
  'pricing',
]);

export const freeToolsPageLocaleMessagesPaths = uniqueLocaleMessagePaths([
  ...publicCoreLocaleMessagesPaths,
]);

export const certificatePageLocaleMessagesPaths = uniqueLocaleMessagePaths([
  ...publicCoreLocaleMessagesPaths,
  'certificate',
  'settings/sidebar',
]);

export const userWorkbenchLocaleMessagesPaths = [
  'common',
  'landing',
  'ai/video',
  'activity/sidebar',
  'activity/aitasks',
  'activity/notifications',
  'settings/sidebar',
  'settings/profile',
  'settings/security',
  'settings/billing',
  'settings/payments',
  'settings/credits',
] as const;

export const adminWorkbenchLocaleMessagesPaths = [
  'admin/apikeys',
  'admin/sidebar',
  'admin/users',
  'admin/roles',
  'admin/permissions',
  'admin/dashboard',
  'admin/daily',
  'admin/weekly',
  'admin/monthly',
  'admin/payments',
  'admin/subscriptions',
  'admin/credits',
  'admin/settings',
  'admin/aitasks',
  'settings/credits',
] as const;

export const adminSurfaceLocaleMessagesPaths = uniqueLocaleMessagePaths([
  'common',
  'landing',
  ...adminWorkbenchLocaleMessagesPaths,
]);

export const requestConfigFallbackLocaleMessagesPaths =
  uniqueLocaleMessagePaths(localeMessagesPaths);
