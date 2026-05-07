import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const originalAuthSecret = process.env.AUTH_SECRET;

import {
  buildBusinessCertificateDocument,
  buildBusinessCertificateFileName,
  buildBusinessCertificateId,
  createBusinessCertificateVerificationToken,
  formatBusinessCertificateDisplayDate,
  formatBusinessCertificateSubscriptionReference,
  getBusinessCertificateAccess,
  getBusinessCertificateCurrentState,
  hasYearlyBusinessCertificateAccess,
  maskBusinessCertificateEmail,
  normalizeBusinessCertificateLocale,
  verifyBusinessCertificateVerificationToken,
} from './business-certificate';
import { buildBusinessCertificatePayload } from './business-certificate-record';

beforeEach(() => {
  process.env.AUTH_SECRET = 'test-auth-secret';
});

afterAll(() => {
  process.env.AUTH_SECRET = originalAuthSecret;
});

describe('business certificate access', () => {
  it('allows active yearly subscriptions to access the business certificate', () => {
    expect(
      hasYearlyBusinessCertificateAccess({
        interval: 'year',
        status: 'active',
      })
    ).toBe(true);
  });

  it('denies monthly subscriptions and canceled yearly subscriptions', () => {
    expect(
      hasYearlyBusinessCertificateAccess({
        interval: 'month',
        status: 'active',
      })
    ).toBe(false);

    expect(
      hasYearlyBusinessCertificateAccess({
        interval: 'year',
        status: 'canceled',
      })
    ).toBe(false);
  });

  it('returns a stable access summary for the page layer', () => {
    expect(
      getBusinessCertificateAccess({
        interval: 'year',
        status: 'pending_cancel',
      })
    ).toEqual({
      eligible: true,
      hasSubscription: true,
      isYearly: true,
      status: 'pending_cancel',
    });

    expect(getBusinessCertificateAccess(null)).toEqual({
      eligible: false,
      hasSubscription: false,
      isYearly: false,
      status: null,
    });
  });
});

describe('business certificate helpers', () => {
  it('builds a pdf filename for downloads', () => {
    expect(
      buildBusinessCertificateFileName({
        locale: 'zh',
        subscriptionNo: 'SUB-009',
      })
    ).toBe('imageeditorai-business-certificate-SUB-009-zh.pdf');
  });

  it('normalizes extended public locales for certificate flows', () => {
    expect(normalizeBusinessCertificateLocale('de-DE')).toBe('de');
    expect(normalizeBusinessCertificateLocale('ja-JP')).toBe('ja');
    expect(normalizeBusinessCertificateLocale('ar-SA')).toBe('ar');
    expect(normalizeBusinessCertificateLocale('unknown')).toBe('en');
  });

  it('masks public verification fields', () => {
    expect(maskBusinessCertificateEmail('alice@example.com')).toBe(
      'a***@example.com'
    );
    expect(formatBusinessCertificateSubscriptionReference('SUB-123456')).toBe(
      '***3456'
    );
  });

  it('builds a stable certificate id', () => {
    expect(
      buildBusinessCertificateId({
        subscriptionNo: 'SUB-001',
        validFrom: '2026-04-12',
        validUntil: '2027-04-11',
      })
    ).toBe('HHC-2026-84F5F66979');
  });

  it('formats certificate dates with the active locale instead of collapsing to en/zh only', () => {
    expect(formatBusinessCertificateDisplayDate('2026-04-12', 'de')).toBe(
      '12. Apr. 2026'
    );
    expect(formatBusinessCertificateDisplayDate('2026-04-12', 'ja')).toBe(
      '2026年4月12日'
    );
  });

  it('signs and verifies certificate tokens', () => {
    const token = createBusinessCertificateVerificationToken({
      certificateId: 'HHC-2026-DB1ACD7465',
      locale: 'en',
      holderName: 'Alice',
      planName: 'Pro Yearly',
      maskedEmail: 'a***@example.com',
      subscriptionReference: '***0001',
      validFrom: '2026-04-12',
      validUntil: '2027-04-11',
      issuedOn: '2026-04-12',
      issuerName: 'mogged',
      issuerDomain: 'mogged.games',
    });

    expect(verifyBusinessCertificateVerificationToken(token)).toEqual({
      certificateId: 'HHC-2026-DB1ACD7465',
      locale: 'en',
      holderName: 'Alice',
      planName: 'Pro Yearly',
      maskedEmail: 'a***@example.com',
      subscriptionReference: '***0001',
      validFrom: '2026-04-12',
      validUntil: '2027-04-11',
      issuedOn: '2026-04-12',
      issuerName: 'mogged',
      issuerDomain: 'mogged.games',
    });

    expect(
      verifyBusinessCertificateVerificationToken(`${token}tampered`)
    ).toBeNull();
  });

  it('derives the certificate status from the validity window', () => {
    expect(
      getBusinessCertificateCurrentState({
        validUntil: '2027-04-11',
        now: new Date('2026-04-12T00:00:00.000Z'),
      })
    ).toBe('active');

    expect(
      getBusinessCertificateCurrentState({
        validUntil: '2025-04-11',
        now: new Date('2026-04-12T00:00:00.000Z'),
      })
    ).toBe('expired');
  });

  it('keeps localized certificate payload locale and verification links for live locales', () => {
    const payload = buildBusinessCertificatePayload({
      locale: 'ja',
      user: {
        name: '山田花子',
        email: 'hanako@example.com',
      },
      subscription: {
        subscriptionNo: 'SUB-001',
        currentPeriodStart: new Date('2026-04-12T00:00:00.000Z'),
        currentPeriodEnd: new Date('2027-04-11T00:00:00.000Z'),
        createdAt: new Date('2026-04-12T00:00:00.000Z'),
      },
      planName: 'プロ年額プラン',
      issuerName: 'mogged',
      issuerDomain: 'mogged.games',
    });

    expect(payload.locale).toBe('ja');
    expect(payload.verificationUrl).toContain(
      '/ja/certificate/verify?token='
    );
  });
});

describe('business certificate document', () => {
  it('builds an english certificate body with verification details', () => {
    const content = buildBusinessCertificateDocument({
      locale: 'en',
      issuedOn: '2026-04-12',
      accountName: 'Alice',
      accountEmail: 'alice@example.com',
      planName: 'Pro Yearly',
      subscriptionNo: 'SUB-001',
      subscriptionStatus: 'active',
      validUntil: '2027-04-11',
      certificateId: 'HHC-2026-DB1ACD7465',
      verificationUrl:
        'https://mogged.games/en/certificate/verify?token=test',
    });

    expect(content).toContain('mogged Business Certificate');
    expect(content).toContain('Certificate ID: HHC-2026-DB1ACD7465');
    expect(content).toContain(
      'Verification URL: https://mogged.games/en/certificate/verify?token=test'
    );
  });

  it('keeps the plain-text document body in english for automated certificates', () => {
    const content = buildBusinessCertificateDocument({
      locale: 'ja',
      issuedOn: '2026-04-12',
      accountName: 'Alice',
      accountEmail: 'alice@example.com',
      planName: 'Pro Yearly',
      subscriptionNo: 'SUB-001',
      subscriptionStatus: 'active',
      validUntil: '2027-04-11',
      certificateId: 'HHC-2026-DB1ACD7465',
      verificationUrl:
        'https://mogged.games/en/certificate/verify?token=test',
    });

    expect(content).toContain('mogged Business Certificate');
    expect(content).toContain('Certificate ID: HHC-2026-DB1ACD7465');
    expect(content).not.toContain('証明書');
  });
});
