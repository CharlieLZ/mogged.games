import { describe, expect, it } from 'vitest';

import arPricingMessages from '@/config/locale/messages/ar/pricing.json';
import dePricingMessages from '@/config/locale/messages/de/pricing.json';
import enPricingMessages from '@/config/locale/messages/en/pricing.json';
import esPricingMessages from '@/config/locale/messages/es/pricing.json';
import frPricingMessages from '@/config/locale/messages/fr/pricing.json';
import itPricingMessages from '@/config/locale/messages/it/pricing.json';
import jaPricingMessages from '@/config/locale/messages/ja/pricing.json';
import koPricingMessages from '@/config/locale/messages/ko/pricing.json';
import zhPricingMessages from '@/config/locale/messages/zh/pricing.json';
import { getPricingCatalogItem } from '@/config/website/pricing-catalog';
import type { PricingItem } from '@/shared/types/blocks/pricing';

import {
  findPricingItemByProductId,
  formatPricingMoney,
  getInitialPricingCurrency,
  getPricingItemDisplayName,
  mergePricingItemWithCatalog,
  mergePricingWithCatalog,
  resolvePricingItemCurrency,
  type PricingCopy,
} from './pricing';

describe('pricing merge', () => {
  it('hydrates machine fields from the pricing catalog', () => {
    const mergedItem = mergePricingItemWithCatalog({
      product_id: 'pro-onetime',
      title: 'Pro',
      description: 'Pay once.',
      price: '$29',
      original_price: '$87',
      amount: 1,
      currency: 'EUR',
      interval: 'month',
      credits: 1,
      valid_days: 999,
      plan_name: 'Pro',
    });

    expect(mergedItem.title).toBe('Pro');
    expect(mergedItem.amount).toBe(14999);
    expect(mergedItem.currency).toBe('USD');
    expect(mergedItem.interval).toBe('one-time');
    expect(mergedItem.credits).toBe(2000);
    expect(mergedItem.valid_days).toBe(90);
    expect(mergedItem.price).toBe('$29');
    expect(mergedItem.original_price).toBe('$87');
  });

  it('keeps localized pricing cards aligned with the pricing catalog output', () => {
    const locales = [
      ['en', enPricingMessages.pricing],
      ['zh', zhPricingMessages.pricing],
    ] as const;

    for (const [locale, pricingCopy] of locales) {
      const pricing = mergePricingWithCatalog(pricingCopy as PricingCopy);

      for (const item of pricing.items || []) {
        const catalogItem = getPricingCatalogItem(item.product_id);

        expect(
          catalogItem,
          `${locale}:${item.product_id} should exist in pricing catalog`
        ).toBeDefined();

        expect(item.amount).toBe(catalogItem?.amount);
        expect(item.currency).toBe(catalogItem?.currency);
        expect(item.interval).toBe(catalogItem?.interval);
        expect(item.credits).toBe(catalogItem?.credits);
        expect(item.valid_days).toBe(catalogItem?.validDays);
      }
    }
  });

  it('renders templated human copy from catalog-backed values', () => {
    const enPricing = mergePricingWithCatalog(
      enPricingMessages.pricing as PricingCopy,
      {
        locale: 'en',
      }
    );
    const zhPricing = mergePricingWithCatalog(
      zhPricingMessages.pricing as PricingCopy,
      {
        locale: 'zh',
      }
    );

    expect(
      findPricingItemByProductId(enPricing, 'pro-yearly')?.description
    ).toBe('Billed $359.88 yearly');
    expect(findPricingItemByProductId(enPricing, 'pro-yearly')?.price).toBe(
      '$29.99'
    );
    expect(findPricingItemByProductId(enPricing, 'pro-yearly')?.tip).toBe(
      '2,000 Credits / month on annual billing'
    );
    expect(
      findPricingItemByProductId(enPricing, 'pro-yearly')?.features
    ).toContain('Priority generation speed');
    expect(
      findPricingItemByProductId(enPricing, 'pro-onetime')?.features
    ).toContain('Priority generation speed');

    expect(findPricingItemByProductId(zhPricing, 'pro-yearly')?.tip).toBe(
      '按年计费，折合每月 2,000 积分'
    );
    expect(
      findPricingItemByProductId(zhPricing, 'pro-yearly')?.features
    ).toContain('优先生成速度');
    expect(
      findPricingItemByProductId(zhPricing, 'pro-onetime')?.features
    ).toContain('优先生成速度');
  });

  it('localizes generated credit tips for non-English public pricing locales', () => {
    const cases = [
      [
        'de',
        dePricingMessages.pricing,
        '2.000 Credits pro Monat bei jährlicher Abrechnung',
      ],
      [
        'fr',
        frPricingMessages.pricing,
        '2 000 crédits par mois avec facturation annuelle',
      ],
      [
        'es',
        esPricingMessages.pricing,
        '2000 créditos al mes con facturación anual',
      ],
      ['ja', jaPricingMessages.pricing, '年額請求で毎月 2,000 クレジット相当'],
      ['ar', arPricingMessages.pricing, '٢٬٠٠٠ رصيد شهريًا مع الفوترة السنوية'],
    ] as const;

    for (const [locale, pricingCopy, expectedTip] of cases) {
      const pricing = mergePricingWithCatalog(pricingCopy as PricingCopy, {
        locale,
      });

      expect(findPricingItemByProductId(pricing, 'pro-yearly')?.tip).toBe(
        expectedTip
      );
    }
  });

  it('keeps commercial-use copy scoped to yearly plans only across locales', () => {
    const cases = [
      [
        'en',
        enPricingMessages.pricing,
        'Commercial use license + Business Certificate',
      ],
      ['zh', zhPricingMessages.pricing, '商业使用授权 + 商业资质证明'],
      [
        'de',
        dePricingMessages.pricing,
        'Kommerzielle Nutzungslizenz + Business Certificate',
      ],
      [
        'fr',
        frPricingMessages.pricing,
        'Licence commerciale + Business Certificate',
      ],
      [
        'es',
        esPricingMessages.pricing,
        'Licencia comercial + certificado comercial',
      ],
      [
        'it',
        itPricingMessages.pricing,
        'Licenza commerciale + Business Certificate',
      ],
      [
        'ja',
        jaPricingMessages.pricing,
        '商用利用ライセンス + Business Certificate',
      ],
      [
        'ko',
        koPricingMessages.pricing,
        '상업용 라이선스 + Business Certificate',
      ],
      ['ar', arPricingMessages.pricing, 'ترخيص استخدام تجاري + شهادة أعمال'],
    ] as const;

    for (const [locale, pricingCopy, expectedYearlyLine] of cases) {
      const items = (pricingCopy as PricingCopy).items || [];
      const yearlyItems = items.filter((item) => item.group === 'yearly');
      const nonYearlyItems = items.filter((item) => item.group !== 'yearly');

      expect(yearlyItems.length, `${locale} should include yearly plans`).toBe(
        3
      );
      expect(
        nonYearlyItems.length,
        `${locale} should include non-yearly plans`
      ).toBe(6);

      for (const item of yearlyItems) {
        expect(item.features, `${locale} ${item.product_id} yearly`).toContain(
          expectedYearlyLine
        );
      }

      for (const item of nonYearlyItems) {
        expect(
          item.features,
          `${locale} ${item.product_id} non-yearly`
        ).not.toContain(expectedYearlyLine);
      }
    }
  });

  it('keeps the skip-free-queue promise on every paid pricing plan across locales', () => {
    const cases = [
      [
        'en',
        enPricingMessages.pricing,
        'Skip the free queue on hosted battle jobs',
      ],
      ['zh', zhPricingMessages.pricing, '托管对战任务跳过免费排队'],
      [
        'de',
        dePricingMessages.pricing,
        'Überspringe die kostenlose Warteschlange für gehostete Bildjobs',
      ],
      [
        'fr',
        frPricingMessages.pricing,
        "Évitez la file gratuite pour les tâches d'image hébergées",
      ],
      [
        'es',
        esPricingMessages.pricing,
        'Salta la cola gratuita en las tareas de imagen alojadas',
      ],
      [
        'it',
        itPricingMessages.pricing,
        'Salta la coda gratuita per i lavori immagine ospitati',
      ],
      [
        'ja',
        jaPricingMessages.pricing,
        'ホスト型画像ジョブの無料キューをスキップ',
      ],
      [
        'ko',
        koPricingMessages.pricing,
        '호스팅 이미지 작업의 무료 대기열 건너뛰기',
      ],
      [
        'ar',
        arPricingMessages.pricing,
        'تجاوز قائمة الانتظار المجانية لمهام الصور المستضافة',
      ],
    ] as const;

    for (const [locale, pricingCopy, expectedLine] of cases) {
      const items = (pricingCopy as PricingCopy).items || [];

      expect(items.length, `${locale} should include paid pricing items`).toBe(
        9
      );

      for (const item of items) {
        expect(item.features, `${locale} ${item.product_id}`).toContain(
          expectedLine
        );
      }
    }
  });

  it('keeps locale pricing copy free of catalog-owned machine fields', () => {
    const rawEnItem = (enPricingMessages.pricing as PricingCopy).items?.find(
      (item) => item.product_id === 'pro-onetime'
    );
    const rawZhItem = (zhPricingMessages.pricing as PricingCopy).items?.find(
      (item) => item.product_id === 'pro-onetime'
    );

    expect(rawEnItem?.amount).toBeUndefined();
    expect(rawEnItem?.currency).toBeUndefined();
    expect(rawEnItem?.interval).toBeUndefined();
    expect(rawEnItem?.price).toBeUndefined();
    expect(rawEnItem?.original_price).toBeUndefined();
    expect(rawEnItem?.unit).toBeUndefined();
    expect(rawEnItem?.credits).toBeUndefined();
    expect(rawEnItem?.valid_days).toBeUndefined();

    expect(rawZhItem?.amount).toBeUndefined();
    expect(rawZhItem?.currency).toBeUndefined();
    expect(rawZhItem?.interval).toBeUndefined();
    expect(rawZhItem?.price).toBeUndefined();
    expect(rawZhItem?.original_price).toBeUndefined();
    expect(rawZhItem?.unit).toBeUndefined();
    expect(rawZhItem?.credits).toBeUndefined();
    expect(rawZhItem?.valid_days).toBeUndefined();
  });

  it('derives display prices and units from catalog data when copy omits them', () => {
    const monthly = mergePricingItemWithCatalog(
      {
        product_id: 'pro-monthly',
        title: 'Pro',
        description: 'Cancel anytime',
      },
      {
        locale: 'en',
      }
    );
    const yearly = mergePricingItemWithCatalog(
      {
        product_id: 'pro-yearly',
        title: 'Pro',
        description: 'Billed {{billing_total_price}} yearly',
      },
      {
        locale: 'en',
      }
    );

    expect(monthly.price).toBe('$49.99');
    expect(monthly.original_price).toBe('');
    expect(monthly.unit).toBe('/ month');
    expect(yearly.price).toBe('$29.99');
    expect(yearly.unit).toBe('/ month');
    expect(yearly.description).toBe('Billed $359.88 yearly');
  });

  it('derives displayed currency variants from selected currency instead of storing a second item copy', () => {
    const item: PricingItem = {
      product_id: 'pro-monthly',
      title: 'Pro',
      currency: 'USD',
      amount: 12900,
      price: '$129',
      original_price: '$387',
      interval: 'month',
      currencies: [
        {
          currency: 'CNY',
          amount: 35000,
          price: '¥350',
          original_price: '¥1,050',
        },
      ],
    };

    expect(getInitialPricingCurrency(item, 'zh')).toBe('CNY');
    expect(resolvePricingItemCurrency(item, 'CNY').price).toBe('¥350');
    expect(resolvePricingItemCurrency(item, 'USD').currency).toBe('USD');
  });

  it('throws when pricing copy references a product that is not in the catalog', () => {
    expect(() =>
      mergePricingItemWithCatalog({
        product_id: 'missing-plan',
        title: 'Missing',
        price: '$0',
      })
    ).toThrow(/not configured in catalog/);
  });

  it('finds merged pricing items by stable product id', () => {
    const pricing = mergePricingWithCatalog(
      enPricingMessages.pricing as PricingCopy
    );

    expect(findPricingItemByProductId(pricing, 'max-monthly')?.product_id).toBe(
      'max-monthly'
    );
    expect(findPricingItemByProductId(pricing, 'missing-plan')).toBeNull();
    expect(
      getPricingItemDisplayName(
        findPricingItemByProductId(pricing, 'max-monthly'),
        'fallback'
      )
    ).toBe('Max Monthly');
  });

  it('formats money with locale-aware separators for planned locales', () => {
    expect(
      formatPricingMoney({
        amount: 12900,
        currency: 'EUR',
        locale: 'de',
      })
    ).toMatch(/129/);
  });
});
