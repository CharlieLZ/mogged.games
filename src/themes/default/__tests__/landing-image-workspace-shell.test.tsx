// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingImageWorkspaceShell } from '@/themes/default/blocks/landing-image-workspace-shell';
import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';

vi.mock('@/shared/blocks/generator/image-workspace', () => ({
  ImageWorkspace: (props: {
    defaultMode?: string;
    primaryTabs?: string;
    pricingPayload?: GeneratorPricingPayload | null;
    showSamplePreview?: boolean;
    srOnlyTitle?: string;
    viewportFit?: string;
  }) =>
    createElement('section', {
      'data-default-mode': props.defaultMode || '',
      'data-has-pricing-payload': String(Boolean(props.pricingPayload)),
      'data-primary-tabs': props.primaryTabs || '',
      'data-show-sample-preview': String(props.showSamplePreview),
      'data-slot': 'image-workspace',
      'data-sr-only-title': props.srOnlyTitle || '',
      'data-viewport-fit': props.viewportFit || '',
    }),
}));

const pricingPayload: GeneratorPricingPayload = {
  pricing: {
    title: 'Pricing',
    description: 'Description',
    groups: [],
    items: [
      {
        title: 'Pro',
        description: 'Pro plan',
        currency: 'USD',
        amount: 20,
        interval: 'month',
        price: '$20',
        original_price: '',
        product_id: 'pro-monthly',
        button: { title: 'Upgrade', url: '/pricing' },
        credits: 1000,
        valid_days: 30,
        features: [],
      },
    ],
  },
  pageCopy: {
    current_plan: 'Current Plan',
    currency_selector: 'Currency',
    processing: 'Processing',
    snapshot_title: 'Snapshot',
    snapshot_credits: 'Credits',
    snapshot_credits_total_suffix: 'total',
    snapshot_credits_monthly_suffix: '/mo',
    snapshot_generation_speed: 'Speed',
    snapshot_text_to_image: 'Text to Image',
    snapshot_image_edit: 'Image Edit',
    snapshot_credit_cost: 'Cost',
    speed_standard: 'Standard',
    speed_priority: 'Priority',
    speed_fastest: 'Fastest',
  },
};

async function renderShell(
  srOnlyTitle = 'mogged',
  props: {
    pricingPayload?: GeneratorPricingPayload | null;
  } = {}
) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(LandingImageWorkspaceShell, {
        srOnlyTitle,
        pricingPayload: props.pricingPayload,
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

describe('LandingImageWorkspaceShell', () => {
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

  it('mounts the homepage image workspace with image edit tabs as the primary entrypoint', async () => {
    const rendered = await renderShell('mogged', {
      pricingPayload,
    });
    const workspace = rendered.container.querySelector(
      '[data-slot="image-workspace"]'
    );

    expect(workspace?.getAttribute('data-default-mode')).toBe('image-to-image');
    expect(workspace?.getAttribute('data-has-pricing-payload')).toBe('true');
    expect(workspace?.getAttribute('data-primary-tabs')).toBe(
      'image-edit-mode'
    );
    expect(workspace?.getAttribute('data-show-sample-preview')).toBe('true');
    expect(workspace?.getAttribute('data-sr-only-title')).toBe(
      'mogged'
    );
    expect(workspace?.getAttribute('data-viewport-fit')).toBe('');

    await rendered.unmount();
  });

  it('renders the shared fixed-footer workspace on the first render', async () => {
    const rendered = await renderShell();

    expect(
      rendered.container.querySelector(
        '[data-slot="landing-image-workspace-fallback"]'
      )
    ).toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="image-workspace"]')
    ).not.toBeNull();

    await rendered.unmount();
  });
});
