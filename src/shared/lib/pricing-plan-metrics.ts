import { getAIGenerationCostCredits } from '@/config/ai-model-registry';
import { getLocaleBcp47 } from '@/config/locale';
import type {
  PricingItem,
  PricingPageCopy,
} from '@/shared/types/blocks/pricing';

type PricingGenerationSpeedPageCopy = Pick<
  PricingPageCopy,
  'speed_fastest' | 'speed_priority' | 'speed_standard'
>;

type PricingSnapshotCreditsPageCopy = Pick<
  PricingPageCopy,
  'snapshot_credits_total_suffix' | 'snapshot_credits_monthly_suffix'
>;

type PricingSnapshotLabelPageCopy = Pick<
  PricingPageCopy,
  'snapshot_text_to_image' | 'snapshot_image_edit'
>;

export const DEFAULT_TEXT_TO_IMAGE_COST = getAIGenerationCostCredits(
  'text-to-image',
  {
    resolution: '1K',
  }
);

export const DEFAULT_IMAGE_EDIT_COST = getAIGenerationCostCredits(
  'image-to-image',
  {
    resolution: '2K',
  }
);

export function getPricingSnapshotMetrics({
  pageCopy,
}: {
  pageCopy: PricingSnapshotLabelPageCopy;
}) {
  return [
    {
      label: pageCopy.snapshot_text_to_image,
      credits: DEFAULT_TEXT_TO_IMAGE_COST,
    },
    {
      label: pageCopy.snapshot_image_edit,
      credits: DEFAULT_IMAGE_EDIT_COST,
    },
  ];
}

export function formatPricingMetricNumber(locale: string, value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return new Intl.NumberFormat(getLocaleBcp47(locale)).format(safeValue);
}

export function getPricingDisplayCredits(item: PricingItem) {
  return Math.max(0, item.display_credits ?? item.credits ?? 0);
}

export function getPricingGenerationSpeedLabel(
  item: PricingItem,
  pageCopy: PricingGenerationSpeedPageCopy
) {
  if (item.product_id.startsWith('max-')) {
    return pageCopy.speed_fastest;
  }

  if (item.product_id.startsWith('pro-')) {
    return pageCopy.speed_priority;
  }

  return pageCopy.speed_standard;
}

export function buildPricingSnapshotCreditsValue({
  item,
  locale,
  pageCopy,
}: {
  item: PricingItem;
  locale: string;
  pageCopy: PricingSnapshotCreditsPageCopy;
}) {
  const creditsLabel = formatPricingMetricNumber(
    locale,
    getPricingDisplayCredits(item)
  );
  const effectiveInterval = item.display_credits_interval || item.interval;

  if (effectiveInterval === 'month') {
    return `${creditsLabel} ${pageCopy.snapshot_credits_monthly_suffix}`;
  }

  return `${creditsLabel} ${pageCopy.snapshot_credits_total_suffix}`;
}

