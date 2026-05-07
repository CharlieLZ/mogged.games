// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentModal } from './payment-modal';

vi.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      const templates: Record<string, string> = {
        choose_payment_method: 'Choose Payment Method',
        choose_payment_method_description_image:
          'Checkout {plan} for image credits',
        choose_payment_method_description_generic:
          'Checkout {plan}',
        selected_plan_fallback: 'this plan',
        cancel_title: 'Cancel',
      };

      return (templates[key] || key).replace(
        /\{(.*?)\}/g,
        (_match, token) => String(values?.[token.trim()] ?? `{${token}}`)
      );
    },
}));

vi.mock('@/shared/hooks/use-media-query', () => ({
  useMediaQuery: () => true,
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    isShowPaymentModal: true,
    setIsShowPaymentModal: vi.fn(),
    configs: {},
  }),
}));

vi.mock('./payment-providers', () => ({
  PaymentProviders: () =>
    createElement('div', { 'data-slot': 'payment-providers' }),
}));

async function renderPaymentModal() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(PaymentModal, {
        isLoading: false,
        pricingItem: {
          product_id: 'pro-yearly',
          title: 'Pro',
          currency: 'USD',
          amount: 118800,
          interval: 'year',
        },
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

describe('PaymentModal', () => {
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

  it('renders image-first checkout copy when the caller opens it from image pricing surfaces', async () => {
    const rendered = await renderPaymentModal();

    expect(document.body.textContent).toContain('Checkout Pro for image credits');

    await rendered.unmount();
  });
});
