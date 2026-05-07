// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CertificatePage from './page';

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  getCurrentSubscription: vi.fn(),
  getCurrentYearlySubscription: vi.fn(),
  getLocalizedPricingDisplayName: vi.fn(),
  buildBusinessCertificatePayload: vi.fn(),
  consoleLayout: vi.fn(),
}));

const certificateMessages = {
  metadata: {
    title: 'Business Certificate | mogged',
    description: 'Download your business certificate.',
    keywords: 'business certificate',
  },
  page: {
    title: 'Business Certificate',
    description:
      'Download your business certificate for mogged generated video copyright.',
    support_text: 'Need help with your certificate or access? Email:',
    badges: {
      required: 'Yearly Plan Required',
      active: 'Certificate Ready',
      unavailable: 'Verification Unavailable',
    },
    states: {
      locked:
        'Business certificates are exclusively available for yearly subscription members.',
      eligible:
        'Your yearly subscription is active. Download the PDF certificate or open its public verification URL.',
      unavailable:
        'We could not build your certificate proof right now. Please try again shortly.',
    },
    overview: {
      title: 'Commercial License Certificate',
      description:
        'Download a formal PDF certificate with a stable certificate ID, subscription window, and a public verification URL for mogged generated commercial-use access.',
      yearly_plan_required: 'Yearly Plan Required',
      current_plan: 'Current Plan',
      status: 'Status',
      valid_until: 'Valid Until',
      subscription_no: 'Subscription No',
      certificate_id: 'Certificate ID',
      issued_on: 'Issued On',
      verification_url: 'Verification URL',
    },
    details: {
      title: 'Certificate Details',
      verification_hint:
        'Anyone with this URL can validate the certificate status and key facts without signing in.',
    },
    benefits: {
      title: 'Yearly Plan Benefits',
      items: [
        'Commercial Use License',
        '50% discount on all plans',
        'Annual credits allocation',
      ],
    },
    actions: {
      upgrade: 'Upgrade to Annual Plan',
      download: 'Download PDF Certificate',
      verify: 'Open Verification URL',
    },
    statuses: {
      active: 'Active',
      pending_cancel: 'Scheduled to Cancel',
      trialing: 'Trialing',
      canceled: 'Canceled',
      cancelled: 'Canceled',
      expired: 'Expired',
      paused: 'Paused',
      unknown: 'Unavailable',
    },
  },
};

const settingsSidebarMessages = {
  title: 'Settings',
  support_text: 'Need help with billing, refunds, or access? Email:',
  nav: {
    items: [
      { title: 'Profile', url: '/settings/profile', icon: 'User' },
      {
        title: 'Business Certificate',
        url: '/certificate',
        icon: 'ShieldCheck',
      },
    ],
  },
  top_nav: {
    items: [{ title: 'Settings', url: '/settings', icon: 'Settings' }],
  },
};

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => ({
    raw: (key: string) =>
      namespace === 'certificate'
        ? (certificateMessages as Record<string, unknown>)[key]
        : (settingsSidebarMessages as Record<string, unknown>)[key],
  }),
  setRequestLocale: vi.fn(),
}));

vi.mock('@/shared/lib/seo', () => ({
  getMetadata: () => () => ({}),
}));

vi.mock('@/shared/lib/brand', () => ({
  getAppName: () => 'mogged',
  getAppDomain: () => 'mogged.games',
  getSupportEmail: () => 'support@mogged.games',
  replaceBrandTokens: (value: string) => value,
  replaceBrandTokensDeep: <T>(value: T) => value,
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: any }) =>
    createElement('a', { href }, children),
}));

vi.mock('@/shared/blocks/common/empty', () => ({
  Empty: ({ message }: { message: string }) =>
    createElement('div', null, message),
}));

vi.mock('@/shared/blocks/console/layout', () => ({
  ConsoleLayout: (props: { title?: string; children: any }) => {
    mocks.consoleLayout(props);
    return createElement(
      'div',
      null,
      createElement('h1', null, props.title),
      props.children
    );
  },
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/models/subscription', () => ({
  getCurrentSubscription: mocks.getCurrentSubscription,
  getCurrentYearlySubscription: mocks.getCurrentYearlySubscription,
}));

vi.mock('@/shared/services/pricing', () => ({
  getLocalizedPricingDisplayName: mocks.getLocalizedPricingDisplayName,
}));

vi.mock('@/shared/services/business-certificate-record', () => ({
  buildBusinessCertificatePayload: mocks.buildBusinessCertificatePayload,
}));

