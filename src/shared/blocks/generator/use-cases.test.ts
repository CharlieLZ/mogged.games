import { describe, expect, it } from 'vitest';

import { IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL } from '@/shared/lib/imageeditorai-media';

import { USE_CASES } from './use-cases';

describe('USE_CASES', () => {
  it('keeps before and after examples backed by R2 images', () => {
    const ids = new Set<string>();

    expect(USE_CASES.length).toBeGreaterThanOrEqual(24);

    for (const item of USE_CASES) {
      expect(item.id).toMatch(/^[a-z0-9-]+$/);
      expect(item.title.trim()).toBe(item.title);
      expect(item.prompt.trim().length).toBeGreaterThan(40);
      expect(item.beforeImage).toMatch(
        new RegExp(`^${IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL}/`)
      );
      expect(item.afterImage).toMatch(
        new RegExp(`^${IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL}/`)
      );
      expect(item.beforeImage).not.toBe(item.afterImage);
      expect(item.beforeImage).not.toContain('/images/');
      expect(item.afterImage).not.toContain('/images/');
      expect(ids.has(item.id)).toBe(false);

      ids.add(item.id);
    }
  });

  it('preserves known before and after pairings from docs/nano-prompt', () => {
    expect(
      USE_CASES.find((item) => item.id === 'caricature-trend')
    ).toEqual(
      expect.objectContaining({
        title: 'Caricature Trend',
        beforeImage: expect.stringContaining('engineer-portrait.webp'),
        afterImage: expect.stringContaining('engineer-portrait-effect.webp'),
        prompt: expect.stringContaining('humorous caricature'),
      })
    );
    expect(
      USE_CASES.find((item) => item.id === 'rim-light-portrait')
    ).toEqual(
      expect.objectContaining({
        title: 'Rim Light Portrait',
        beforeImage: expect.stringContaining('rim-light-portrait-before.webp'),
        afterImage: expect.stringContaining('rim-light-portrait-after.webp'),
        prompt: expect.stringContaining('Rim Light'),
      })
    );
  });
});
