import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

describe('landing benefits review copy', () => {
  it('uses the English creator-feedback review carousel copy', () => {
    const copy = replaceBrandTokensDeep(enLanding);

    expect(copy.benefits.label).toBe('Player Testimonials');
    expect(copy.benefits.title).toBe('The Arena Speaks for Itself');
    expect(copy.benefits.description).toContain('mogged');
    expect(copy.benefits.className).toContain('bg-muted/20');
    expect(copy.benefits.className).not.toContain('bg-foreground');
    expect(copy.benefits.items).toHaveLength(3);
    expect(copy.benefits.items[0]?.title).toBe('xQc Fan');
    expect(copy.benefits.items[0]?.role).toBe('Twitch Streamer');
    expect(copy.benefits.items[0]?.quote).toContain('mogging');
    expect(copy.benefits.items[0]?.video?.src).toContain(
      'pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review1.webm'
    );
    expect(copy.benefits.items[0]?.image?.src).toContain(
      'pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review1.webp'
    );
    expect(copy.benefits.description).not.toContain('one decision at a time');
  });

  it('uses the Chinese creator-feedback review carousel copy', () => {
    const copy = replaceBrandTokensDeep(zhLanding);

    expect(copy.benefits.label).toBe('Player Testimonials');
    expect(copy.benefits.title).toBe('The Arena Speaks for Itself');
    expect(copy.benefits.description).toContain('mogged');
    expect(copy.benefits.className).toContain('bg-muted/20');
    expect(copy.benefits.className).not.toContain('bg-foreground');
    expect(copy.benefits.items).toHaveLength(3);
    expect(copy.benefits.items[0]?.title).toBe('xQc Fan');
    expect(copy.benefits.items[0]?.role).toBe('Twitch Streamer');
    expect(copy.benefits.items[0]?.quote).toContain('mogging');
    expect(copy.benefits.items[0]?.video?.src).toContain(
      'pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review1.webm'
    );
    expect(copy.benefits.items[0]?.image?.src).toContain(
      'pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review1.webp'
    );
    expect(copy.benefits.description).not.toContain('决策顺序');
  });
});
