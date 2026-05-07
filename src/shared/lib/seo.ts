import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  getLocalizedPath as buildLocalizedPath,
  normalizeLocalizedPath,
} from '@/core/i18n/localized-path';
import {
  defaultLocale,
  getLocaleOpenGraph,
  publicSiteLocales,
  resolveAppLocale,
} from '@/config/locale';
import { isNoIndexPublicPagePath } from '@/config/website/public-page-metadata';
import { getAppName, getAppUrl, replaceBrandTokens } from '@/shared/lib/brand';
import {
  SITE_DEFAULT_SHARE_IMAGE_HEIGHT,
  SITE_DEFAULT_SHARE_IMAGE_PATH,
  SITE_DEFAULT_SHARE_IMAGE_WIDTH,
} from '@/shared/lib/seo-assets';
import { SITE_MANIFEST_PATH } from '@/shared/lib/site-icons';

type MetadataContent = {
  title: string;
  description: string;
  keywords: string;
};

type SocialImage = {
  url: string;
  width?: number;
  height?: number;
  alt: string;
};

export function getLocalizedPath(path: string, locale: string) {
  return buildLocalizedPath(path, locale);
}

export function getLocalizedUrl(path: string, locale: string) {
  const effectiveLocale = resolveAppLocale(locale);
  const localizedPath = getLocalizedPath(path, effectiveLocale);

  if (
    localizedPath.startsWith('http://') ||
    localizedPath.startsWith('https://')
  ) {
    return localizedPath;
  }

  const appUrl = getAppUrl();

  if (localizedPath === '/') {
    return appUrl;
  }

  return `${appUrl}${localizedPath}`;
}

export function getLocalizedAlternates(
  path: string,
  availableLocales = publicSiteLocales
): {
  languages: Record<string, string>;
} {
  const canonicalPath = normalizeLocalizedPath(path);
  const languages: Record<string, string> = Object.fromEntries(
    availableLocales.map((locale) => [
      locale,
      getLocalizedUrl(canonicalPath, locale),
    ])
  );

  return {
    languages: {
      ...languages,
      'x-default': getLocalizedUrl(canonicalPath, defaultLocale),
    },
  };
}

export function getOpenGraphAlternateLocales(
  locale: string,
  availableLocales = publicSiteLocales
) {
  const normalizedLocale = resolveAppLocale(locale);

  return availableLocales
    .map((candidateLocale) => resolveAppLocale(candidateLocale))
    .filter((candidateLocale) => candidateLocale !== normalizedLocale)
    .map((candidateLocale) => getLocaleOpenGraph(candidateLocale));
}

export function buildRobotsMetadata(
  noIndex = false
): NonNullable<Metadata['robots']> {
  if (noIndex) {
    return {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

export function buildTwitterImages(images: SocialImage[]) {
  return images.map((image) => ({
    url: image.url,
    alt: image.alt,
    width: image.width,
    height: image.height,
  }));
}

// get metadata for page component
export function getMetadata(
  options: {
    title?: string;
    description?: string;
    keywords?: string;
    metadataKey?: string;
    canonicalUrl?: string; // relative path or full url
    imageUrl?: string;
    appName?: string;
    noIndex?: boolean;
  } = {}
) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale: rawLocale } = await params;
    const locale = resolveAppLocale(rawLocale);
    const canonicalLocale = publicSiteLocales.includes(locale)
      ? locale
      : defaultLocale;
    setRequestLocale(locale);

    // passed metadata
    const passedMetadata = {
      title: replaceBrandTokens(options.title),
      description: replaceBrandTokens(options.description),
      keywords: replaceBrandTokens(options.keywords),
    };

    // default metadata
    const defaultMetadata = await getTranslatedMetadata(
      defaultMetadataKey,
      locale
    );

    // translated metadata
    const translatedMetadata: Partial<MetadataContent> = options.metadataKey
      ? await getTranslatedMetadata(options.metadataKey, locale)
      : {};
    const resolvedNoIndex =
      options.noIndex ||
      (options.canonicalUrl
        ? isNoIndexPublicPagePath(options.canonicalUrl)
        : false);

    // canonical url
    const canonicalUrl = getLocalizedUrl(
      options.canonicalUrl || '/',
      canonicalLocale
    );
    const alternates = {
      canonical: canonicalUrl,
      languages: getLocalizedAlternates(options.canonicalUrl || '/').languages,
    };

    const title =
      passedMetadata.title ||
      replaceBrandTokens(translatedMetadata.title) ||
      replaceBrandTokens(defaultMetadata.title);
    const description =
      passedMetadata.description ||
      replaceBrandTokens(translatedMetadata.description) ||
      replaceBrandTokens(defaultMetadata.description);
    const keywords =
      passedMetadata.keywords ||
      replaceBrandTokens(translatedMetadata.keywords) ||
      replaceBrandTokens(defaultMetadata.keywords);

    // image url
    const appUrl = getAppUrl();
    const imagePath = options.imageUrl || SITE_DEFAULT_SHARE_IMAGE_PATH;
    const imageUrl = imagePath.startsWith('http')
      ? imagePath
      : `${appUrl}${imagePath}`;
    const socialImage = {
      url: imageUrl.toString(),
      width: SITE_DEFAULT_SHARE_IMAGE_WIDTH,
      height: SITE_DEFAULT_SHARE_IMAGE_HEIGHT,
      alt: `${title} social share card`,
    } satisfies SocialImage;

    // app name
    const appName = options.appName || getAppName();

    const metadataBase = new URL(appUrl);

    return {
      metadataBase,
      applicationName: appName,
      appleWebApp: {
        capable: true,
        title: appName,
      },
      manifest: SITE_MANIFEST_PATH,
      title:
        passedMetadata.title ||
        replaceBrandTokens(translatedMetadata.title) ||
        replaceBrandTokens(defaultMetadata.title),
      description:
        passedMetadata.description ||
        replaceBrandTokens(translatedMetadata.description) ||
        replaceBrandTokens(defaultMetadata.description),
      keywords,
      alternates,

      openGraph: {
        type: 'website',
        locale: getLocaleOpenGraph(canonicalLocale),
        alternateLocale: getOpenGraphAlternateLocales(canonicalLocale),
        url: canonicalUrl,
        title,
        description,
        siteName: appName,
        images: [socialImage],
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: buildTwitterImages([socialImage]),
      },

      robots: buildRobotsMetadata(resolvedNoIndex),
    };
  };
}

const defaultMetadataKey = 'common.metadata';

async function getTranslatedMetadata(metadataKey: string, locale: string) {
  const effectiveLocale = resolveAppLocale(locale);
  setRequestLocale(effectiveLocale);
  const t = await getTranslations(metadataKey);

  return {
    title: t.has('title') ? replaceBrandTokens(t('title')) : '',
    description: t.has('description')
      ? replaceBrandTokens(t('description'))
      : '',
    keywords: t.has('keywords') ? (() => {
      const val = t('keywords');
      return replaceBrandTokens(Array.isArray(val) ? val.join(', ') : val);
    })() : '',
  };
}
