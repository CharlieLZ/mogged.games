import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  getCurrentYearlySubscription: vi.fn(),
  getLocalizedPricingDisplayName: vi.fn(),
  buildBusinessCertificatePayload: vi.fn(),
  renderBusinessCertificatePdf: vi.fn(),
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/models/subscription', () => ({
  getCurrentYearlySubscription: mocks.getCurrentYearlySubscription,
}));

vi.mock('@/shared/services/pricing', () => ({
  getLocalizedPricingDisplayName: mocks.getLocalizedPricingDisplayName,
}));

vi.mock('@/shared/services/business-certificate-record', () => ({
  buildBusinessCertificatePayload: mocks.buildBusinessCertificatePayload,
}));

vi.mock('@/shared/services/business-certificate-pdf', () => ({
  renderBusinessCertificatePdf: mocks.renderBusinessCertificatePdf,
}));

describe('business certificate download route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
    });
    mocks.getLocalizedPricingDisplayName.mockResolvedValue('Pro Yearly');
    mocks.buildBusinessCertificatePayload.mockReturnValue({
      locale: 'en',
      certificateId: 'HHC-2026-DB1ACD7465',
      issuedOn: '2026-04-12',
      issuerName: 'mogged',
      issuerDomain: 'mogged.games',
      holderName: 'Alice',
      maskedEmail: 'a***@example.com',
      planName: 'Pro Yearly',
      subscriptionReference: '***0010',
      validFrom: '2026-04-12',
      validUntil: '2027-04-11',
      verificationUrl:
        'https://mogged.games/en/certificate/verify?token=test',
      verificationToken: 'test',
      currentState: 'active',
    });
    mocks.renderBusinessCertificatePdf.mockResolvedValue(
      new TextEncoder().encode('%PDF-1.7 fake certificate')
    );
  });

  it('rejects non-yearly subscribers', async () => {
    mocks.getCurrentYearlySubscription.mockResolvedValue(null);

    const response = await GET(
      new NextRequest('https://mogged.games/api/certificate/download')
    );

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toContain('yearly');
  });

  it('returns a downloadable pdf for yearly subscribers', async () => {
    mocks.getCurrentYearlySubscription.mockResolvedValue({
      interval: 'year',
      status: 'active',
      subscriptionNo: 'SUB-010',
      productId: 'price_yearly',
      currentPeriodStart: new Date('2026-04-12T00:00:00.000Z'),
      currentPeriodEnd: new Date('2027-04-11T00:00:00.000Z'),
      createdAt: new Date('2026-04-12T00:00:00.000Z'),
    });

    const response = await GET(
      new NextRequest(
        'https://mogged.games/api/certificate/download?locale=en'
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain(
      'imageeditorai-business-certificate-SUB-010-en.pdf'
    );
    expect(mocks.getLocalizedPricingDisplayName).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
      })
    );
    expect(mocks.buildBusinessCertificatePayload).toHaveBeenCalled();
    expect(mocks.renderBusinessCertificatePdf).toHaveBeenCalled();

    const body = Buffer.from(await response.arrayBuffer()).toString('utf8');
    expect(body).toContain('%PDF-1.7 fake certificate');
  });

  it('routes non-latin legal names to manual certificate support', async () => {
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      name: '山田花子',
      email: 'hanako@example.com',
    });
    mocks.getCurrentYearlySubscription.mockResolvedValue({
      interval: 'year',
      status: 'active',
      subscriptionNo: 'SUB-010',
      productId: 'price_yearly',
      currentPeriodStart: new Date('2026-04-12T00:00:00.000Z'),
      currentPeriodEnd: new Date('2027-04-11T00:00:00.000Z'),
      createdAt: new Date('2026-04-12T00:00:00.000Z'),
    });

    const response = await GET(
      new NextRequest(
        'https://mogged.games/api/certificate/download?locale=en'
      )
    );

    expect(response.status).toBe(409);
    await expect(response.text()).resolves.toContain(
      'Latin or English legal names only'
    );
    expect(mocks.buildBusinessCertificatePayload).not.toHaveBeenCalled();
    expect(mocks.renderBusinessCertificatePdf).not.toHaveBeenCalled();
  });
});
