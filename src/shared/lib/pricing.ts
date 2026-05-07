import {
  getLocaleBcp47,
  resolveAppLocale,
  type AppLocale,
} from '@/config/locale';
import {
  getPricingCatalogItem,
  type PricingCatalogCurrency,
  type PricingCatalogEntry,
} from '@/config/website/pricing-catalog';
import { PaymentInterval } from '@/extensions/payment/types';
import {
  Pricing,
  PricingCurrency,
  PricingItem,
} from '@/shared/types/blocks/pricing';

export interface PricingCopyCurrency extends Omit<
  PricingCurrency,
  'amount' | 'price' | 'original_price'
> {
  amount?: number;
  price?: string;
  original_price?: string;
}

export interface PricingCopyItem extends Omit<
  PricingItem,
  | 'amount'
  | 'currency'
  | 'interval'
  | 'currencies'
  | 'display_credits'
  | 'display_credits_interval'
> {
  amount?: number;
  currency?: string;
  interval?: PricingItem['interval'];
  currencies?: PricingCopyCurrency[];
}

export interface PricingCopy extends Omit<Pricing, 'items'> {
  items?: PricingCopyItem[];
}

export type PricingLocale = AppLocale;

export function normalizePricingLocale(locale?: string): PricingLocale {
  return resolveAppLocale(locale);
}

function getNumberFormatLocale(locale?: string) {
  const normalizedLocale = normalizePricingLocale(locale);
  return normalizedLocale === 'ar'
    ? 'ar-EG-u-nu-arab'
    : getLocaleBcp47(normalizedLocale);
}

function formatCreditsLabel(value: number, locale: PricingLocale) {
  const formattedValue = formatCreditsAmount(value, locale);

  switch (locale) {
    case 'zh':
      return `${formattedValue} 积分`;
    case 'fr':
      return `${formattedValue} crédits`;
    case 'es':
      return `${formattedValue} créditos`;
    case 'ja':
      return `${formattedValue} クレジット`;
    case 'it':
      return `${formattedValue} crediti`;
    case 'ko':
      return `${formattedValue} 크레딧`;
    case 'ar':
      return `${formattedValue} رصيد`;
    default:
      return `${formattedValue} Credits`;
  }
}

function formatValidityDuration(
  locale: PricingLocale,
  amount: number,
  unit: 'year' | 'month' | 'day'
) {
  switch (locale) {
    case 'zh':
      return `有效期 ${amount} ${unit === 'year' ? '年' : unit === 'month' ? '个月' : '天'}`;
    case 'de':
      return amount === 1
        ? `1 ${unit === 'year' ? 'Jahr' : unit === 'month' ? 'Monat' : 'Tag'} gültig`
        : `${amount} ${
            unit === 'year' ? 'Jahre' : unit === 'month' ? 'Monate' : 'Tage'
          } gültig`;
    case 'fr':
      return unit === 'month'
        ? `valable ${amount} mois`
        : `valable ${amount} ${amount === 1 ? (unit === 'year' ? 'an' : 'jour') : unit === 'year' ? 'ans' : 'jours'}`;
    case 'es':
      return `vigente durante ${amount} ${
        amount === 1
          ? unit === 'year'
            ? 'año'
            : unit === 'month'
              ? 'mes'
              : 'día'
          : unit === 'year'
            ? 'años'
            : unit === 'month'
              ? 'meses'
              : 'días'
      }`;
    case 'ja':
      return unit === 'day'
        ? `${amount}日間有効`
        : `${amount}${unit === 'year' ? '年間' : 'か月'}有効`;
    case 'it':
      return `valido per ${amount} ${
        amount === 1
          ? unit === 'year'
            ? 'anno'
            : unit === 'month'
              ? 'mese'
              : 'giorno'
          : unit === 'year'
            ? 'anni'
            : unit === 'month'
              ? 'mesi'
              : 'giorni'
      }`;
    case 'ko':
      return `${amount}${unit === 'year' ? '년' : unit === 'month' ? '개월' : '일'} 유효`;
    case 'ar':
      return `صالح لمدة ${amount} ${
        amount === 1
          ? unit === 'year'
            ? 'سنة واحدة'
            : unit === 'month'
              ? 'شهر واحد'
              : 'يوم واحد'
          : unit === 'year'
            ? 'سنوات'
            : unit === 'month'
              ? 'أشهر'
              : 'أيام'
      }`;
    default:
      return amount === 1
        ? `valid for 1 ${unit}`
        : `valid for ${amount} ${unit}s`;
  }
}

