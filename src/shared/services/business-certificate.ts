import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { type AppLocale, getLocaleTag, normalizeLocale } from '@/config/locale';
import { getAppDomain, getAppName } from '@/shared/lib/brand';
import { getLocalizedUrl } from '@/shared/lib/seo';

import {
  getBusinessCertificateExtraCopy,
  getBusinessCertificateMessages,
} from './business-certificate-copy';
import { AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE } from './business-certificate-automation';

type CertificateLocale = AppLocale;

type CertificateSubscription = {
  interval?: string | null;
  status?: string | null;
} | null;

export type BusinessCertificateCurrentState = 'active' | 'expired';

export type BusinessCertificateVerificationPayload = {
  certificateId: string;
  locale: CertificateLocale;
  holderName: string;
  planName: string;
  maskedEmail: string;
  subscriptionReference: string;
  validFrom: string;
  validUntil: string;
  issuedOn: string;
  issuerName: string;
  issuerDomain: string;
};

type BusinessCertificateVerificationClaim = {
  v: 1;
  cid: string;
  loc: CertificateLocale;
  holder: string;
  plan: string;
  mail: string;
  sub: string;
  from: string;
  until: string;
  issued: string;
  issuer: string;
  domain: string;
};

const CERTIFICATE_ELIGIBLE_STATUSES = new Set<string>([
  'active',
  'pending_cancel',
  'trialing',
]);

