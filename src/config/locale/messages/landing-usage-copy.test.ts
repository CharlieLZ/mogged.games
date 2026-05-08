import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

describe('landing usage copy', () => {
  it('uses the new English four-step image editing copy', () => {
    const copy = replaceBrandTokensDeep(enLanding);

    expect(copy.usage.title).toBe('How to Play mogged in 4 Steps');
    expect(copy.usage.description).toContain(
      'From camera check to leaderboard climb'
    );
    expect(copy.usage.className).toContain('bg-muted/20');
    expect(copy.usage.className).not.toContain('bg-foreground');
    expect(copy.usage.items).toHaveLength(4);
    expect(copy.usage.items[0]?.title).toBe('Enable Your Camera');
    expect(copy.usage.items[1]?.title).toBe('Get Your Face Scanned');
    expect(copy.usage.items[2]?.title).toBe('Enter a Mog Battle');
    expect(copy.usage.items[3]?.title).toBe('Climb the Leaderboard');
  });

  it('uses the new Chinese four-step image editing copy', () => {
    const copy = replaceBrandTokensDeep(zhLanding);

    expect(copy.usage.title).toBe('How to Play mogged in 4 Steps');
    expect(copy.usage.description).toContain(
      'From camera check to leaderboard climb'
    );
    expect(copy.usage.className).toContain('bg-muted/20');
    expect(copy.usage.className).not.toContain('bg-foreground');
    expect(copy.usage.items).toHaveLength(4);
    expect(copy.usage.items[0]?.title).toBe('Enable Your Camera');
    expect(copy.usage.items[1]?.title).toBe('Get Your Face Scanned');
    expect(copy.usage.items[2]?.title).toBe('Enter a Mog Battle');
    expect(copy.usage.items[3]?.title).toBe('Climb the Leaderboard');
  });
});
