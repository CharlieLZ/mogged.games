import {
  ADS_ATTRIBUTION_COOKIE_NAME,
  parseAdsAttributionCookie,
  type AdsAttributionSnapshot,
} from '@/shared/lib/ads-attribution';

type GoogleTagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTagFunction;
  }
}

export type GoogleAdsConfigs = {
  enabled: boolean;
  purchaseTrackingMode: 'browser' | 'server';
  conversionId: string;
  signupLabel: string;
  beginCheckoutLabel: string;
  purchaseLabel: string;
};

export type GoogleAdsConversionEvent = {
  conversionId: string;
  label: string;
  value?: number;
  currency?: string;
  transactionId?: string;
};

type GoogleAdsSignupIdentity = {
  userId?: string | null;
  email?: string | null;
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value: unknown, defaultValue = true): boolean {
  const normalized = trimString(value).toLowerCase();
  if (!normalized) {
    return defaultValue;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  return defaultValue;
}

function normalizePurchaseTrackingMode(
  value: unknown
): 'browser' | 'server' {
  return trimString(value).toLowerCase() === 'server' ? 'server' : 'browser';
}

export function convertMinorUnitsToGoogleAdsValue(
  value: number | null | undefined,
  currency?: string | null
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  const normalizedCurrency = trimString(currency).toUpperCase();
  const isZeroDecimalCurrency = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency);
  const divisor = isZeroDecimalCurrency ? 1 : 100;
  const precision = isZeroDecimalCurrency ? 0 : 2;

  return Number((value / divisor).toFixed(precision));
}

export function normalizeGoogleAdsConversionId(value: unknown): string {
  const normalized = trimString(value);
  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('AW-')) {
    return normalized;
  }

  return /^\d+$/.test(normalized) ? `AW-${normalized}` : normalized;
}

function buildGoogleAdsSendTo(conversionId: string, label: string): string {
  const normalizedId = normalizeGoogleAdsConversionId(conversionId);
  const normalizedLabel = trimString(label);

  if (!normalizedId || !normalizedLabel) {
    return '';
  }

  return `${normalizedId}/${normalizedLabel}`;
}

function normalizeGoogleAdsStorageToken(value: string | null | undefined) {
  return trimString(value).toLowerCase();
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  return match ? match.slice(name.length + 1) : null;
}

function readAdsAttributionCookieFromDocument(): AdsAttributionSnapshot | null {
  return parseAdsAttributionCookie(readCookieValue(ADS_ATTRIBUTION_COOKIE_NAME));
}

export function hasGoogleAdsSignupAttribution(
  snapshot?: AdsAttributionSnapshot | null
): boolean {
  const utmSource = trimString(snapshot?.utm_source).toLowerCase();

  return Boolean(
    trimString(snapshot?.gclid) ||
      trimString(snapshot?.gbraid) ||
      trimString(snapshot?.wbraid) ||
      utmSource === 'google'
  );
}

export function buildGoogleAdsSignupStorageKeys(
  input: GoogleAdsSignupIdentity
): string[] {
  const keys: string[] = [];
  const normalizedUserId = normalizeGoogleAdsStorageToken(input.userId);
  const normalizedEmail = normalizeGoogleAdsStorageToken(input.email);

  if (normalizedUserId) {
    keys.push(`google_ads_signup_tracked:${normalizedUserId}`);
  }

  if (normalizedEmail) {
    keys.push(`google_ads_signup_tracked:${normalizedEmail}`);
  }

  return keys;
}

export function hasTrackedGoogleAdsSignup(
  input: GoogleAdsSignupIdentity
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return buildGoogleAdsSignupStorageKeys(input).some(
    (key) => window.localStorage.getItem(key) === '1'
  );
}

export function markGoogleAdsSignupTracked(input: GoogleAdsSignupIdentity) {
  if (typeof window === 'undefined') {
    return;
  }

  for (const key of buildGoogleAdsSignupStorageKeys(input)) {
    window.localStorage.setItem(key, '1');
  }
}

export function resolveGoogleAdsConfigs(
  configs: Record<string, string> | null | undefined
): GoogleAdsConfigs {
  return {
    enabled: normalizeBoolean(configs?.enable_ads_tracking, true),
    purchaseTrackingMode: normalizePurchaseTrackingMode(
      configs?.google_ads_purchase_tracking_mode
    ),
    conversionId: normalizeGoogleAdsConversionId(
      configs?.google_ads_conversion_id
    ),
    signupLabel: trimString(configs?.google_ads_signup_label),
    beginCheckoutLabel: trimString(configs?.google_ads_begin_checkout_label),
    purchaseLabel: trimString(configs?.google_ads_purchase_label),
  };
}

export function pickGoogleAdsClickIdentifier(input: {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
}): { type: 'gclid' | 'gbraid' | 'wbraid'; value: string } | null {
  const identifiers = [
    ['gclid', trimString(input.gclid)],
    ['gbraid', trimString(input.gbraid)],
    ['wbraid', trimString(input.wbraid)],
  ].filter(([, value]) => value) as Array<
    ['gclid' | 'gbraid' | 'wbraid', string]
  >;

  if (identifiers.length !== 1) {
    return null;
  }

  const [type, value] = identifiers[0];
  return { type, value };
}

export function formatGoogleAdsConversionDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+00:00`;
}

export function trackGoogleAdsConversion(
  input: GoogleAdsConversionEvent
): boolean {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return false;
  }

  const sendTo = buildGoogleAdsSendTo(input.conversionId, input.label);
  if (!sendTo) {
    return false;
  }

  const payload: Record<string, unknown> = {
    send_to: sendTo,
  };

  if (typeof input.value === 'number' && Number.isFinite(input.value)) {
    payload.value = input.value;
  }

  const normalizedCurrency = trimString(input.currency);
  if (normalizedCurrency) {
    payload.currency = normalizedCurrency.toUpperCase();
  }

  const normalizedTransactionId = trimString(input.transactionId);
  if (normalizedTransactionId) {
    payload.transaction_id = normalizedTransactionId;
  }

  window.gtag('event', 'conversion', payload);
  return true;
}

export function trackGoogleAdsSignupConversion(input: {
  configs: Record<string, string> | null | undefined;
  userId?: string | null;
  email?: string | null;
}): boolean {
  const googleAdsConfigs = resolveGoogleAdsConfigs(input.configs);
  const attributionSnapshot = readAdsAttributionCookieFromDocument();

  if (
    typeof window === 'undefined' ||
    !googleAdsConfigs.enabled ||
    !googleAdsConfigs.conversionId ||
    !googleAdsConfigs.signupLabel ||
    !hasGoogleAdsSignupAttribution(attributionSnapshot) ||
    hasTrackedGoogleAdsSignup({
      userId: input.userId,
      email: input.email,
    })
  ) {
    return false;
  }

  const tracked = trackGoogleAdsConversion({
    conversionId: googleAdsConfigs.conversionId,
    label: googleAdsConfigs.signupLabel,
    value: 1,
    currency: 'USD',
  });

  if (tracked) {
    markGoogleAdsSignupTracked({
      userId: input.userId,
      email: input.email,
    });
  }

  return tracked;
}
