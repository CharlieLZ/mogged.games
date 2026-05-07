import { envConfigs, type ConfigMap } from '@/config';
import {
  SITE_BRAND_LOGO_PATH,
  SITE_BRAND_MARK_PATH,
  SITE_DEFAULT_SHARE_IMAGE_PATH,
} from '@/shared/lib/site-visuals';

export const DEFAULT_APP_URL = 'https://mogged.games';
export const DEFAULT_APP_NAME = 'mogged';
export const DEFAULT_PUBLIC_SEO_IMAGE = SITE_DEFAULT_SHARE_IMAGE_PATH;
const DEFAULT_SUPPORT_EMAIL = 'support@mogged.games';
const DEFAULT_INITIAL_CREDITS_AMOUNT = 15;

export const DEFAULT_REPOSITORY_URL =
  'https://github.com/CharlieLZ/mogged.games';
const PLACEHOLDER_APP_NAME_PATTERNS = [/^nte ai$/i];
const PLACEHOLDER_SUPPORT_EMAIL_PATTERNS = [/^support@nteai\.org$/i];
const PLACEHOLDER_REPOSITORY_URLS = new Set([
  'https://github.com/CharlieLZ/imageeditorai.net',
]);
const PLACEHOLDER_INITIAL_CREDITS_AMOUNTS = new Set([100]);
const CANONICAL_APP_HOSTS = new Set([
  'mogged.games',
  'www.mogged.games',
]);

type BrandTokenOverrides = Partial<
  Pick<
    ConfigMap,
    'app_name' | 'app_url' | 'initial_credits_amount' | 'repository_url'
  >
>;

export function normalizeAppUrl(rawUrl?: string | null) {
  const trimmed = rawUrl?.trim();

  if (!trimmed) {
    return DEFAULT_APP_URL;
  }

  const normalized = trimmed.replace(/\/+$/, '');

  try {
    const parsedUrl = new URL(normalized);

    if (CANONICAL_APP_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
      return DEFAULT_APP_URL;
    }

    return parsedUrl.toString().replace(/\/+$/, '');
  } catch {
    return normalized;
  }
}

export function normalizeAppName(rawName?: string | null) {
  const trimmed = rawName?.trim();

  if (!trimmed) {
    return DEFAULT_APP_NAME;
  }

  return PLACEHOLDER_APP_NAME_PATTERNS.some((pattern) => pattern.test(trimmed))
    ? DEFAULT_APP_NAME
    : trimmed;
}

export function getAppUrl(overrides?: BrandTokenOverrides) {
  return normalizeAppUrl(overrides?.app_url ?? envConfigs.app_url);
}

export function getAppName(overrides?: BrandTokenOverrides) {
  return normalizeAppName(overrides?.app_name ?? envConfigs.app_name);
}

function normalizeSupportEmail(rawEmail?: string | null) {
  const trimmed = rawEmail?.trim();

  if (!trimmed) {
    return DEFAULT_SUPPORT_EMAIL;
  }

  return PLACEHOLDER_SUPPORT_EMAIL_PATTERNS.some((pattern) =>
    pattern.test(trimmed)
  )
    ? DEFAULT_SUPPORT_EMAIL
    : trimmed;
}

export function getSupportEmail() {
  return normalizeSupportEmail(
    process.env.RESEND_SENDER_EMAIL ||
      process.env.NEXT_PUBLIC_EMAIL ||
      DEFAULT_SUPPORT_EMAIL
  );
}

function normalizeInitialCreditsAmount(rawAmount?: string | number | null) {
  const parsedAmount = Number.parseInt(`${rawAmount ?? ''}`, 10);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return DEFAULT_INITIAL_CREDITS_AMOUNT;
  }

  return PLACEHOLDER_INITIAL_CREDITS_AMOUNTS.has(parsedAmount)
    ? DEFAULT_INITIAL_CREDITS_AMOUNT
    : parsedAmount;
}

export function getInitialCreditsAmount(overrides?: BrandTokenOverrides) {
  return normalizeInitialCreditsAmount(
    overrides?.initial_credits_amount ?? envConfigs.initial_credits_amount
  );
}

export function replaceSupportEmailPlaceholders(value?: string | null) {
  if (!value) return value || '';

  return value.replaceAll('{{support_email}}', getSupportEmail());
}

export function replaceSupportEmailMailto(value?: string | null) {
  if (!value) return value || '';

  return value.replaceAll(
    'mailto:{{support_email}}',
    `mailto:${getSupportEmail()}`
  );
}

export function getSupportMailto() {
  return `mailto:${getSupportEmail()}`;
}

function normalizeRepositoryUrl(rawUrl?: string | null) {
  const trimmed = rawUrl?.trim();

  if (!trimmed) {
    return DEFAULT_REPOSITORY_URL;
  }

  return PLACEHOLDER_REPOSITORY_URLS.has(trimmed)
    ? DEFAULT_REPOSITORY_URL
    : trimmed.replace(/\/+$/, '');
}

export function getRepositoryUrl(overrides?: BrandTokenOverrides) {
  return normalizeRepositoryUrl(
    overrides?.repository_url ||
      process.env.NEXT_PUBLIC_REPOSITORY_URL ||
      process.env.REPOSITORY_URL ||
      DEFAULT_REPOSITORY_URL
  );
}

export function getAppDomain(overrides?: BrandTokenOverrides) {
  try {
    return new URL(getAppUrl(overrides)).host;
  } catch {
    return getAppUrl(overrides).replace(/^https?:\/\//, '');
  }
}

export function replaceBrandTokens(
  value?: string | null,
  overrides?: BrandTokenOverrides
) {
  if (!value) return value || '';

  const appUrl = getAppUrl(overrides);
  const appName = getAppName(overrides);
  const appDomain = getAppDomain(overrides);
  const initialCreditsAmount = String(getInitialCreditsAmount(overrides));
  const replacements: Array<[string | RegExp, string]> = [
    ['mailto:{{support_email}}', getSupportMailto()],
    ['{{support_email}}', getSupportEmail()],
    ['mailto:support@mogged.games', getSupportMailto()],
    ['support@mogged.games', getSupportEmail()],
    [
      'https://github.com/CharlieLZ/mogged.games',
      getRepositoryUrl(overrides),
    ],
    ['mogged', appName],
    ['https://www.mogged.games', appUrl],
    ['https://mogged.games', appUrl],
    ['{{app_url}}', appUrl],
    ['{{app_name}}', appName],
    ['{{app_domain}}', appDomain],
    ['{{brand_mark_src}}', SITE_BRAND_MARK_PATH],
    ['{{brand_logo_src}}', SITE_BRAND_LOGO_PATH],
    ['{{initial_credits_amount}}', initialCreditsAmount],
    ['{{repository_url}}', getRepositoryUrl(overrides)],
  ];

  return replacements.reduce((result, [searchValue, replaceValue]) => {
    if (typeof searchValue === 'string') {
      return result.replaceAll(searchValue, replaceValue);
    }

    return result.replace(searchValue, replaceValue);
  }, value);
}

export function replaceBrandTokensDeep<T>(
  input: T,
  overrides?: BrandTokenOverrides
): T {
  if (typeof input === 'string') {
    return replaceBrandTokens(input, overrides) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => replaceBrandTokensDeep(item, overrides)) as T;
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        replaceBrandTokensDeep(value, overrides),
      ])
    ) as T;
  }

  return input;
}
