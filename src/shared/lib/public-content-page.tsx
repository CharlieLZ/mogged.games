import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  defaultLocale,
  getLocaleOpenGraph,
  publicSiteLocales,
  resolveAppLocale,
} from '@/config/locale';
import {
  getPublicPageLastModified,
  isNoIndexPublicPagePath,
} from '@/config/website/public-page-metadata';
import {
  DEFAULT_PUBLIC_SEO_IMAGE,
  getAppName,
  getAppUrl,
  replaceBrandTokens,
} from '@/shared/lib/brand';
import { getWebPageSchema } from '@/shared/lib/schema';
import {
  buildRobotsMetadata,
  buildTwitterImages,
  getLocalizedAlternates,
  getOpenGraphAlternateLocales,
  getLocalizedPath,
  getLocalizedUrl,
} from '@/shared/lib/seo';
import { getLocalPage } from '@/shared/models/content';
import Page from '@/themes/default/pages/page-detail';

const FALLBACK_PAGE_IMAGE = DEFAULT_PUBLIC_SEO_IMAGE;
const ABOUT_PAGE_SLUGS = new Set(['mission']);

function getPublicContentPageTitle(pageTitle: string, siteName: string) {
  const normalizedTitle = pageTitle.trim();
  const normalizedSiteName = siteName.trim();

  if (!normalizedTitle) {
    return normalizedSiteName;
  }

  return normalizedTitle
    .toLowerCase()
    .includes(normalizedSiteName.toLowerCase())
    ? normalizedTitle
    : `${normalizedTitle} | ${normalizedSiteName}`;
}

function getPublicContentSchemaType(contentSlug: string) {
  return ABOUT_PAGE_SLUGS.has(contentSlug) ? 'AboutPage' : 'WebPage';
}

function getPublicContentImageUrl(image: string) {
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  return `${getAppUrl()}${image.startsWith('/') ? image : `/${image}`}`;
}

export async function buildPublicContentMetadata({
  locale,
  contentSlug,
  publicPath,
}: {
  locale: string;
  contentSlug: string;
  publicPath: string;
}): Promise<Metadata> {
  const normalizedLocale = resolveAppLocale(locale);
  const canonicalLocale = publicSiteLocales.includes(normalizedLocale)
    ? normalizedLocale
    : defaultLocale;
  const t = await getTranslations('common.metadata');
  const alternates = getLocalizedAlternates(publicPath);
  const canonicalUrl = getLocalizedUrl(publicPath, canonicalLocale);
  const siteName = getAppName();
  const fallbackTitle = `${contentSlug} | ${replaceBrandTokens(t('title'))}`;
  const keywords = replaceBrandTokens(t('keywords'));
  const metadataBase = new URL(getAppUrl());

  const page = await getLocalPage({
    slug: contentSlug,
    locale: normalizedLocale,
  });
  if (!page) {
    notFound();
  }

  const pageTitle = getPublicContentPageTitle(
    replaceBrandTokens(page.seo_title || page.title),
    siteName
  );
  const pageDescription = replaceBrandTokens(page.description);
  const pageKeywords = replaceBrandTokens(page.keywords || keywords);
  const pageImage = page.image || FALLBACK_PAGE_IMAGE;
  const pageImageUrl = getPublicContentImageUrl(pageImage);
  const pageSocialImage = {
    url: pageImageUrl,
    alt: `${page.title || fallbackTitle} social share card`,
  };

  return {
    metadataBase,
    title: pageTitle,
    description: pageDescription,
    keywords: pageKeywords,
    alternates: {
      canonical: canonicalUrl,
      languages: alternates.languages,
    },
    openGraph: {
      type: 'website',
      locale: getLocaleOpenGraph(canonicalLocale),
      alternateLocale: getOpenGraphAlternateLocales(canonicalLocale),
      url: canonicalUrl,
      title: pageTitle,
      description: pageDescription,
      siteName,
      images: [pageSocialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: buildTwitterImages([pageSocialImage]),
    },
    robots: buildRobotsMetadata(isNoIndexPublicPagePath(publicPath)),
  };
}

export async function renderPublicContentPage({
  locale,
  contentSlug,
  publicPath,
}: {
  locale: string;
  contentSlug: string;
  publicPath: string;
}) {
  const page = await getLocalPage({ slug: contentSlug, locale });
  if (!page) {
    return notFound();
  }

  const localizedPath = getLocalizedPath(publicPath, locale);
  const lastModified = getPublicPageLastModified(publicPath).toISOString();
  const pageSchema = getWebPageSchema({
    type: getPublicContentSchemaType(contentSlug),
    name: replaceBrandTokens(page.title || ''),
    description: replaceBrandTokens(page.description || ''),
    image: page.image || FALLBACK_PAGE_IMAGE,
    datePublished: page.created_at_iso || lastModified,
    dateModified: page.updated_at_iso || page.created_at_iso || lastModified,
    url: localizedPath,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <Page locale={locale} page={page} />
    </>
  );
}
