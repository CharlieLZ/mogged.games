import type { AppLocale } from '@/config/locale';

export const AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE: AppLocale = 'en';

export type AutomatedBusinessCertificateEligibility =
  | {
      eligible: true;
      reason: null;
    }
  | {
      eligible: false;
      reason: 'missing_holder_name' | 'latin_name_required';
    };

const AUTOMATED_CERTIFICATE_LATIN_NAME_PATTERN =
  /^[\p{Script=Latin}\d .,'’()&/+:-]+$/u;

function normalizeHolderName(value?: string | null) {
  return value?.trim() || '';
}

export function supportsAutomatedBusinessCertificateHolderName(
  value?: string | null
) {
  const normalizedValue = normalizeHolderName(value);

  if (!normalizedValue) {
    return false;
  }

  return AUTOMATED_CERTIFICATE_LATIN_NAME_PATTERN.test(normalizedValue);
}

export function getAutomatedBusinessCertificateEligibility(params: {
  holderName?: string | null;
}): AutomatedBusinessCertificateEligibility {
  const normalizedHolderName = normalizeHolderName(params.holderName);

  if (!normalizedHolderName) {
    return {
      eligible: false,
      reason: 'missing_holder_name',
    };
  }

  if (!supportsAutomatedBusinessCertificateHolderName(normalizedHolderName)) {
    return {
      eligible: false,
      reason: 'latin_name_required',
    };
  }

  return {
    eligible: true,
    reason: null,
  };
}
