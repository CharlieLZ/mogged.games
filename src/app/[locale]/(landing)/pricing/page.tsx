import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getPublicPageLastModified } from '@/config/website/public-page-metadata';
import {
  DEFAULT_PUBLIC_SEO_IMAGE,
  getAppName,
  replaceBrandTokensDeep,
} from '@/shared/lib/brand';
import { getFaqSchemaQuestions } from '@/shared/lib/faq';
import { getFAQPageSchema, getWebApplicationSchema } from '@/shared/lib/schema';
import { getLocalizedUrl, getMetadata } from '@/shared/lib/seo';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/services/current-user';
import { getLocalizedPricing } from '@/shared/services/pricing';
import { PricingPageCopy } from '@/shared/types/blocks/pricing';
import Page from '@/themes/default/pages/pricing';

export const generateMetadata = getMetadata({
  metadataKey: 'pricing.metadata',
  canonicalUrl: '/pricing',
});

type PricingSeoSections = {
  schema: {
    webpage_name: string;
    webpage_description: string;
  };
};

function formatSchemaPrice(amount: number) {
  return (amount / 100)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pricing');
  const pricingLastModified = getPublicPageLastModified('/pricing');
  const pricingUrl = getLocalizedUrl('/pricing', locale);

  let currentSubscription;
  try {
    const user = await getUserInfo();
    if (user) {
      currentSubscription = await getCurrentSubscription(user.id);
    }
  } catch (error) {
    console.warn('[pricing/page] failed to load current subscription', error);
  }

  const pricing = await getLocalizedPricing(locale);
  const pricingPageCopy = replaceBrandTokensDeep(
    t.raw('page')
  ) as PricingPageCopy;
  const pricingFaq = replaceBrandTokensDeep(t.raw('faq'));
  const seoSections = replaceBrandTokensDeep(
    t.raw('seo_sections')
  ) as PricingSeoSections;

  const faqItems = getFaqSchemaQuestions(pricingFaq, {
    maxItems: 5,
  });
  const faqSchema =
    faqItems.length > 0
      ? getFAQPageSchema({
          questions: faqItems,
        })
      : null;
  const pricingOffers = (pricing.items || [])
    .filter(
      (item) =>
        typeof item.amount === 'number' &&
        Number.isFinite(item.amount) &&
        Boolean(item.currency)
    )
    .map((item) => ({
      name: item.title,
      price: formatSchemaPrice(item.amount),
      priceCurrency: item.currency.toUpperCase(),
      url: `${pricingUrl}#pricing`,
      category: item.group || item.interval,
    }));
  const pricingPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seoSections.schema.webpage_name,
    url: pricingUrl,
    dateModified: pricingLastModified.toISOString(),
    description: seoSections.schema.webpage_description,
    image: DEFAULT_PUBLIC_SEO_IMAGE,
  };
  const pricingApplicationSchema = getWebApplicationSchema({
    name: getAppName(),
    description: seoSections.schema.webpage_description,
    url: pricingUrl,
    screenshot: DEFAULT_PUBLIC_SEO_IMAGE,
    ...(pricingOffers.length > 0 ? { offers: pricingOffers } : {}),
  });

  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pricingApplicationSchema),
        }}
      />
      <Page
        locale={locale}
        pricing={pricing}
        pricingPageCopy={pricingPageCopy}
        currentSubscription={currentSubscription}
        faq={pricingFaq}
      />
    </>
  );
}