async function renderPage() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      await CertificatePage({
        params: Promise.resolve({ locale: 'en' }),
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

describe('Certificate page', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
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
      subscriptionReference: '***0009',
      validFrom: '2026-04-12',
      validUntil: '2027-04-11',
      verificationUrl:
        'https://mogged.games/en/certificate/verify?token=test',
      verificationToken: 'test',
      currentState: 'active',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('marks Settings active in the top nav while rendering the certificate page', async () => {
    mocks.getCurrentSubscription.mockResolvedValue(null);
    mocks.getCurrentYearlySubscription.mockResolvedValue(null);

    const rendered = await renderPage();

    expect(mocks.consoleLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        topNav: expect.objectContaining({
          items: [
            expect.objectContaining({
              title: 'Settings',
              url: '/settings',
              is_active: true,
            }),
          ],
        }),
      })
    );

    await rendered.unmount();
  });

  it('renders the yearly-plan upsell state for non-yearly members', async () => {
    mocks.getCurrentSubscription.mockResolvedValue({
      interval: 'month',
      status: 'active',
      subscriptionNo: 'SUB-001',
      currentPeriodEnd: new Date('2026-05-12T00:00:00.000Z'),
    });
    mocks.getCurrentYearlySubscription.mockResolvedValue(null);

    const rendered = await renderPage();

    expect(rendered.container.textContent).toContain('Yearly Plan Required');
    expect(rendered.container.textContent).toContain(
      'Business certificates are exclusively available for yearly subscription members.'
    );

    const upgradeLink = rendered.container.querySelector('a[href="/pricing"]');
    expect(upgradeLink?.textContent).toContain('Upgrade to Annual Plan');

    await rendered.unmount();
  });

  it('renders the download and verification state for yearly members', async () => {
    const yearlySubscription = {
      interval: 'year',
      status: 'active',
      subscriptionNo: 'SUB-009',
      currentPeriodStart: new Date('2026-04-12T00:00:00.000Z'),
      currentPeriodEnd: new Date('2027-04-11T00:00:00.000Z'),
      createdAt: new Date('2026-04-12T00:00:00.000Z'),
      productId: 'price_yearly',
    };
    mocks.getCurrentSubscription.mockResolvedValue(yearlySubscription);
    mocks.getCurrentYearlySubscription.mockResolvedValue(yearlySubscription);

    const rendered = await renderPage();

    expect(rendered.container.textContent).toContain('Certificate Ready');
    expect(rendered.container.textContent).toContain('Pro Yearly');
    expect(rendered.container.textContent).toContain('HHC-2026-DB1ACD7465');
    expect(rendered.container.textContent).toContain(
      'Automatic certificate downloads are issued as English PDF files.'
    );
    expect(rendered.container.textContent).toContain(
      'https://mogged.games/en/certificate/verify?token=test'
    );

    const downloadLink = rendered.container.querySelector(
      'a[href="/api/certificate/download?locale=en"]'
    );
    expect(downloadLink?.textContent).toContain('Download PDF Certificate');

    const verifyLink = rendered.container.querySelector(
      'a[href="https://mogged.games/en/certificate/verify?token=test"]'
    );
    expect(verifyLink?.textContent).toContain('Open Verification URL');

    await rendered.unmount();
  });

  it('routes yearly members with non-latin legal names to manual support', async () => {
    const yearlySubscription = {
      interval: 'year',
      status: 'active',
      subscriptionNo: 'SUB-009',
      currentPeriodStart: new Date('2026-04-12T00:00:00.000Z'),
      currentPeriodEnd: new Date('2027-04-11T00:00:00.000Z'),
      createdAt: new Date('2026-04-12T00:00:00.000Z'),
      productId: 'price_yearly',
    };
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      name: '山田花子',
      email: 'hanako@example.com',
    });
    mocks.getCurrentSubscription.mockResolvedValue(yearlySubscription);
    mocks.getCurrentYearlySubscription.mockResolvedValue(yearlySubscription);

    const rendered = await renderPage();

    expect(rendered.container.textContent).toContain('Manual Review Required');
    expect(rendered.container.textContent).toContain(
      'Contact Support for Manual Certificate'
    );
    expect(rendered.container.textContent).toContain(
      'Latin or English legal names only'
    );

    const supportLink = rendered.container.querySelector(
      'a[href="mailto:support@mogged.games"]'
    );
    expect(supportLink?.textContent).toContain(
      'Contact Support for Manual Certificate'
    );
    expect(
      rendered.container.querySelector('a[href="/api/certificate/download?locale=en"]')
    ).toBeNull();
    expect(mocks.buildBusinessCertificatePayload).not.toHaveBeenCalled();

    await rendered.unmount();
  });
});
