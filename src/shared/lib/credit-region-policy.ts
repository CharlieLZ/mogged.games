import 'server-only';

import { GUEST_DAILY_QUOTA_LIMIT } from '@/shared/lib/viewer-quota';

const DEFAULT_RESTRICTED_COUNTRIES = [
  'IN',
  'ID',
  'PH',
  'VN',
  'TH',
  'MY',
  'BD',
  'PK',
  'NG',
  'EG',
  'LK',
  'MM',
  'KH',
  'LA',
  'NP',
  'KE',
];

const RESTRICTED_SIGNUP_BONUS_CREDITS = 1;
const RESTRICTED_DAILY_CLAIM_CREDITS = 1;
const RESTRICTED_GUEST_QUOTA_CREDITS = 0;

export const GEO_RESTRICTION_ERROR = 'geo_restricted';

export type CreditRegionPolicy = {
  countryCode: string | null;
  restricted: boolean;
  signupBonusCredits: number;
  dailyClaimCredits: number;
  guestQuotaCredits: number;
  guestGenerationEnabled: boolean;
};

type ResolveCreditRegionPolicyInput = {
  countryCode?: string | null;
  signupBonusCredits?: number | null;
  dailyClaimCredits?: number | null;
  guestQuotaCredits?: number | null;
};

function parseRestrictedCountries(raw: string | undefined): Set<string> {
  if (raw === undefined) {
    return new Set(DEFAULT_RESTRICTED_COUNTRIES);
  }

  const codes = raw
    .split(',')
    .map((c) => normalizeCreditCountryCode(c))
    .filter((c): c is string => Boolean(c));

  return new Set(codes);
}

function normalizeCreditAmount(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value as number));
}

let restrictedSet: Set<string> | undefined;

function getRestrictedSet(): Set<string> {
  if (!restrictedSet) {
    restrictedSet = parseRestrictedCountries(
      process.env.RESTRICTED_CREDIT_COUNTRIES
    );
  }

  return restrictedSet;
}

export function normalizeCreditCountryCode(value?: string | null): string | null {
  const trimmed = value?.trim().toUpperCase();
  if (!trimmed || trimmed === 'XX' || !/^[A-Z]{2}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function resolveCreditCountryCodeFromHeaders(headers: Headers) {
  return normalizeCreditCountryCode(
    headers.get('cf-ipcountry') ||
      headers.get('x-vercel-ip-country') ||
      headers.get('x-country-code')
  );
}

export function isCountryCreditRestricted(
  countryCode?: string | null
): boolean {
  const normalizedCountryCode = normalizeCreditCountryCode(countryCode);
  if (!normalizedCountryCode) {
    return false;
  }

  return getRestrictedSet().has(normalizedCountryCode);
}

function restrictPositiveCreditAmount(amount: number, restrictedAmount: number) {
  return amount > 0 ? restrictedAmount : 0;
}

export function resolveCreditRegionPolicy({
  countryCode,
  signupBonusCredits,
  dailyClaimCredits,
  guestQuotaCredits = GUEST_DAILY_QUOTA_LIMIT,
}: ResolveCreditRegionPolicyInput = {}): CreditRegionPolicy {
  const normalizedCountryCode = normalizeCreditCountryCode(countryCode);
  const restricted = isCountryCreditRestricted(normalizedCountryCode);
  const normalizedSignupBonusCredits =
    normalizeCreditAmount(signupBonusCredits);
  const normalizedDailyClaimCredits = normalizeCreditAmount(dailyClaimCredits);
  const normalizedGuestQuotaCredits = normalizeCreditAmount(guestQuotaCredits);

  const policy = restricted
    ? {
        signupBonusCredits: restrictPositiveCreditAmount(
          normalizedSignupBonusCredits,
          RESTRICTED_SIGNUP_BONUS_CREDITS
        ),
        dailyClaimCredits: restrictPositiveCreditAmount(
          normalizedDailyClaimCredits,
          RESTRICTED_DAILY_CLAIM_CREDITS
        ),
        guestQuotaCredits: RESTRICTED_GUEST_QUOTA_CREDITS,
      }
    : {
        signupBonusCredits: normalizedSignupBonusCredits,
        dailyClaimCredits: normalizedDailyClaimCredits,
        guestQuotaCredits: normalizedGuestQuotaCredits,
      };

  return {
    countryCode: normalizedCountryCode,
    restricted,
    ...policy,
    guestGenerationEnabled: policy.guestQuotaCredits > 0,
  };
}

export function resetRestrictedCountriesForTesting() {
  restrictedSet = undefined;
}
