import { describe, expect, it } from 'vitest';

import { IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL } from '@/shared/lib/imageeditorai-media';

import { NANO_IMAGE_GALLERY_ITEMS } from './nano-image-gallery';

describe('NANO_IMAGE_GALLERY_ITEMS', () => {
  it('keeps every vertical prompt example aligned to an R2 image', () => {
    const ids = new Set<string>();

    expect(NANO_IMAGE_GALLERY_ITEMS).toHaveLength(43);

    for (const item of NANO_IMAGE_GALLERY_ITEMS) {
      expect(item.id).toMatch(/^[a-z0-9-]+$/);
      expect(item.title.trim()).toBe(item.title);
      expect(item.prompt.trim().length).toBeGreaterThan(40);
      expect(item.category.trim().length).toBeGreaterThan(0);
      expect(item.image).toMatch(
        new RegExp(`^${IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL}/`)
      );
      expect(item.image).not.toContain('/images/');
      expect(ids.has(item.id)).toBe(false);

      ids.add(item.id);
    }
  });

  it('preserves known image and prompt pairings instead of relying on filename order', () => {
    expect(
      NANO_IMAGE_GALLERY_ITEMS.find(
        (item) => item.id === 'hyper-realistic-underwater-portrait'
      )
    ).toEqual(
      expect.objectContaining({
        title: 'Hyper-realistic Underwater Portrait',
        image: expect.stringContaining(
          'Hyper-realistic%20underwater%20portrait%2C%20left%20half%20of%20face%20.webp'
        ),
        prompt: expect.stringContaining('submerged in water'),
      })
    );
    expect(
      NANO_IMAGE_GALLERY_ITEMS.find(
        (item) => item.id === 'luxury-tennis-editorial'
      )
    ).toEqual(
      expect.objectContaining({
        title: 'Luxury Tennis Editorial 2x2 Grid',
        image: expect.stringContaining(
          'Luxury%20Tennis%20Editorial%202x2%20Grid%20with%20Elegant%20Woman%20.jpg'
        ),
        prompt: expect.stringContaining('luxury_tennis_editorial_2x2_grid'),
      })
    );
  });
});
