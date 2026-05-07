import { Button } from '@/types/blocks/base/button';

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  is_featured?: boolean;
}

export interface PricingCurrency {
  currency: string; // currency code
  amount: number; // price amount
  price: string; // price text
  original_price: string; // original price text
  payment_product_id?: string;
  payment_providers?: string[];
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;

  currency: string; // default currency
  amount: number; // default price amount
  price?: string; // default price text
  original_price?: string; // default original price text
  currencies?: PricingCurrency[]; // alternative currencies with different prices

  unit?: string;
  features_title?: string;
  features?: string[];
  button?: Button;
  tip?: string;
  is_featured?: boolean;
  interval: 'one-time' | 'day' | 'week' | 'month' | 'year';
  product_id: string;
  payment_product_id?: string;
  payment_providers?: string[];
  product_name?: string;
  plan_name?: string;

  credits?: number;
  display_credits?: number;
  display_credits_interval?: 'one-time' | 'day' | 'week' | 'month' | 'year';
  valid_days?: number;
  group?: string;
}

export interface PricingPageCopy {
  currency_selector: string;
  current_plan: string;
  processing: string;
  metric_cost_per_100_credits: string;
  snapshot_title: string;
  snapshot_credits: string;
  snapshot_credits_total_suffix: string;
  snapshot_credits_monthly_suffix: string;
  snapshot_generation_speed: string;
  snapshot_text_to_image: string;
  snapshot_image_edit: string;
  snapshot_credit_cost: string;
  speed_standard: string;
  speed_priority: string;
  speed_fastest: string;
}

export interface Pricing {
  id?: string;
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  items?: PricingItem[];
  groups?: PricingGroup[];
  className?: string;
  sr_only_title?: string;
}
