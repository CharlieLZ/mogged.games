import { describe, expect, it } from 'vitest';

import {
  getPricingCatalogItem,
  PRICING_CATALOG,
  resolvePricingCatalogAmount,
} from './pricing-catalog';

describe('pricing catalog', () => {
  it('reads one-time package from single source config', () => {
    const item = getPricingCatalogItem('try-onetime');

    expect(item).toBeDefined();
    expect(item?.amount).toBe(1999);
    expect(item?.credits).toBe(500);
  });

  it('falls back to default currency when alternate currency is missing', () => {
    const item = getPricingCatalogItem('pro-monthly');
    expect(item).toBeDefined();

    const resolved = resolvePricingCatalogAmount(item!, 'eur');
    expect(resolved.currency).toBe('USD');
    expect(resolved.amount).toBe(4999);
  });

  it('keeps yearly display credits aligned with the monthly-equivalent offer copy', () => {
    const item = getPricingCatalogItem('pro-yearly');

    expect(item?.credits).toBe(24000);
    expect(item?.displayCredits).toBe(2000);
  });

  it('keeps product ids unique so display and settlement stay one-to-one', () => {
    const ids = PRICING_CATALOG.map((item) => item.productId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
