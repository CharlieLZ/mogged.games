// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeneratorPricingModal } from './pricing-modal';

const mediaQueryState = vi.hoisted(() => ({
  isDesktop: true,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      if (namespace === 'common.sign' && key === 'cancel_title') {
        return 'Cancel';
      }

      if (key === 'credits_cost') {
        return `Cost ${values?.credits ?? 0} credits`;
      }

      return key;
    },
}));

vi.mock('@/shared/hooks/use-media-query', () => ({
  useMediaQuery: () => mediaQueryState.isDesktop,
}));

const pricingPayload: ComponentProps<
  typeof GeneratorPricingModal
>['pricingPayload'] = {
  pricing: {
    title: 'Simple, Transparent Pricing',
    description: 'Hosted plans for mogged.',
    groups: [{ name: 'annual', title: 'Annually', is_featured: true }],
    items: [
      {
        product_id: 'try-yearly',
        title: 'Try',
        label: 'Start Small',
        description: 'Billed $348 yearly',
        currency: 'USD',
        amount: 34800,
        price: '$29',
        original_price: '$87',
        interval: 'year',
        credits: 6000,
        display_credits: 500,
        display_credits_interval: 'month',
        features: [
          'Text-to-image and image-to-image workflows',
          'Prompt-led generation and source-image edits',
          'High-resolution image exports',
          'No watermark',
        ],
        button: { title: 'Get Started', url: '/pricing' },
        group: 'annual',
        tip: '500 Credits / month on annual billing',
      },
      {
        product_id: 'pro-yearly',
        title: 'Pro',
        label: 'Regular Use',
        description: 'Billed $1,188 yearly',
        currency: 'USD',
        amount: 118800,
        price: '$99',
        original_price: '$297',
        interval: 'year',
        credits: 24000,
        display_credits: 2000,
        display_credits_interval: 'month',
        features: [
          'Text-to-image and image-to-image workflows',
          'Prompt-led generation and source-image edits',
          'High-resolution image exports',
          'Skip the free queue on hosted image jobs',
        ],
        button: { title: 'Get Started', url: '/pricing' },
        group: 'annual',
        tip: '2,000 Credits / month on annual billing',
      },
      {
        product_id: 'max-yearly',
        title: 'Max',
        label: 'Best Value',
        description: 'Billed $2,388 yearly',
        currency: 'USD',
        amount: 238800,
        price: '$199',
        original_price: '$597',
        interval: 'year',
        credits: 96000,
        display_credits: 8000,
        display_credits_interval: 'month',
        features: [
          'Text-to-image and image-to-image workflows',
          'Prompt-led generation and source-image edits',
          'High-resolution image exports',
          'Skip the free queue on hosted image jobs',
        ],
        button: { title: 'Get Started', url: '/pricing' },
        group: 'annual',
        tip: '8,000 Credits / month on annual billing',
        is_featured: true,
      },
    ],
  },
  pageCopy: {
    current_plan: 'Current Plan',
    currency_selector: 'Currency',
    processing: 'Processing',
    snapshot_title: 'Plan Snapshot',
    snapshot_credits: 'Credits',
    snapshot_credits_total_suffix: 'total',
    snapshot_credits_monthly_suffix: '/ mo',
    snapshot_generation_speed: 'Generation speed',
    snapshot_text_to_image: '1K image generation',
    snapshot_image_edit: '2K image edit',
    snapshot_credit_cost: '{credits} credits',
    speed_standard: 'Standard',
    speed_priority: 'Priority',
    speed_fastest: 'Fastest',
  },
};

async function renderPricingModal({
  isDesktop = true,
}: {
  isDesktop?: boolean;
} = {}) {
  const container = document.createElement('div');
  const root = createRoot(container);
  mediaQueryState.isDesktop = isDesktop;

  await act(async () => {
    root.render(
      createElement(GeneratorPricingModal, {
        costCredits: 150,
        isLoading: false,
        loadingProductId: null,
        onCheckout: vi.fn(),
        onOpenChange: vi.fn(),
        open: true,
        pricingPayload,
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

describe('GeneratorPricingModal', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mediaQueryState.isDesktop = true;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders pricing page plan cards inside a constrained scrollable dialog', async () => {
    const rendered = await renderPricingModal();

    const dialog = document.querySelector('[data-slot="dialog-content"]');
    const dialogHeader = document.querySelector('[data-slot="dialog-header"]');
    const controls = document.querySelector(
      '[data-slot="generator-pricing-modal-controls"]'
    );
    const tablist = document.querySelector('[role="tablist"]');
    const planCards = document.querySelectorAll(
      '[data-slot="pricing-plan-card"]'
    );
    const snapshots = document.querySelectorAll(
      '[data-testid="pricing-snapshot"]'
    );

    expect(dialog?.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(dialog?.className).not.toContain('sm:max-w-[960px]');
    expect(dialogHeader?.className).toContain('items-center');
    expect(dialogHeader?.className).toContain('text-center');
    expect(tablist).not.toBeNull();
    expect(controls?.className).toContain('justify-center');
    expect(planCards).toHaveLength(3);
    expect(snapshots).toHaveLength(3);
    expect(document.body.textContent).toContain('Plan Snapshot');
    expect(document.body.textContent).toContain('Cost 150 credits');
    expect(document.body.textContent).toContain('1K image generation');
    expect(document.body.textContent).toContain('2K image edit');

    await rendered.unmount();
  });

  it('keeps mobile drawer copy and billing controls left aligned', async () => {
    const rendered = await renderPricingModal({ isDesktop: false });

    const drawerHeader = document.querySelector('[data-slot="drawer-header"]');
    const controls = document.querySelector(
      '[data-slot="generator-pricing-modal-controls"]'
    );

    expect(drawerHeader?.className).toContain('text-left');
    expect(controls?.className).toContain('justify-start');
    expect(document.body.textContent).toContain('Cost 150 credits');

    await rendered.unmount();
  });
});
