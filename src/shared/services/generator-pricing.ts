import 'server-only';

import { loadMessages } from '@/core/i18n/load-messages';
import type {
  GeneratorPricingPageCopy,
  GeneratorPricingPayload,
} from '@/shared/blocks/generator/generator-pricing-payload';
import {
  mergePricingWithCatalog,
  type PricingCopy,
} from '@/shared/lib/pricing';
import type { PricingPageCopy } from '@/shared/types/blocks/pricing';

const GENERATOR_PRICING_PAGE_COPY_KEYS = [
  'current_plan',
  'currency_selector',
  'processing',
  'snapshot_title',
  'snapshot_credits',
  'snapshot_credits_total_suffix',
  'snapshot_credits_monthly_suffix',
  'snapshot_generation_speed',
  'snapshot_text_to_image',
  'snapshot_image_edit',
  'snapshot_credit_cost',
  'speed_standard',
  'speed_priority',
  'speed_fastest',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function pickGeneratorPricingPageCopy(
  pageCopy: PricingPageCopy
): GeneratorPricingPageCopy {
  return {
    current_plan: pageCopy.current_plan,
    currency_selector: pageCopy.currency_selector,
    processing: pageCopy.processing,
    snapshot_title: pageCopy.snapshot_title,
    snapshot_credits: pageCopy.snapshot_credits,
    snapshot_credits_total_suffix: pageCopy.snapshot_credits_total_suffix,
    snapshot_credits_monthly_suffix: pageCopy.snapshot_credits_monthly_suffix,
    snapshot_generation_speed: pageCopy.snapshot_generation_speed,
    snapshot_text_to_image: pageCopy.snapshot_text_to_image,
    snapshot_image_edit: pageCopy.snapshot_image_edit,
    snapshot_credit_cost: pageCopy.snapshot_credit_cost,
    speed_standard: pageCopy.speed_standard,
    speed_priority: pageCopy.speed_priority,
    speed_fastest: pageCopy.speed_fastest,
  };
}

function parseGeneratorPricingPageCopy(
  value: unknown
): GeneratorPricingPageCopy | null {
  if (!isRecord(value)) {
    return null;
  }

  const pageCopy = {} as Record<
    (typeof GENERATOR_PRICING_PAGE_COPY_KEYS)[number],
    string
  >;

  for (const key of GENERATOR_PRICING_PAGE_COPY_KEYS) {
    const entry = value[key];

    if (typeof entry !== 'string' || entry.length === 0) {
      return null;
    }

    pageCopy[key] = entry;
  }

  return pageCopy as GeneratorPricingPageCopy;
}

export async function getGeneratorPricingPayload(
  locale: string
): Promise<GeneratorPricingPayload | null> {
  try {
    const messages = await loadMessages('pricing', locale);
    const pricingNamespace = isRecord(messages) ? messages.pricing : null;
    const pageNamespace = isRecord(messages) ? messages.page : undefined;

    if (!isRecord(pricingNamespace)) {
      throw new Error('pricing namespace missing');
    }

    const pageCopy = parseGeneratorPricingPageCopy(
      pageNamespace ?? pricingNamespace.page
    );

    if (!pageCopy) {
      throw new Error('generator pricing page copy missing required keys');
    }

    const pricing = mergePricingWithCatalog(pricingNamespace as PricingCopy, {
      locale,
    });

    return {
      pricing: {
        title: pricing.title,
        description: pricing.description,
        groups: pricing.groups,
        items: pricing.items,
      },
      pageCopy,
    };
  } catch (error) {
    console.warn('[generator-pricing] failed to build pricing payload', {
      locale,
      error,
    });
    return null;
  }
}
