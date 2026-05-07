// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PricingPage from '@/themes/default/pages/pricing';

vi.mock('@/themes/default/blocks/pricing', () => ({
  Pricing: ({ pricing, pageCopy }: Record<string, any>) =>
    createElement(
      'section',
      null,
      pricing?.title || pageCopy?.metric_cost_per_100_credits || 'Pricing'
    ),
}));

vi.mock('@/themes/default/blocks/faq', () => ({
  FAQ: ({ faq }: Record<string, any>) =>
    createElement('section', null, faq?.title || 'FAQ'),
}));

async function renderPricingPage() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      await PricingPage({
        locale: 'en',
        pricing: {
          id: 'pricing',
          title: 'Pricing',
          items: [],
        },
        pricingPageCopy: {
          current_plan: 'Current Plan',
          processing: 'Processing',
          metric_cost_per_100_credits: 'Cost per 100 credits',
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
        faq: {
          id: 'faq',
          title: 'Pricing FAQ',
          items: [],
        },
        testimonials: {
          id: 'testimonials',
          title: 'What visitors usually want answered first',
          items: [],
        },
      } as any)
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

describe('Pricing page', () => {
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

  it('renders pricing and faq without the legacy testimonials section', async () => {
    const rendered = await renderPricingPage();

    expect(rendered.container.textContent).toContain('Pricing');
    expect(rendered.container.textContent).toContain('Pricing FAQ');
    expect(rendered.container.textContent).not.toContain(
      'What visitors usually want answered first'
    );

    await rendered.unmount();
  });
});
