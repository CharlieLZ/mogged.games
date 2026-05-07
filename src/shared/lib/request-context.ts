import { normalizeAppLocale } from '@/config/locale';
import { LOCALE_COOKIE_NAME } from '@/shared/lib/locale-routing';

type HeaderReader = Pick<Headers, 'get'>;

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

export type RequestContextSnapshot = {
  ipAddress: string;
  userAgent: string | null;
  deviceType: DeviceType;
  locale: string | null;
  countryCode: string | null;
  regionCode: string | null;
  path: string | null;
  referer: string | null;
};

type ResolveRequestContextOptions = {
  locale?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  path?: string | null;
  referer?: string | null;
};

const FALLBACK_IP = '127.0.0.1';

function resolveIpHeaderPriority(): readonly string[] {
  if (process.env.NODE_ENV !== 'production') {
    return [
      'x-real-ip',
      'cf-connecting-ip',
      'x-vercel-forwarded-for',
      'x-forwarded-for',
    ] as const;
  }

  return [
    'cf-connecting-ip',
    'x-vercel-forwarded-for',
    ...(process.env.TRUST_X_REAL_IP === 'true' ? ['x-real-ip'] : []),
    ...(process.env.TRUST_X_FORWARDED_FOR === 'true'
      ? ['x-forwarded-for']
      : []),
  ];
}

function normalizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeIpCandidate(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const firstToken = raw.split(',')[0]?.trim();
  if (!firstToken) {
    return null;
  }

  let normalized = firstToken;

  if (normalized.startsWith('[')) {
    const closingBracketIndex = normalized.indexOf(']');
    if (closingBracketIndex <= 1) {
      return null;
    }

    normalized = normalized.slice(1, closingBracketIndex);
  } else if (normalized.includes('.') && normalized.includes(':')) {
    const [host, port] = normalized.split(':');
    if (host && port && /^\d+$/.test(port)) {
      normalized = host;
    }
  }

  if (normalized.length < 3 || normalized.length > 64) {
    return null;
  }

  if (!/^[0-9a-fA-F:.]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeLocale(value?: string | null): string | undefined {
  const normalized = normalizeText(value, 12)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return normalizeAppLocale(normalized) ?? undefined;
}

function normalizeCountryCode(value?: string | null): string | undefined {
  const normalized = normalizeText(value, 8)?.toUpperCase();
  if (!normalized || normalized === 'XX') {
    return undefined;
  }

  return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeRegionCode(value?: string | null): string | undefined {
  const normalized = normalizeText(value, 16)?.toUpperCase();
  if (!normalized) {
    return undefined;
  }

  return /^[A-Z0-9-]{2,16}$/.test(normalized) ? normalized : undefined;
}

function getLocaleFromAcceptLanguage(
  value?: string | null
): string | undefined {
  const header = normalizeText(value, 128)?.toLowerCase();
  if (!header) {
    return undefined;
  }

  const parts = header
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  for (const part of parts) {
    const [language] = part.split(';');
    const locale = normalizeLocale(language);
    if (locale) {
      return locale;
    }
  }

  return undefined;
}

function getLocaleFromPath(value?: string | null): string | undefined {
  const normalized = normalizeText(value, 512);
  if (!normalized) {
    return undefined;
  }

  try {
    const pathname = normalized.startsWith('http')
      ? new URL(normalized).pathname
      : normalized;
    const segments = pathname.split('/').filter(Boolean);
    return normalizeLocale(segments[0] || undefined);
  } catch {
    return undefined;
  }
}

function normalizeUrl(value?: string | null): string | undefined {
  const normalized = normalizeText(value, 512);
  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  return undefined;
}

function getLocaleFromCookieHeader(value?: string | null): string | undefined {
  const cookieHeader = normalizeText(value, 4096);
  if (!cookieHeader) {
    return undefined;
  }

  for (const entry of cookieHeader.split(';')) {
    const [rawName, ...rawValueParts] = entry.split('=');
    if (rawName?.trim() !== LOCALE_COOKIE_NAME) {
      continue;
    }

    const rawValue = rawValueParts.join('=').trim();
    if (!rawValue) {
      return undefined;
    }

    try {
      return normalizeLocale(decodeURIComponent(rawValue));
    } catch {
      return normalizeLocale(rawValue);
    }
  }

  return undefined;
}

export function resolveDeviceType(userAgent?: string | null): DeviceType {
  const normalized = normalizeText(userAgent, 512)?.toLowerCase();
  if (!normalized) {
    return 'unknown';
  }

  if (
    /bot|spider|crawl|preview|headless|curl|wget|slurp|bingpreview/.test(
      normalized
    )
  ) {
    return 'bot';
  }

  if (/ipad|tablet|playbook|silk/.test(normalized)) {
    return 'tablet';
  }

  if (
    /mobi|iphone|ipod|android.+mobile|windows phone|blackberry|opera mini/.test(
      normalized
    )
  ) {
    return 'mobile';
  }

  return 'desktop';
}

export function getClientIpFromHeaders(headers: HeaderReader): string {
  for (const headerName of resolveIpHeaderPriority()) {
    const ip = normalizeIpCandidate(headers.get(headerName));
    if (ip) {
      return ip;
    }
  }

  return FALLBACK_IP;
}

export function resolveRequestContext(
  headers: HeaderReader,
  options: ResolveRequestContextOptions = {}
): RequestContextSnapshot {
  const userAgent = normalizeText(headers.get('user-agent'), 512) || null;
  const referer =
    normalizeUrl(options.referer) ||
    normalizeUrl(headers.get('referer')) ||
    normalizeUrl(headers.get('referrer')) ||
    null;
  const path =
    normalizeText(options.path, 256) ||
    (referer ? new URL(referer).pathname.slice(0, 256) : null);

  const locale =
    normalizeLocale(options.locale) ||
    getLocaleFromPath(path) ||
    getLocaleFromPath(referer) ||
    getLocaleFromCookieHeader(headers.get('cookie')) ||
    getLocaleFromAcceptLanguage(headers.get('accept-language')) ||
    null;

  const countryCode =
    normalizeCountryCode(options.countryCode) ||
    normalizeCountryCode(headers.get('cf-ipcountry')) ||
    normalizeCountryCode(headers.get('x-vercel-ip-country')) ||
    normalizeCountryCode(headers.get('x-country-code')) ||
    null;

  const regionCode =
    normalizeRegionCode(options.regionCode) ||
    normalizeRegionCode(headers.get('x-vercel-ip-country-region')) ||
    normalizeRegionCode(headers.get('cf-region-code')) ||
    normalizeRegionCode(headers.get('x-region-code')) ||
    null;

  return {
    ipAddress: getClientIpFromHeaders(headers),
    userAgent,
    deviceType: resolveDeviceType(userAgent),
    locale,
    countryCode,
    regionCode,
    path,
    referer,
  };
}
