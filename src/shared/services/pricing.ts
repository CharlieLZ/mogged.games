import 'server-only';

import { getTranslations } from 'next-intl/server';

import { replaceBrandTokensDeep } from '@/shared/lib/brand';
import {
  findPricingItemByProductId,
  getPricingItemDisplayName,
  mergePricingWithCatalog,
  type PricingCopy,
} from '@/shared/lib/pricing';

export async function getLocalizedPricing(locale: string) {
  const t = await getTranslations({
    locale,
    namespace: 'pricing',
  });

  const pricingCopy = replaceBrandTokensDeep(t.raw('pricing')) as PricingCopy;
  return mergePricingWithCatalog(pricingCopy, { locale });
}

export async function getLocalizedPricingItem({
  locale,
  productId,
}: {
  locale: string;
  productId: string;
}) {
  const pricing = await getLocalizedPricing(locale);
  return findPricingItemByProductId(pricing, productId);
}

export async function getLocalizedPricingDisplayName({
  locale,
  productId,
  fallback = '',
}: {
  locale: string;
  productId?: string | null;
  fallback?: string;
}) {
  if (!productId) {
    return fallback;
  }

  const pricingItem = await getLocalizedPricingItem({
    locale,
    productId,
  });

  return getPricingItemDisplayName(pricingItem, fallback);
}
