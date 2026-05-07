// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentProviders } from './payment-providers';

vi.mock('next/image', () => ({
  default: ({ alt, src, ...props }: Record<string, unknown>) =>
    createElement('img', { alt, src, ...props }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

async function renderPaymentProviders() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(PaymentProviders, {
        configs: {
          stripe_enabled: 'true',
          creem_enabled: 'true',
          paypal_enabled: 'true',
        },
        loading: false,
        pricingItem: null,
        onCheckout: vi.fn(),
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

describe('PaymentProviders', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('uses the canonical public logo assets for payment providers', async () => {
    const rendered = await renderPaymentProviders();
    const icons = [
      ...rendered.container.querySelectorAll('img'),
    ].map((image) => image.getAttribute('src'));

    expect(icons).toEqual([
      '/images/logos/stripe.png',
      '/images/logos/creem.png',
      '/images/logos/paypal.svg',
    ]);
    expect(icons.every((src) => src?.startsWith('/images/logos/'))).toBe(true);

    await rendered.unmount();
  });
});