function formatMoneyFallback(amount: number, currency: string) {
  const value = (amount / 100)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');

  switch (currency.toUpperCase()) {
    case 'USD':
      return `$${value}`;
    case 'EUR':
      return `€${value}`;
    case 'CNY':
      return `¥${value}`;
    default:
      return `${currency.toUpperCase()} ${value}`;
  }
}

export function formatPricingMoney({
  amount,
  currency,
  locale,
  fallback = '',
}: {
  amount?: number | null;
  currency?: string | null;
  locale?: string;
  fallback?: string;
}) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return fallback;
  }

  const normalizedCurrency = currency?.trim().toUpperCase();
  if (!normalizedCurrency) {
    return fallback;
  }

  try {
    return new Intl.NumberFormat(getNumberFormatLocale(locale), {
      localeMatcher: 'best fit',
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
      .format(amount / 100)
      .replace(/\u00A0/g, ' ');
  } catch {
    return formatMoneyFallback(amount, normalizedCurrency);
  }
}

function formatCreditsAmount(value: number, locale: PricingLocale) {
  return new Intl.NumberFormat(getNumberFormatLocale(locale)).format(value);
}

export function getPricingIntervalUnit(
  interval: PaymentInterval,
  locale?: string
) {
  const normalizedLocale = normalizePricingLocale(locale);

  if (interval === PaymentInterval.ONE_TIME) {
    return '';
  }

  if (normalizedLocale === 'zh') {
    if (interval === PaymentInterval.DAY) {
      return '/ 天';
    }
    if (interval === PaymentInterval.WEEK) {
      return '/ 周';
    }
    return '/ 月';
  }

  if (interval === PaymentInterval.DAY) {
    switch (normalizedLocale) {
      case 'de':
        return '/ Tag';
      case 'fr':
        return '/ jour';
      case 'es':
        return '/ día';
      case 'ja':
        return '/ 日';
      case 'it':
        return '/ giorno';
      case 'ko':
        return '/일';
      case 'ar':
        return '/ يوم';
      default:
        return '/ day';
    }
  }
  if (interval === PaymentInterval.WEEK) {
    switch (normalizedLocale) {
      case 'de':
        return '/ Woche';
      case 'fr':
        return '/ semaine';
      case 'es':
        return '/ semana';
      case 'ja':
        return '/ 週';
      case 'it':
        return '/ settimana';
      case 'ko':
        return '/주';
      case 'ar':
        return '/ أسبوع';
      default:
        return '/ week';
    }
  }

  // Yearly plans display an equivalent monthly price while the description
  // carries the billed-once total.
  switch (normalizedLocale) {
    case 'de':
      return '/ Monat';
    case 'fr':
      return '/ mois';
    case 'es':
      return '/ mes';
    case 'ja':
      return '/ 月';
    case 'it':
      return '/ mese';
    case 'ko':
      return '/월';
    case 'ar':
      return '/ شهر';
    default:
      return '/ month';
  }
}

function getValidityLabel({
  validDays,
  locale,
}: {
  validDays: number;
  locale: PricingLocale;
}) {
  if (validDays <= 0) {
    switch (locale) {
      case 'zh':
        return '永久有效';
      case 'de':
        return 'unbegrenzt gültig';
      case 'fr':
        return 'valable sans limite';
      case 'es':
        return 'vigencia permanente';
      case 'ja':
        return '無期限';
      case 'it':
        return 'validità permanente';
      case 'ko':
        return '기간 제한 없음';
      case 'ar':
        return 'صالح دائمًا';
      default:
        return 'valid forever';
    }
  }

  if (validDays % 365 === 0) {
    const years = validDays / 365;
    return formatValidityDuration(locale, years, 'year');
  }

  if (validDays % 30 === 0) {
    const months = validDays / 30;
    return formatValidityDuration(locale, months, 'month');
  }

  return formatValidityDuration(locale, validDays, 'day');
}

function getCreditsLine({
  credits,
  displayCredits,
  interval,
  displayCreditsInterval,
  validDays,
  locale,
}: {
  credits: number;
  displayCredits?: number;
  interval: PaymentInterval;
  displayCreditsInterval?: PaymentInterval;
  validDays: number;
  locale: PricingLocale;
}) {
  const effectiveCredits = displayCredits ?? credits;
  const creditsLabel = formatCreditsLabel(effectiveCredits, locale);

  if (
    interval === PaymentInterval.YEAR &&
    displayCreditsInterval === PaymentInterval.MONTH &&
    typeof displayCredits === 'number'
  ) {
    switch (locale) {
      case 'zh':
        return `${creditsLabel} / 月，按年计费`;
      case 'de':
        return `${creditsLabel} pro Monat bei jährlicher Abrechnung`;
      case 'fr':
        return `${creditsLabel} par mois avec facturation annuelle`;
      case 'es':
        return `${creditsLabel} al mes con facturación anual`;
      case 'ja':
        return `年額請求で毎月 ${formatCreditsAmount(
          effectiveCredits,
          locale
        )} クレジット相当`;
      case 'it':
        return `${creditsLabel} al mese con fatturazione annuale`;
      case 'ko':
        return `연간 결제 시 매월 ${creditsLabel}`;
      case 'ar':
        return `${creditsLabel} شهريًا مع الفوترة السنوية`;
      default:
        return `${creditsLabel} / month, billed yearly`;
    }
  }

  const validityLabel = getValidityLabel({ validDays, locale });

  if (locale === 'zh') {
    return `${creditsLabel}，${validityLabel}`;
  }
  if (locale === 'ar') {
    return `${creditsLabel}، ${validityLabel}`;
  }

  return `${creditsLabel}, ${validityLabel}`;
}

function getCreditsTip({
  credits,
  displayCredits,
  interval,
  displayCreditsInterval,
  validDays,
  locale,
}: {
  credits: number;
  displayCredits?: number;
  interval: PaymentInterval;
  displayCreditsInterval?: PaymentInterval;
  validDays: number;
  locale: PricingLocale;
}) {
  const effectiveCredits = displayCredits ?? credits;
  const creditsLabel = formatCreditsLabel(effectiveCredits, locale);

  if (interval === PaymentInterval.ONE_TIME) {
    const validityLabel = getValidityLabel({ validDays, locale });
    switch (locale) {
      case 'zh':
        return `获取 ${creditsLabel}，${validityLabel}！`;
      case 'de':
        return `Erhalte ${creditsLabel}, ${validityLabel}!`;
      case 'fr':
        return `Obtenez ${creditsLabel}, ${validityLabel} !`;
      case 'es':
        return `Obtén ${creditsLabel}, ${validityLabel}.`;
      case 'ja':
        return `${creditsLabel} を獲得。${validityLabel}`;
      case 'it':
        return `Ottieni ${creditsLabel}, ${validityLabel}!`;
      case 'ko':
        return `${creditsLabel} 제공, ${validityLabel}`;
      case 'ar':
        return `احصل على ${creditsLabel}، ${validityLabel}.`;
      default:
        return `Get ${creditsLabel}, ${validityLabel}!`;
    }
  }

  if (
    interval === PaymentInterval.YEAR &&
    displayCreditsInterval === PaymentInterval.MONTH &&
    typeof displayCredits === 'number'
  ) {
    switch (locale) {
      case 'zh':
        return `按年计费，折合每月 ${creditsLabel}`;
      case 'de':
        return `${creditsLabel} pro Monat bei jährlicher Abrechnung`;
      case 'fr':
        return `${creditsLabel} par mois avec facturation annuelle`;
      case 'es':
        return `${creditsLabel} al mes con facturación anual`;
      case 'ja':
        return `年額請求で毎月 ${formatCreditsAmount(
          effectiveCredits,
          locale
        )} クレジット相当`;
      case 'it':
        return `${creditsLabel} al mese con fatturazione annuale`;
      case 'ko':
        return `연간 결제 시 매월 ${creditsLabel}`;
      case 'ar':
        return `${creditsLabel} شهريًا مع الفوترة السنوية`;
      default:
        return `${creditsLabel} / month on annual billing`;
    }
  }

  if (interval === PaymentInterval.YEAR) {
    switch (locale) {
      case 'zh':
        return `一次性获得 ${creditsLabel}`;
      case 'de':
        return `Erhalte ${creditsLabel} jährlich`;
      case 'fr':
        return `Obtenez ${creditsLabel} par an`;
      case 'es':
        return `Obtén ${creditsLabel} al año`;
      case 'ja':
        return `年間で ${creditsLabel} を獲得`;
      case 'it':
        return `Ottieni ${creditsLabel} all'anno`;
      case 'ko':
        return `연간 ${creditsLabel} 제공`;
      case 'ar':
        return `احصل على ${creditsLabel} سنويًا`;
      default:
        return `Get ${creditsLabel} Annually`;
    }
  }

  switch (locale) {
    case 'zh':
      return `每月获取 ${creditsLabel}`;
    case 'de':
      return `Erhalte ${creditsLabel} monatlich`;
    case 'fr':
      return `Obtenez ${creditsLabel} par mois`;
    case 'es':
      return `Obtén ${creditsLabel} al mes`;
    case 'ja':
      return `毎月 ${creditsLabel} を獲得`;
    case 'it':
      return `Ottieni ${creditsLabel} al mese`;
    case 'ko':
      return `매월 ${creditsLabel} 제공`;
    case 'ar':
      return `احصل على ${creditsLabel} شهريًا`;
    default:
      return `Get ${creditsLabel} Monthly`;
  }
}

function replacePricingTokensInString(
  value: string,
  tokens: Record<string, string>
) {
  return value.replace(/\{\{([a-z0-9_]+)\}\}/gi, (match, tokenName) => {
    return tokens[tokenName] ?? match;
  });
}

function replacePricingTokensDeep<T>(
  input: T,
  tokens: Record<string, string>
): T {
  if (typeof input === 'string') {
    return replacePricingTokensInString(input, tokens) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => replacePricingTokensDeep(item, tokens)) as T;
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        replacePricingTokensDeep(value, tokens),
      ])
    ) as T;
  }

  return input;
}

