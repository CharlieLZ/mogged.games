// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CertificateVerifyPage from './page';

const mocks = vi.hoisted(() => ({
  verifyBusinessCertificateVerificationToken: vi.fn(),
}));

const certificateMessages = {
  verify: {
    metadata: {
      title: 'Certificate Verification | mogged',
      description: 'Validate a certificate.',
      keywords: 'certificate verification',
    },
    title: 'Certificate Verification',
    description:
      'Validate an mogged business certificate issued for yearly commercial-use access.',
    support_text: 'Need help checking a certificate? Email:',
    badges: {
      valid: 'Verified Certificate',
      expired: 'Expired Certificate',
      invalid: 'Verification Failed',
    },
    states: {
      valid:
        'This certificate token is valid and was issued by mogged.',
      expired:
        'This certificate was issued by mogged, but its yearly subscription window has ended.',
      invalid:
        'This verification link is invalid, incomplete, or has been tampered with.',
    },
    fields: {
      certificate_id: 'Certificate ID',
      holder: 'Certificate Holder',
      plan: 'Plan',
      email: 'Account Email',
      subscription_reference: 'Subscription Reference',
      issued_on: 'Issued On',
      valid_from: 'Valid From',
      valid_until: 'Valid Until',
      issuer: 'Issued By',
    },
    actions: {
      pricing: 'View Pricing',
      support: 'Contact Support',
    },
  },
};

vi.mock('next-intl/server', () => ({
  getTranslations: async () => ({
    raw: (key: string) =>
      (certificateMessages as Record<string, unknown>)[key] ||
      (certificateMessages.verify as Record<string, unknown>)[key],
  }),
  setRequestLocale: vi.fn(),
}));

vi.mock('@/shared/lib/seo', () => ({
  getMetadata: () => () => ({}),
}));

vi.mock('@/shared/lib/brand', () => ({
  getSupportEmail: () => 'support@mogged.games',
  replaceBrandTokens: (value: string) => value,
  replaceBrandTokensDeep: <T>(value: T) => value,
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: any }) =>
    createElement('a', { href }, children),
}));

vi.mock('@/shared/services/business-certificate', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/services/business-certificate')
  >('@/shared/services/business-certificate');

  return {
    ...actual,
    verifyBusinessCertificateVerificationToken:
      mocks.verifyBusinessCertificateVerificationToken,
  };
});

async function renderPage(token?: string) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      await CertificateVerifyPage({
        params: Promise.resolve({ locale: 'en' }),
        searchParams: Promise.resolve(token ? { token } : {}),
      })
    );
  });

  return {
    container,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('Certificate verification page', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders verified certificate details', async () => {
    mocks.verifyBusinessCertificateVerificationToken.mockReturnValue({
      certificateId: 'HHC-2026-DB1ACD7465',
      locale: 'en',
      holderName: 'Alice',
      planName: 'Pro Yearly',
      maskedEmail: 'a***@example.com',
      subscriptionReference: '***0009',
      validFrom: '2026-04-12',
      validUntil: '2027-04-11',
      issuedOn: '2026-04-12',
      issuerName: 'mogged',
      issuerDomain: 'mogged.games',
    });

    const rendered = await renderPage('valid-token');
    const heroInner = rendered.container.querySelector('section > div');
    const headingWrap = rendered.container.querySelector('section > div > div');
    const heading = rendered.container.querySelector('h1');

    expect(rendered.container.textContent).toContain('Verified Certificate');
    expect(rendered.container.textContent).toContain('HHC-2026-DB1ACD7465');
    expect(rendered.container.textContent).toContain('Alice');
    expect(rendered.container.textContent).toContain('mogged.games');
    expect(heroInner?.className).toContain('py-8');
    expect(heroInner?.className).toContain('md:py-10');
    expect(heroInner?.className).not.toContain('py-16');
    expect(heroInner?.className).not.toContain('md:py-20');
    expect(headingWrap?.className).toContain('max-w-6xl');
    expect(headingWrap?.className).toContain('text-center');
    expect(heading?.className).toContain('text-2xl');
    expect(heading?.className).toContain('lg:whitespace-nowrap');
    expect(heading?.className).not.toContain('text-[2.25rem]');

    await rendered.unmount();
  });

  it('renders an invalid-token state', async () => {
    mocks.verifyBusinessCertificateVerificationToken.mockReturnValue(null);

    const rendered = await renderPage('bad-token');

    expect(rendered.container.textContent).toContain('Verification Failed');
    expect(rendered.container.textContent).toContain(
      'This verification link is invalid, incomplete, or has been tampered with.'
    );

    await rendered.unmount();
  });
});
