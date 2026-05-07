import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

describe('landing promo banner copy', () => {
  it('keeps mobile promo detail copy compact in English and Chinese', () => {
    const enCopy = replaceBrandTokensDeep(enLanding);
    const zhCopy = replaceBrandTokensDeep(zhLanding);

    expect(enCopy.promo_banner.mobile_eyebrow).toBe('');
    expect(enCopy.promo_banner.mobile_detail).toBe('Yearly plans');
    expect(enCopy.promo_banner.mobile_detail).not.toContain('Ends Apr 30');

    expect(zhCopy.promo_banner.mobile_eyebrow).toBe('');
    expect(zhCopy.promo_banner.mobile_detail).toBe('包年方案');
    expect(zhCopy.promo_banner.mobile_detail).not.toContain('Apr 30');
  });
});