function getPricingTokens({
  item,
  catalogItem,
  locale,
}: {
  item: PricingCopyItem;
  catalogItem: PricingCatalogEntry;
  locale: PricingLocale;
}) {
  const headlineAmount = catalogItem.displayAmount ?? catalogItem.amount;
  const headlineOriginalAmount = catalogItem.originalAmount;

  return {
    headline_price: formatPricingMoney({
      amount: headlineAmount,
      currency: catalogItem.currency,
      locale,
    }),
    headline_original_price: headlineOriginalAmount
      ? formatPricingMoney({
          amount: headlineOriginalAmount,
          currency: catalogItem.currency,
          locale,
        })
      : item.original_price || '',
    billing_total_price: formatPricingMoney({
      amount: catalogItem.amount,
      currency: catalogItem.currency,
      locale,
    }),
    credits_feature_line: getCreditsLine({
      credits: catalogItem.credits,
      displayCredits: catalogItem.displayCredits,
      interval: catalogItem.interval,
      displayCreditsInterval: catalogItem.displayCreditsInterval,
      validDays: catalogItem.validDays,
      locale,
    }),
    credits_tip: getCreditsTip({
      credits: catalogItem.credits,
      displayCredits: catalogItem.displayCredits,
      interval: catalogItem.interval,
      displayCreditsInterval: catalogItem.displayCreditsInterval,
      validDays: catalogItem.validDays,
      locale,
    }),
  };
}

