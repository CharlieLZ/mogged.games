import { describe, expect, it } from 'vitest';

import {
  DEFAULT_IMAGE_EDIT_COST,
  DEFAULT_TEXT_TO_IMAGE_COST,
  getPricingSnapshotMetrics,
} from './pricing-plan-metrics';

const pageCopy = {
  snapshot_text_to_image: '1K image generation',
  snapshot_image_edit: '2K image edit',
} as const;

describe('getPricingSnapshotMetrics', () => {
  it('returns image-first pricing examples for image pricing surfaces', () => {
    expect(
      getPricingSnapshotMetrics({
        pageCopy,
      })
    ).toEqual([
      {
        label: '1K image generation',
        credits: DEFAULT_TEXT_TO_IMAGE_COST,
      },
      {
        label: '2K image edit',
        credits: DEFAULT_IMAGE_EDIT_COST,
      },
    ]);
  });
});
