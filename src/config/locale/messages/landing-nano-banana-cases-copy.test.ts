import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';

const publicRoot = path.resolve(process.cwd(), 'public');

describe('landing nano banana cases copy', () => {
  it('ships English homepage Nano Banana cases with first-party images and prompt copy labels', () => {
    expect(enLanding.nano_banana_cases.title).toBe('How mogged Works');
    expect(enLanding.nano_banana_cases.description).toContain(
      'Your path from first camera check to Slayer rank'
    );
    expect(enLanding.nano_banana_cases.labels.copyPrompt).toBe('Copy');
    expect(enLanding.nano_banana_cases.items).toHaveLength(3);
    expect(enLanding.nano_banana_cases.items[0]?.title).toBe('Camera Check');
    expect(enLanding.nano_banana_cases.items[0]?.image.src).toBe(
      '/images/landing/nano-banana-cases/ecommerce-product-promotional-image.webp'
    );
    expect(enLanding.nano_banana_cases.items[1]?.image.src).toBe(
      '/images/landing/nano-banana-cases/movie-storyboard-generation.webp'
    );
    expect(enLanding.nano_banana_cases.items[2]?.image.src).toBe(
      '/images/landing/nano-banana-cases/sticker-generation.webp'
    );
    expect(
      enLanding.nano_banana_cases.items.map((item) =>
        existsSync(path.join(publicRoot, item.image.src))
      )
    ).toEqual([true, true, true]);
  });

  it('keeps Chinese homepage Nano Banana cases synchronized with the English structure', () => {
    expect(zhLanding.nano_banana_cases.title).toBe('How mogged Works');
    expect(zhLanding.nano_banana_cases.labels.copyPrompt).toBe('Copy');
    expect(zhLanding.nano_banana_cases.items).toHaveLength(
      enLanding.nano_banana_cases.items.length
    );
    expect(zhLanding.nano_banana_cases.items.map((item) => item.id)).toEqual(
      enLanding.nano_banana_cases.items.map((item) => item.id)
    );
    expect(
      zhLanding.nano_banana_cases.items.map((item) => item.image.src)
    ).toEqual(enLanding.nano_banana_cases.items.map((item) => item.image.src));
  });
});