function mergePricingCurrenciesWithCatalog({
  productId,
  copyCurrencies,
  catalogCurrencies,
  locale,
}: {
  productId: string;
  copyCurrencies?: PricingCopyCurrency[];
  catalogCurrencies?: PricingCatalogCurrency[];
  locale: PricingLocale;
}): PricingCurrency[] | undefined {
  if (!copyCurrencies?.length) {
    return undefined;
  }

  const catalogCurrencyMap = new Map(
    (catalogCurrencies || []).map((currency) => [
      currency.currency.toLowerCase(),
      currency,
    ])
  );

  return copyCurrencies.map((currency) => {
    const currencyCode = currency.currency?.trim();
    if (!currencyCode) {
      throw new Error(
        `pricing copy currency missing currency code for ${productId}`
      );
    }

    const catalogCurrency = catalogCurrencyMap.get(currencyCode.toLowerCase());
    if (!catalogCurrency) {
      throw new Error(
        `pricing copy currency ${currencyCode} is not configured in catalog for ${productId}`
      );
    }

    return {
      currency: catalogCurrency.currency,
      amount: catalogCurrency.amount,
      price: formatPricingMoney({
        amount: catalogCurrency.displayAmount ?? catalogCurrency.amount,
        currency: catalogCurrency.currency,
        locale,
      }),
      original_price: catalogCurrency.originalAmount
        ? formatPricingMoney({
            amount: catalogCurrency.originalAmount,
            currency: catalogCurrency.currency,
            locale,
          })
        : currency.original_price || '',
      payment_product_id:
        catalogCurrency.paymentProductId || currency.payment_product_id,
      payment_providers:
        catalogCurrency.paymentProviders || currency.payment_providers,
    };
  });
}

