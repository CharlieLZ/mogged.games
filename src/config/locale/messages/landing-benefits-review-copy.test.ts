import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

describe('landing benefits review copy', () => {
  it('uses the English creator-feedback review carousel copy', () => {
    const copy = replaceBrandTokensDeep(enLanding);

    expect(copy.benefits.label).toBe('Creator feedback');
    expect(copy.benefits.title).toBe('Edited faster. Approved faster.');
    expect(copy.benefits.description).toContain('mogged');
    expect(copy.benefits.className).toContain('bg-muted/20');
    expect(copy.benefits.className).not.toContain('bg-foreground');
    expect(copy.benefits.items).toHaveLength(3);
    expect(copy.benefits.items[0]?.title).toBe('James Carter');
    expect(copy.benefits.items[0]?.role).toBe(
      'Small Business Ecommerce Lead'
    );
    expect(copy.benefits.items[0]?.quote).toContain('product photos');
    expect(copy.benefits.items[0]?.video?.src).toContain('/review1.webm');
    expect(copy.benefits.items[0]?.image?.src).toContain('/review1.webp');
    expect(copy.benefits.description).not.toContain('one decision at a time');
  });

  it('uses the Chinese creator-feedback review carousel copy', () => {
    const copy = replaceBrandTokensDeep(zhLanding);

    expect(copy.benefits.label).toBe('创作者反馈');
    expect(copy.benefits.title).toBe('改得更快，也更容易过稿。');
    expect(copy.benefits.description).toContain('mogged');
    expect(copy.benefits.className).toContain('bg-muted/20');
    expect(copy.benefits.className).not.toContain('bg-foreground');
    expect(copy.benefits.items).toHaveLength(3);
    expect(copy.benefits.items[0]?.title).toBe('James Carter');
    expect(copy.benefits.items[0]?.role).toContain('电商');
    expect(copy.benefits.items[0]?.quote).toContain('商品图');
    expect(copy.benefits.items[0]?.video?.src).toContain('/review1.webm');
    expect(copy.benefits.items[0]?.image?.src).toContain('/review1.webp');
    expect(copy.benefits.description).not.toContain('决策顺序');
  });
});
