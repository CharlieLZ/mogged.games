import { describe, expect, it } from 'vitest';

import {
  buildSeedanceProfitabilityRows,
  OFFICIAL_REPLICATE_RATE_SOURCES,
  parseSeedanceProfitabilityArgs,
} from './seedance-profitability-report';

describe('seedance profitability report script', () => {
  it('parses the requested profitability knobs', () => {
    expect(
      parseSeedanceProfitabilityArgs([
        '--scene=reference-to-video',
        '--duration=10',
        '--resolution=480p',
        '--standard',
        '--has-video-input',
        '--plan=max-monthly',
      ])
    ).toMatchObject({
      scene: 'reference-to-video',
      duration: 10,
      resolution: '480p',
      fast: false,
      hasVideoInput: true,
      planIds: ['max-monthly'],
    });
    expect(OFFICIAL_REPLICATE_RATE_SOURCES.standard).toContain(
      'replicate.com/bytedance/seedance-2.0'
    );
  });

  it('computes the thin-margin yearly heavy reference scenario', () => {
    const [row] = buildSeedanceProfitabilityRows({
      scene: 'reference-to-video',
      duration: 15,
      resolution: '720p',
      fast: false,
      hasVideoInput: true,
      planIds: ['max-yearly'],
    });

    expect(row.productId).toBe('max-yearly');
    expect(row.credits).toBe(225);
    expect(row.revenueUsd).toBeCloseTo(5.596875, 6);
    expect(row.officialCostUsd).toBeCloseTo(4.35, 6);
    expect(row.grossMarginPct).toBeCloseTo(22.278057, 4);
  });
});
