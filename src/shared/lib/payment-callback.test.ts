import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentType } from '@/extensions/payment/types';

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalDefaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;

describe('payment callback helpers', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://mogged.games';
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE = 'en';
    vi.resetModules();
  });

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }

    if (originalDefaultLocale === undefined) {
      delete process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
    } else {
      process.env.NEXT_PUBLIC_DEFAULT_LOCALE = originalDefaultLocale;
    }

    vi.resetModules();
  });

  it('prefers explicit callback url when present', async () => {
    const { resolvePaymentResultUrl } = await import('./payment-callback');

    expect(
      resolvePaymentResultUrl({
        callbackUrl: 'https://example.com/custom-return',
        paymentType: PaymentType.SUBSCRIPTION,
        locale: 'zh',
      })
    ).toBe('https://example.com/custom-return');
  });

  it('builds localized billing url for subscription payments', async () => {
    const { resolvePaymentResultUrl } = await import('./payment-callback');

    expect(
      resolvePaymentResultUrl({
        paymentType: PaymentType.SUBSCRIPTION,
        locale: 'zh',
      })
    ).toBe('https://mogged.games/zh/settings/billing');
  });

  it('builds payments and pricing fallback urls for one-time payments', async () => {
    const { resolvePaymentPricingFallbackUrl, resolvePaymentResultUrl } =
      await import('./payment-callback');

    expect(
      resolvePaymentResultUrl({
        paymentType: PaymentType.ONE_TIME,
        locale: 'en',
      })
    ).toBe('https://mogged.games/settings/payments');

    expect(resolvePaymentPricingFallbackUrl()).toBe(
      'https://mogged.games/pricing'
    );
  });
});
