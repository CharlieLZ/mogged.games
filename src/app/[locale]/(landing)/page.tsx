import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  getLocaleBcp47,
  publicSiteLocales,
  resolveAppLocale,
} from '@/config/locale';
import { loadMessages } from '@/core/i18n/load-messages';
import { getPublicPageLastModified } from '@/config/website/public-page-metadata';
import {
  DEFAULT_PUBLIC_SEO_IMAGE,
  getAppDomain,
  getAppName,
  getAppUrl,
  getSupportEmail,
} from '@/shared/lib/brand';
import { getFaqSchemaQuestions } from '@/shared/lib/faq';
import { buildLandingPageContent } from '@/shared/lib/landing-page-content';
import { getFAQPageSchema } from '@/shared/lib/schema';
import { getLocalizedUrl, getMetadata } from '@/shared/lib/seo';
import { SITE_LOGO_PATH } from '@/shared/lib/site-icons';
import Page from '@/themes/default/pages/landing';

export const generateMetadata = getMetadata({
  metadataKey: 'landing.metadata',
  canonicalUrl: '/',
  imageUrl: DEFAULT_PUBLIC_SEO_IMAGE,
});

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveAppLocale(rawLocale);
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const { metadata, seoSections, page } = buildLandingPageContent({
    locale,
    t,
  });
  const commonMessages = await loadMessages('common', locale);

  const siteName = getAppName();
  const siteUrl = getAppUrl();
  const siteDomain = getAppDomain();
  const canonicalUrl = getLocalizedUrl('/', locale);
  const supportEmail = getSupportEmail();
  const homepageLastModified = getPublicPageLastModified('/');
  const keywordList =
    metadata?.keywords ||
    `mogged, mog battle, face rating, 1v1 mog, mogging, ELO ranking, looksmaxxing, ${siteDomain}`;
  const pageDescription =
    metadata?.description ||
    `${siteName} is the 1v1 face rating arena on ${siteDomain}. Jump into mog battles, earn ELO, and climb the leaderboard from Molecule to Slayer.`;
  const languageTag = getLocaleBcp47(locale);
  const websiteId = `${siteUrl}/#website`;
  const webpageId = `${canonicalUrl}#webpage`;
  const organizationId = `${siteUrl}/#organization`;
  const appId = `${siteUrl}/#workspace-app`;
  const heroImageUrl = DEFAULT_PUBLIC_SEO_IMAGE.startsWith('http')
    ? DEFAULT_PUBLIC_SEO_IMAGE
    : `${siteUrl}${DEFAULT_PUBLIC_SEO_IMAGE}`;
  const faqItems = getFaqSchemaQuestions(page.faq, {
    groupIndexes: [0, 1],
    maxItems: 5,
  });
  const faqSchema =
    faqItems.length > 0
      ? getFAQPageSchema({
          questions: faqItems,
        })
      : null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: siteName,
        alternateName: seoSections.structured_data.alternate_names,
        url: siteUrl,
        inLanguage: languageTag,
        description: pageDescription,
        about: seoSections.structured_data.about,
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'WebPage',
        '@id': webpageId,
        name: metadata?.title || siteName,
        url: canonicalUrl,
        headline: metadata?.title || siteName,
        description: pageDescription,
        keywords: keywordList,
        inLanguage: languageTag,
        dateModified: homepageLastModified.toISOString(),
        isPartOf: { '@id': websiteId },
        isAccessibleForFree: true,
        mainEntity: { '@id': appId },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: heroImageUrl,
        },
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}${SITE_LOGO_PATH}`,
        image: heroImageUrl,
        description: pageDescription,
        email: supportEmail,
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: supportEmail,
            availableLanguage: [...publicSiteLocales],
          },
        ],
      },
      {
        '@type': 'WebApplication',
        '@id': appId,
        name: siteName,
        url: canonicalUrl,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Any',
        description: pageDescription,
        publisher: { '@id': organizationId },
        featureList: seoSections.structured_data.feature_list,
      },
    ],
  };

  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Page
        locale={locale}
        page={page}
        imageWorkspaceMessages={{
          common: commonMessages,
        }}
      />
    </>
  );
}
