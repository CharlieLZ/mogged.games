import { PaymentInterval } from '@/extensions/payment/types';

export type PaymentProviderName = 'stripe' | 'creem' | 'paypal';

export type PricingCatalogCurrency = {
  currency: string;
  amount: number;
  displayAmount?: number;
  originalAmount?: number;
  paymentProductId?: string;
  paymentProviders?: PaymentProviderName[];
};

export type PricingCatalogEntry = {
  productId: string;
  currency: string;
  amount: number;
  displayAmount?: number;
  originalAmount?: number;
  interval: PaymentInterval;
  credits: number;
  displayCredits?: number;
  displayCreditsInterval?: PaymentInterval;
  validDays: number;
  paymentProductId?: string;
  paymentProviders?: PaymentProviderName[];
  planName?: string;
  currencies?: PricingCatalogCurrency[];
};

const baseProviders: PaymentProviderName[] = ['stripe', 'paypal', 'creem'];

export const PRICING_CATALOG: PricingCatalogEntry[] = [
  {
    productId: 'try-onetime',
    currency: 'USD',
    amount: 1999,
    displayAmount: 1999,
    interval: PaymentInterval.ONE_TIME,
    credits: 500,
    validDays: 30,
    paymentProviders: baseProviders,
  },
  {
    productId: 'pro-onetime',
    currency: 'USD',
    amount: 14999,
    displayAmount: 14999,
    interval: PaymentInterval.ONE_TIME,
    credits: 2000,
    validDays: 90,
    paymentProviders: baseProviders,
  },
  {
    productId: 'max-onetime',
    currency: 'USD',
    amount: 29999,
    displayAmount: 29999,
    interval: PaymentInterval.ONE_TIME,
    credits: 8000,
    validDays: 365,
    paymentProviders: baseProviders,
  },
  {
    productId: 'try-monthly',
    currency: 'USD',
    amount: 1499,
    displayAmount: 1499,
    interval: PaymentInterval.MONTH,
    credits: 500,
    validDays: 30,
    paymentProviders: baseProviders,
    planName: 'Try',
  },
  {
    productId: 'pro-monthly',
    currency: 'USD',
    amount: 4999,
    displayAmount: 4999,
    interval: PaymentInterval.MONTH,
    credits: 2000,
    validDays: 30,
    paymentProviders: baseProviders,
    planName: 'Pro',
  },
  {
    productId: 'max-monthly',
    currency: 'USD',
    amount: 16999,
    displayAmount: 16999,
    interval: PaymentInterval.MONTH,
    credits: 8000,
    validDays: 30,
    paymentProviders: baseProviders,
    planName: 'Max',
  },
  {
    productId: 'try-yearly',
    currency: 'USD',
    amount: 11988,
    displayAmount: 999,
    interval: PaymentInterval.YEAR,
    credits: 6000,
    displayCredits: 500,
    displayCreditsInterval: PaymentInterval.MONTH,
    validDays: 365,
    paymentProviders: baseProviders,
    planName: 'Try',
  },
  {
    productId: 'pro-yearly',
    currency: 'USD',
    amount: 35988,
    displayAmount: 2999,
    interval: PaymentInterval.YEAR,
    credits: 24000,
    displayCredits: 2000,
    displayCreditsInterval: PaymentInterval.MONTH,
    validDays: 365,
    paymentProviders: baseProviders,
    planName: 'Pro',
  },
  {
    productId: 'max-yearly',
    currency: 'USD',
    amount: 119988,
    displayAmount: 9999,
    interval: PaymentInterval.YEAR,
    credits: 96000,
    displayCredits: 8000,
    displayCreditsInterval: PaymentInterval.MONTH,
    validDays: 365,
    paymentProviders: baseProviders,
    planName: 'Max',
  },
];

const pricingCatalogMap = new Map(
  PRICING_CATALOG.map((item) => [item.productId, item])
);

export function getPricingCatalogItem(productId: string) {
  return pricingCatalogMap.get(productId);
}

export function resolvePricingCatalogAmount(
  item: PricingCatalogEntry,
  requestedCurrency?: string | null
) {
  const defaultCurrency = item.currency.toLowerCase();
  const desiredCurrency = requestedCurrency?.toLowerCase();

  if (!desiredCurrency || desiredCurrency === defaultCurrency) {
    return {
      currency: item.currency,
      amount: item.amount,
      displayAmount: item.displayAmount,
      originalAmount: item.originalAmount,
      paymentProductId: item.paymentProductId,
      paymentProviders: item.paymentProviders,
    };
  }

  const matched = item.currencies?.find(
    (currencyItem) => currencyItem.currency.toLowerCase() === desiredCurrency
  );

  if (!matched) {
    return {
      currency: item.currency,
      amount: item.amount,
      displayAmount: item.displayAmount,
      originalAmount: item.originalAmount,
      paymentProductId: item.paymentProductId,
      paymentProviders: item.paymentProviders,
    };
  }

  return {
    currency: matched.currency,
    amount: matched.amount,
    displayAmount: matched.displayAmount ?? item.displayAmount,
    originalAmount: matched.originalAmount ?? item.originalAmount,
    paymentProductId: matched.paymentProductId || item.paymentProductId,
    paymentProviders: matched.paymentProviders || item.paymentProviders,
  };
}
