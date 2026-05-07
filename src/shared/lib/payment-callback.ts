import { envConfigs } from '@/config';
import { PaymentType } from '@/extensions/payment/types';

export const PAYMENT_PRICING_PATH = '/pricing';
export const PAYMENT_BILLING_PATH = '/settings/billing';
export const PAYMENT_PAYMENTS_PATH = '/settings/payments';

type ResolvePaymentResultUrlInput = {
  callbackUrl?: string | null;
  paymentType?: string | null;
  locale?: string | null;
};

function normalizeText(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function resolvePaymentResultUrl(
  input: ResolvePaymentResultUrlInput
): string {
  const explicitCallbackUrl = normalizeText(input.callbackUrl);
  if (explicitCallbackUrl) {
    return explicitCallbackUrl;
  }

  let baseUrl = envConfigs.app_url;
  const locale = normalizeText(input.locale)?.toLowerCase();
  const defaultLocale =
    normalizeText(envConfigs.default_locale)?.toLowerCase() || 'en';

  if (locale && locale !== defaultLocale) {
    baseUrl += `/${locale}`;
  }

  return input.paymentType === PaymentType.SUBSCRIPTION
    ? `${baseUrl}${PAYMENT_BILLING_PATH}`
    : `${baseUrl}${PAYMENT_PAYMENTS_PATH}`;
}

export function resolvePaymentPricingFallbackUrl(
  localeInput?: string | null
): string {
  let baseUrl = envConfigs.app_url;
  const locale = normalizeText(localeInput)?.toLowerCase();
  const defaultLocale =
    normalizeText(envConfigs.default_locale)?.toLowerCase() || 'en';

  if (locale && locale !== defaultLocale) {
    baseUrl += `/${locale}`;
  }

  return `${baseUrl}${PAYMENT_PRICING_PATH}`;
}
