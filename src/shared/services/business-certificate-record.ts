import 'server-only';

import type { AppLocale } from '@/config/locale';
import { getDayjs } from '@/shared/lib/dayjs';
import type { Subscription } from '@/shared/models/subscription';
import type { User } from '@/shared/models/user';

import {
  buildBusinessCertificateVerificationHref,
  buildBusinessCertificateId,
  createBusinessCertificateVerificationToken,
  formatBusinessCertificateSubscriptionReference,
  getBusinessCertificateCurrentState,
  maskBusinessCertificateEmail,
  normalizeBusinessCertificateLocale,
} from './business-certificate';

export type BusinessCertificatePayload = {
  locale: AppLocale;
  certificateId: string;
  issuedOn: string;
  issuerName: string;
  issuerDomain: string;
  holderName: string;
  maskedEmail: string;
  planName: string;
  subscriptionReference: string;
  validFrom: string;
  validUntil: string;
  verificationUrl: string;
  verificationToken: string;
  currentState: 'active' | 'expired';
};

function requireString(value: string | null | undefined, field: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${field} is required for business certificate`);
  }

  return trimmed;
}

function formatDateValue(value?: Date | null, field?: string) {
  if (!value) {
    throw new Error(`${field || 'date'} is required for business certificate`);
  }

  return getDayjs(value).format('YYYY-MM-DD');
}

export function buildBusinessCertificatePayload({
  locale,
  user,
  subscription,
  planName,
  issuerName,
  issuerDomain,
}: {
  locale: string;
  user: Pick<User, 'name' | 'email'>;
  subscription: Pick<
    Subscription,
    'subscriptionNo' | 'currentPeriodStart' | 'currentPeriodEnd' | 'createdAt'
  >;
  planName: string;
  issuerName: string;
  issuerDomain: string;
}): BusinessCertificatePayload {
  const normalizedLocale = normalizeBusinessCertificateLocale(locale);
  const subscriptionNo = requireString(
    subscription.subscriptionNo,
    'subscription.subscriptionNo'
  );
  const holderName = requireString(user.name, 'user.name');
  const normalizedPlanName = requireString(planName, 'planName');
  const normalizedIssuerName = requireString(issuerName, 'issuerName');
  const normalizedIssuerDomain = requireString(issuerDomain, 'issuerDomain');
  const issuedOn = formatDateValue(
    subscription.currentPeriodStart || subscription.createdAt,
    'subscription.currentPeriodStart'
  );
  const validFrom = issuedOn;
  const validUntil = formatDateValue(
    subscription.currentPeriodEnd,
    'subscription.currentPeriodEnd'
  );
  const certificateId = buildBusinessCertificateId({
    subscriptionNo,
    validFrom,
    validUntil,
  });
  const maskedEmail = maskBusinessCertificateEmail(user.email);
  const subscriptionReference =
    formatBusinessCertificateSubscriptionReference(subscriptionNo);
  const verificationToken = createBusinessCertificateVerificationToken({
    certificateId,
    locale: normalizedLocale,
    holderName,
    planName: normalizedPlanName,
    maskedEmail,
    subscriptionReference,
    validFrom,
    validUntil,
    issuedOn,
    issuerName: normalizedIssuerName,
    issuerDomain: normalizedIssuerDomain,
  });
  const verificationUrl = buildBusinessCertificateVerificationHref({
    locale: normalizedLocale,
    token: verificationToken,
  });

  return {
    locale: normalizedLocale,
    certificateId,
    issuedOn,
    issuerName: normalizedIssuerName,
    issuerDomain: normalizedIssuerDomain,
    holderName,
    maskedEmail,
    planName: normalizedPlanName,
    subscriptionReference,
    validFrom,
    validUntil,
    verificationUrl,
    verificationToken,
    currentState: getBusinessCertificateCurrentState({ validUntil }),
  };
}