export function mergePricingItemWithCatalog(
  item: PricingCopyItem,
  options: {
    locale?: string;
  } = {}
): PricingItem {
  const locale = normalizePricingLocale(options.locale);
  const productId = item.product_id?.trim();
  if (!productId) {
    throw new Error('pricing copy item missing product_id');
  }

  const catalogItem = getPricingCatalogItem(productId);
  if (!catalogItem) {
    throw new Error(
      `pricing copy item ${productId} is not configured in catalog`
    );
  }

  const tokens = getPricingTokens({
    item,
    catalogItem,
    locale,
  });
  const itemWithTokens = replacePricingTokensDeep(item, tokens);

  return {
    ...itemWithTokens,
    product_id: productId,
    interval: catalogItem.interval,
    currency: catalogItem.currency,
    amount: catalogItem.amount,
    credits: catalogItem.credits,
    display_credits: catalogItem.displayCredits,
    display_credits_interval: catalogItem.displayCreditsInterval,
    valid_days: catalogItem.validDays,
    price:
      itemWithTokens.price ||
      formatPricingMoney({
        amount: catalogItem.displayAmount ?? catalogItem.amount,
        currency: catalogItem.currency,
        locale,
      }),
    original_price:
      itemWithTokens.original_price ||
      (catalogItem.originalAmount
        ? formatPricingMoney({
            amount: catalogItem.originalAmount,
            currency: catalogItem.currency,
            locale,
          })
        : ''),
    unit:
      itemWithTokens.unit ||
      getPricingIntervalUnit(catalogItem.interval, locale),
    tip: itemWithTokens.tip || tokens.credits_tip,
    payment_product_id: catalogItem.paymentProductId || item.payment_product_id,
    payment_providers: catalogItem.paymentProviders || item.payment_providers,
    plan_name: item.plan_name || catalogItem.planName || undefined,
    currencies: mergePricingCurrenciesWithCatalog({
      productId,
      copyCurrencies: itemWithTokens.currencies,
      catalogCurrencies: catalogItem.currencies,
      locale,
    }),
  };
}

export function mergePricingWithCatalog(
  pricing: PricingCopy,
  options: {
    locale?: string;
  } = {}
): Pricing {
  return {
    ...pricing,
    items: pricing.items?.map((item) =>
      mergePricingItemWithCatalog(item, options)
    ),
  };
}

export function findPricingItemByProductId(
  pricing: Pricing | PricingCopy,
  productId: string
) {
  return pricing.items?.find((item) => item.product_id === productId) || null;
}

export function getPricingItemCurrencies(item: PricingItem | null) {
  if (!item) {
    return [];
  }

  const currencies: PricingCurrency[] = [
    {
      currency: item.currency,
      amount: item.amount,
      price: item.price || '',
      original_price: item.original_price || '',
      payment_product_id: item.payment_product_id,
      payment_providers: item.payment_providers,
    },
    ...(item.currencies || []),
  ];

  const seen = new Set<string>();
  return currencies.filter((currencyItem) => {
    const currencyCode = currencyItem.currency.toLowerCase();
    if (seen.has(currencyCode)) {
      return false;
    }

    seen.add(currencyCode);
    return true;
  });
}

export function getInitialPricingCurrency(
  item: PricingItem | null,
  locale?: string
) {
  const currencies = getPricingItemCurrencies(item);
  const defaultCurrency = item?.currency || 'USD';

  if (!currencies.length) {
    return defaultCurrency;
  }

  if (normalizePricingLocale(locale) === 'zh') {
    const cnyCurrency = currencies.find(
      (currencyItem) => currencyItem.currency.toLowerCase() === 'cny'
    );
    if (cnyCurrency) {
      return cnyCurrency.currency;
    }
  }

  return defaultCurrency;
}

export function resolvePricingItemCurrency(
  item: PricingItem,
  selectedCurrency?: string | null
) {
  const currencyCode = selectedCurrency?.trim();
  if (!currencyCode) {
    return item;
  }

  const currencyData = getPricingItemCurrencies(item).find(
    (currencyItem) =>
      currencyItem.currency.toLowerCase() === currencyCode.toLowerCase()
  );

  if (!currencyData) {
    return item;
  }

  return {
    ...item,
    currency: currencyData.currency,
    amount: currencyData.amount,
    price: currencyData.price,
    original_price: currencyData.original_price,
    payment_product_id:
      currencyData.payment_product_id || item.payment_product_id,
    payment_providers: currencyData.payment_providers || item.payment_providers,
  };
}

export function getPricingItemDisplayName(
  item: PricingItem | PricingCopyItem | null | undefined,
  fallback = ''
) {
  return item?.product_name?.trim() || item?.title?.trim() || fallback;
}
