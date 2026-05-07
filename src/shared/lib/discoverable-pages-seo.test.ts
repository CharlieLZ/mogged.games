import { describe, expect, it } from 'vitest';

import { DISCOVERABLE_PAGES } from './discoverable-pages';

function getPage(path: string) {
  const page = DISCOVERABLE_PAGES.find((entry) => entry.path === path);
  expect(page).toBeDefined();
  return page!;
}

describe('discoverable page seo copy', () => {
  it('keeps core page titles and descriptions aligned with search intent', () => {
    expect(getPage('/').title).toBe('mogged');
    expect(getPage('/').description).toContain('free online image editor');
    expect(getPage('/pricing').title).toContain('Pricing');
    expect(getPage('/pricing').description).toContain('Pricing');
    expect(getPage('/pricing').description).toContain('credits');
    expect(getPage('/ai-video-generator').title).toContain(
      'AI Video Generator'
    );
    expect(getPage('/ai-video-generator').description).toContain(
      'text-to-video'
    );
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/ai-video-generator/text-to-video'
      )
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/ai-video-generator/image-to-video'
      )
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/ai-video-generator/reference-to-video'
      )
    ).toBe(false);
    expect(getPage('/ai-image-generator').title).toContain(
      'AI Image Generator'
    );
    expect(getPage('/ai-image-generator').description).toContain(
      'AI image generator'
    );
    expect(getPage('/ai-image-generator').description).toContain(
      'text-to-image'
    );
    expect(
      DISCOVERABLE_PAGES.some((entry) => entry.path === '/ai-image-generator')
    ).toBe(true);
    expect(
      DISCOVERABLE_PAGES.some((entry) =>
        entry.path.startsWith('/ai-image-generator/')
      )
    ).toBe(false);
  });

  it('keeps mission discoverable while leaving noindex tools and policy pages out of public discovery', () => {
    expect(getPage('/mission').title).toContain('Mission');
    expect(
      DISCOVERABLE_PAGES.some((entry) => entry.path === '/free-tools')
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/free-tools/image-converter'
      )
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/free-tools/image-cropper'
      )
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/free-tools/video-converter'
      )
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some((entry) => entry.path === '/privacy-policy')
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some((entry) => entry.path === '/terms-of-service')
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some((entry) => entry.path === '/refund-policy')
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/acceptable-use-policy'
      )
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/content-moderation-policy'
      )
    ).toBe(false);
    expect(
      DISCOVERABLE_PAGES.some(
        (entry) => entry.path === '/ai-wrapper-disclaimer'
      )
    ).toBe(false);
  });
});
