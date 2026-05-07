import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PricingCopy } from '@/shared/lib/pricing';

import {
  getGeneratorPricingPayload,
  pickGeneratorPricingPageCopy,
} from './generator-pricing';

const loadMessagesMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/core/i18n/load-messages', () => ({
  loadMessages: loadMessagesMock,
}));

describe('generator pricing payload', () => {
  beforeEach(() => {
    loadMessagesMock.mockReset();
  });

  it('builds a minimal generator pricing payload from pricing locale messages', async () => {
    const messages = {
      pricing: {
        title: 'mogged Pricing',
        description: 'Hosted plans',
        items: [
          {
            product_id: 'pro-yearly',
            title: 'Pro',
            description: 'Best for regular use',
            currency: 'USD',
            amount: 118800,
            price: '$99',
            interval: 'year',
            button: { title: 'Get Started', url: '/pricing' },
          },
        ],
      },
      page: {
        current_plan: 'Current Plan',
        currency_selector: 'Currency',
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
    } satisfies {
      pricing: PricingCopy;
      page: Record<string, string>;
    };

    loadMessagesMock.mockResolvedValue(messages);

    const payload = await getGeneratorPricingPayload('en');

    expect(loadMessagesMock).toHaveBeenCalledWith('pricing', 'en');
    expect(payload).toEqual({
      pricing: {
        title: 'mogged Pricing',
        description: 'Hosted plans',
        items: [
          expect.objectContaining({
            product_id: 'pro-yearly',
            title: 'Pro',
          }),
        ],
        groups: undefined,
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
    });
  });

  it('returns null when generator pricing page copy is incomplete so the UI can fall back safely', async () => {
    loadMessagesMock.mockResolvedValue({
      pricing: {
        title: 'mogged Pricing',
        description: 'Hosted plans',
        items: [],
      },
      page: {
        processing: 'Processing',
      },
    });

    await expect(getGeneratorPricingPayload('en')).resolves.toBeNull();
  });

  it('picks only the generator pricing copy fields that the modal needs', () => {
    expect(
      pickGeneratorPricingPageCopy({
        current_plan: 'Current Plan',
        currency_selector: 'Currency',
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
      })
    ).toEqual({
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
    });
  });
});
