import { describe, expect, it } from 'vitest';

import { getPromoBannerCopy } from '@/config/website/promo-banner-copy';
import { replaceBrandTokens } from '@/shared/lib/brand';
import { GUEST_DAILY_QUOTA_LIMIT } from '@/shared/lib/viewer-quota';

describe('promo banner copy', () => {
  it('keeps the first-visit free quota message aligned in English and Chinese', () => {
    const guestQuotaLimit = String(GUEST_DAILY_QUOTA_LIMIT);
    const enCopy = getPromoBannerCopy('en');
    const zhCopy = getPromoBannerCopy('zh');

    expect(enCopy.quotaLabel).toBe('Free Quota');
    expect(enCopy.quotaSuffix).toBe('');
    expect(enCopy.popoverTitle).toBe('Early access gift');
    expect(enCopy.popoverBody).toContain('mogged');
    expect(enCopy.popoverFooter).toContain('feedback');
    expect(
      replaceBrandTokens(enCopy.popoverBody).replace(
        '{{guest_daily_quota_limit}}',
        guestQuotaLimit
      )
    ).toContain(guestQuotaLimit);
    expect(replaceBrandTokens(enCopy.popoverBody)).not.toContain(
      '{{guest_credits_amount}}'
    );
    expect(replaceBrandTokens(enCopy.popoverBody)).not.toContain('early bird');
    expect(replaceBrandTokens(enCopy.popoverBody)).not.toContain('Apr 30');

    expect(zhCopy.quotaLabel).toBe('免费额度');
    expect(zhCopy.quotaSuffix).toBe('');
    expect(zhCopy.popoverTitle).toBe('早期体验赠额');
    expect(zhCopy.popoverBody).toContain('mogged');
    expect(zhCopy.popoverFooter).toContain('反馈');
    expect(
      replaceBrandTokens(zhCopy.popoverBody).replace(
        '{{guest_daily_quota_limit}}',
        guestQuotaLimit
      )
    ).toContain(guestQuotaLimit);
    expect(replaceBrandTokens(zhCopy.popoverBody)).not.toContain(
      '{{guest_credits_amount}}'
    );
    expect(replaceBrandTokens(zhCopy.popoverBody)).not.toContain('早鸟');
    expect(replaceBrandTokens(zhCopy.popoverBody)).not.toContain('包年');
  });

  it('removes the trailing quota suffix from every public locale', () => {
    for (const locale of [
      'en',
      'zh',
      'de',
      'fr',
      'es',
      'ja',
      'it',
      'ko',
      'ar',
    ]) {
      const copy = getPromoBannerCopy(locale);

      expect(copy.quotaSuffix).toBe('');
      expect(copy.quotaLabel.trim().length).toBeGreaterThan(0);
      expect(copy.popoverTitle.trim().length).toBeGreaterThan(0);
      expect(copy.popoverBody).toContain('{{guest_daily_quota_limit}}');
      expect(copy.popoverBody.length).toBeLessThanOrEqual(110);
      expect(copy.popoverFooter.length).toBeLessThanOrEqual(70);
    }
  });
});