function normalizeInterval(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

function normalizeStatus(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required for business certificate signing');
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signValue(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function normalizeDateString(value?: string | null) {
  return value?.trim() || '';
}

function fallbackCertificateValue(
  value: string | null | undefined,
  locale: CertificateLocale
) {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }

  return getBusinessCertificateExtraCopy(locale).notProvided;
}

function formatDateInput(value: string | Date) {
  if (value instanceof Date) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T12:00:00.000Z`
    : trimmed;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toVerificationClaim(
  payload: BusinessCertificateVerificationPayload
): BusinessCertificateVerificationClaim {
  return {
    v: 1,
    cid: payload.certificateId,
    loc: payload.locale,
    holder: payload.holderName,
    plan: payload.planName,
    mail: payload.maskedEmail,
    sub: payload.subscriptionReference,
    from: payload.validFrom,
    until: payload.validUntil,
    issued: payload.issuedOn,
    issuer: payload.issuerName,
    domain: payload.issuerDomain,
  };
}

function fromVerificationClaim(
  claim: BusinessCertificateVerificationClaim
): BusinessCertificateVerificationPayload | null {
  if (
    claim.v !== 1 ||
    !normalizeLocale(claim.loc) ||
    !claim.cid ||
    !claim.holder ||
    !claim.plan ||
    !claim.mail ||
    !claim.sub ||
    !claim.from ||
    !claim.until ||
    !claim.issued ||
    !claim.issuer ||
    !claim.domain
  ) {
    return null;
  }

  return {
    certificateId: claim.cid,
    locale: claim.loc,
    holderName: claim.holder,
    planName: claim.plan,
    maskedEmail: claim.mail,
    subscriptionReference: claim.sub,
    validFrom: claim.from,
    validUntil: claim.until,
    issuedOn: claim.issued,
    issuerName: claim.issuer,
    issuerDomain: claim.domain,
  };
}

export function normalizeBusinessCertificateLocale(
  value?: string | null
): CertificateLocale {
  return normalizeLocale(value) ?? 'en';
}

export function hasYearlyBusinessCertificateAccess(
  subscription?: CertificateSubscription
) {
  if (!subscription) {
    return false;
  }

  return (
    normalizeInterval(subscription.interval) === 'year' &&
    CERTIFICATE_ELIGIBLE_STATUSES.has(
      normalizeStatus(subscription.status) || ''
    )
  );
}

export function getBusinessCertificateAccess(
  subscription?: CertificateSubscription
) {
  return {
    eligible: hasYearlyBusinessCertificateAccess(subscription),
    hasSubscription: Boolean(subscription),
    isYearly: normalizeInterval(subscription?.interval) === 'year',
    status: normalizeStatus(subscription?.status),
  };
}

export function buildBusinessCertificateDownloadHref(locale?: string | null) {
  const normalizedLocale = normalizeBusinessCertificateLocale(locale);
  return `/api/certificate/download?locale=${normalizedLocale}`;
}

export function buildBusinessCertificateFileName({
  locale,
  subscriptionNo,
}: {
  locale?: string | null;
  subscriptionNo?: string | null;
}) {
  const normalizedLocale = normalizeBusinessCertificateLocale(locale);
  const normalizedSubscriptionNo =
    subscriptionNo?.trim().replace(/[^a-zA-Z0-9_-]+/g, '-') || 'active';

  return `imageeditorai-business-certificate-${normalizedSubscriptionNo}-${normalizedLocale}.pdf`;
}

export function maskBusinessCertificateEmail(email?: string | null) {
  const trimmed = email?.trim();
  if (!trimmed) {
    return 'hidden';
  }

  const [localPart, domain] = trimmed.split('@');
  if (!localPart || !domain) {
    return trimmed;
  }

  const visiblePrefix = localPart.slice(0, 1);
  return `${visiblePrefix || '*'}***@${domain}`;
}

export function formatBusinessCertificateSubscriptionReference(
  subscriptionNo?: string | null
) {
  const trimmed = subscriptionNo?.trim();
  if (!trimmed) {
    return 'hidden';
  }

  return `***${trimmed.slice(-4)}`;
}

export function buildBusinessCertificateId({
  subscriptionNo,
  validFrom,
  validUntil,
}: {
  subscriptionNo: string;
  validFrom: string;
  validUntil: string;
}) {
  const normalizedFrom = normalizeDateString(validFrom).replace(/-/g, '');
  const normalizedUntil = normalizeDateString(validUntil).replace(/-/g, '');
  const digest = createHash('sha256')
    .update(`${subscriptionNo}|${normalizedFrom}|${normalizedUntil}`)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();
  const year = normalizedFrom.slice(0, 4) || '0000';

  return `HHC-${year}-${digest}`;
}

export function formatBusinessCertificateDisplayDate(
  value: string | Date,
  locale: CertificateLocale
) {
  const resolvedDate = formatDateInput(value);
  if (!resolvedDate) {
    return typeof value === 'string' ? value : '';
  }

  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(resolvedDate);
}

export function getBusinessCertificateCurrentState({
  validUntil,
  now = new Date(),
}: {
  validUntil: string;
  now?: Date;
}): BusinessCertificateCurrentState {
  const validUntilDate = new Date(`${validUntil}T23:59:59.999Z`);
  if (Number.isNaN(validUntilDate.getTime())) {
    return 'expired';
  }

  return now.getTime() > validUntilDate.getTime() ? 'expired' : 'active';
}

export function createBusinessCertificateVerificationToken(
  payload: BusinessCertificateVerificationPayload
) {
  const encoded = encodeBase64Url(JSON.stringify(toVerificationClaim(payload)));
  const signature = signValue(encoded);

  return `${encoded}.${signature}`;
}

export function verifyBusinessCertificateVerificationToken(token: string) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = signValue(encoded);
  const providedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);

  if (
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const parsedClaim = JSON.parse(
      decodeBase64Url(encoded)
    ) as BusinessCertificateVerificationClaim;

    return fromVerificationClaim(parsedClaim);
  } catch {
    return null;
  }
}

export function buildBusinessCertificateVerificationHref({
  locale,
  token,
}: {
  locale?: string | null;
  token: string;
}) {
  const normalizedLocale = normalizeBusinessCertificateLocale(locale);
  const baseUrl = getLocalizedUrl('/certificate/verify', normalizedLocale);
  return `${baseUrl}?token=${encodeURIComponent(token)}`;
}

export function buildBusinessCertificateDocument({
  locale: _locale,
  issuedAt,
  issuedOn,
  accountName,
  accountEmail,
  planName,
  subscriptionNo,
  subscriptionStatus,
  validUntil,
  certificateId,
  verificationUrl,
}: {
  locale?: string | null;
  issuedAt?: Date;
  issuedOn?: string | null;
  accountName?: string | null;
  accountEmail?: string | null;
  planName?: string | null;
  subscriptionNo?: string | null;
  subscriptionStatus?: string | null;
  validUntil?: string | null;
  certificateId?: string | null;
  verificationUrl?: string | null;
}) {
  const normalizedLocale = AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE;
  const copy = getBusinessCertificateMessages(normalizedLocale);
  const extraCopy = getBusinessCertificateExtraCopy(normalizedLocale);
  const issuedDate = issuedOn?.trim()
    ? formatBusinessCertificateDisplayDate(issuedOn, normalizedLocale)
    : formatBusinessCertificateDisplayDate(
        issuedAt || new Date(),
        normalizedLocale
      );
  const appName = getAppName();
  const appDomain = getAppDomain();

  return [
    `${appName} ${copy.page.title}`,
    '',
    `${extraCopy.websiteLabel}: ${appDomain}`,
    `${copy.verify.fields.certificate_id}: ${fallbackCertificateValue(certificateId, normalizedLocale)}`,
    `${copy.verify.fields.issued_on}: ${issuedDate}`,
    '',
    `${copy.verify.fields.holder}: ${fallbackCertificateValue(accountName, normalizedLocale)}`,
    `${copy.verify.fields.email}: ${fallbackCertificateValue(accountEmail, normalizedLocale)}`,
    `${copy.verify.fields.plan}: ${fallbackCertificateValue(planName, normalizedLocale)}`,
    `${copy.page.overview.subscription_no}: ${fallbackCertificateValue(subscriptionNo, normalizedLocale)}`,
    `${copy.page.overview.status}: ${fallbackCertificateValue(subscriptionStatus, normalizedLocale)}`,
    `${copy.verify.fields.valid_until}: ${fallbackCertificateValue(validUntil, normalizedLocale)}`,
    `${copy.page.overview.verification_url}: ${fallbackCertificateValue(verificationUrl, normalizedLocale)}`,
    '',
    `${extraCopy.usageNoteLabel}:`,
    copy.page.overview.description,
    copy.page.details.verification_hint,
  ].join('\n');
}
