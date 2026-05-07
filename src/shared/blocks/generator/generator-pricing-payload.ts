import type { Pricing, PricingPageCopy } from '@/shared/types/blocks/pricing';

export type GeneratorPricingPageCopy = Pick<
  PricingPageCopy,
  | 'current_plan'
  | 'currency_selector'
  | 'processing'
  | 'snapshot_title'
  | 'snapshot_credits'
  | 'snapshot_credits_total_suffix'
  | 'snapshot_credits_monthly_suffix'
  | 'snapshot_generation_speed'
  | 'snapshot_text_to_image'
  | 'snapshot_image_edit'
  | 'snapshot_credit_cost'
  | 'speed_standard'
  | 'speed_priority'
  | 'speed_fastest'
>;

export type GeneratorPricingCatalog = Pick<
  Pricing,
  'title' | 'description' | 'groups' | 'items'
>;

export type GeneratorPricingPayload = {
  pricing: GeneratorPricingCatalog;
  pageCopy: GeneratorPricingPageCopy;
};
