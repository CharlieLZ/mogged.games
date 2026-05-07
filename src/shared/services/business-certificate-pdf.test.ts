import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

vi.mock('server-only', () => ({}));

import { renderBusinessCertificatePdf } from './business-certificate-pdf';

describe('business certificate pdf', () => {
  it('renders a branded pdf document', async () => {
    const bytes = await renderBusinessCertificatePdf({
      locale: 'en',
      certificateId: 'HHC-2026-DB1ACD7465',
      issuedOn: '2026-04-12',
      issuerName: 'mogged',
      issuerDomain: 'mogged.games',
      holderName: 'Alice',
      maskedEmail: 'a***@example.com',
      planName: 'Pro Yearly',
      subscriptionReference: '***0001',
      validFrom: '2026-04-12',
      validUntil: '2027-04-11',
      verificationUrl:
        'https://mogged.games/en/certificate/verify?token=abc',
      verificationToken: 'abc',
      currentState: 'active',
    });

    expect(Buffer.from(bytes).subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1500);
  });

  it('renders the english certificate template even when the payload locale is not english', async () => {
    const bytes = await renderBusinessCertificatePdf({
      locale: 'ja',
      certificateId: 'HHC-2026-JA12345678',
      issuedOn: '2026-04-12',
      issuerName: 'mogged',
      issuerDomain: 'mogged.games',
      holderName: 'Alice Smith',
      maskedEmail: 'h***@example.com',
      planName: 'Pro Yearly',
      subscriptionReference: '***0001',
      validFrom: '2026-04-12',
      validUntil: '2027-04-11',
      verificationUrl: 'https://mogged.games/en/certificate/verify?token=test',
      verificationToken: 'test',
      currentState: 'active',
    });

    expect(bytes.byteLength).toBeGreaterThan(1500);

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });
});
