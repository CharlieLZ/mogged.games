import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE,
  getAutomatedBusinessCertificateEligibility,
  supportsAutomatedBusinessCertificateHolderName,
} from './business-certificate-automation';

describe('business certificate automation policy', () => {
  it('keeps automated certificates pinned to the english document locale', () => {
    expect(AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE).toBe('en');
  });

  it('accepts latin legal names for automated certificate downloads', () => {
    expect(supportsAutomatedBusinessCertificateHolderName('Alice Smith')).toBe(
      true
    );
    expect(
      supportsAutomatedBusinessCertificateHolderName("José O'Connor")
    ).toBe(true);
    expect(
      supportsAutomatedBusinessCertificateHolderName('Muller-Larsen')
    ).toBe(true);
  });

  it('routes non-latin legal names to manual certificate support', () => {
    expect(supportsAutomatedBusinessCertificateHolderName('山田花子')).toBe(
      false
    );
    expect(supportsAutomatedBusinessCertificateHolderName('김민지')).toBe(
      false
    );
    expect(supportsAutomatedBusinessCertificateHolderName('أحمد علي')).toBe(
      false
    );
  });

  it('returns stable automation eligibility reasons', () => {
    expect(
      getAutomatedBusinessCertificateEligibility({
        holderName: '',
      })
    ).toEqual({
      eligible: false,
      reason: 'missing_holder_name',
    });

    expect(
      getAutomatedBusinessCertificateEligibility({
        holderName: '山田花子',
      })
    ).toEqual({
      eligible: false,
      reason: 'latin_name_required',
    });

    expect(
      getAutomatedBusinessCertificateEligibility({
        holderName: 'Alice Smith',
      })
    ).toEqual({
      eligible: true,
      reason: null,
    });
  });

  it('keeps large certificate font assets out of the public tree', () => {
    expect(
      fs.existsSync(path.join(process.cwd(), 'public', 'fonts', 'certificate'))
    ).toBe(false);
  });
});
