// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UseCasesShowcase } from '@/themes/default/blocks/use-cases-showcase';

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    createElement('a', { href, ...props }, children),
}));

async function renderUseCasesShowcase() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(UseCasesShowcase, {
        useCases: {
          id: 'use-cases',
          label: 'Creative directions',
          title: 'Creative Ways to Use mogged',
          description:
            'From short films to product ads - see what you can create.',
          items: [
            {
              title: 'Short Dramas & Cinematic Scenes',
              description: 'Trailer-ready dramatic beats.',
              video_url: 'https://example.com/drama.mp4',
              media_fit: 'cover',
              button: {
                title: 'Try It Now',
                url: '/ai-image-generator',
              },
            },
            {
              title: 'Product Hero Shots & Premium Demos',
              description: 'Glossy premium product showcase.',
              video_url: 'https://example.com/product.mp4',
              media_fit: 'contain',
              button: {
                title: 'Try It Now',
                url: '/ai-image-generator',
              },
            },
            {
              title: 'Lifestyle & Visual Storytelling',
              description: 'Portrait-led everyday motion sample.',
              video_url: 'https://example.com/lifestyle.mp4',
              media_fit: 'contain',
              button: {
                title: 'Try It Now',
                url: '/ai-image-generator',
              },
            },
            {
              title: 'Motion Hooks & Previs',
              description: 'Prototype scroll-stopping intros.',
              video_url: 'https://example.com/motion.mp4',
              media_fit: 'contain',
              button: {
                title: 'Try It Now',
                url: '/ai-image-generator',
              },
            },
          ],
        },
      })
    );
  });

  return {
    container,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('UseCasesShowcase block', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders a centered product row and a paired copy-over-video layout for the final two use cases', async () => {
    const rendered = await renderUseCasesShowcase();
    const copyCard = rendered.container.querySelector(
      '[data-slot="use-case-copy-card"]'
    );
    const videoShell = rendered.container.querySelector(
      '[data-slot="use-case-video-shell"]'
    );
    const rows = rendered.container.querySelectorAll(
      '[data-slot="use-case-row"]'
    );
    const videoFrames = rendered.container.querySelectorAll(
      '[data-slot="use-case-video-frame"]'
    );
    const portraitFrame = rendered.container.querySelector(
      '[data-media-orientation="portrait"]'
    );
    const title = rendered.container.querySelector(
      '[data-slot="use-case-title"]'
    );
    const description = rendered.container.querySelector(
      '[data-slot="use-case-description"]'
    );
    const cta = rendered.container.querySelector('[data-slot="use-case-cta"]');
    const ctaWrap = rendered.container.querySelector(
      '[data-slot="use-case-cta-wrap"]'
    );
    const pairedGrid = rendered.container.querySelector(
      '[data-slot="use-case-paired-grid"]'
    );
    const pairedCopyRow = rendered.container.querySelector(
      '[data-slot="use-case-paired-copy-row"]'
    );
    const pairedMediaRow = rendered.container.querySelector(
      '[data-slot="use-case-paired-media-row"]'
    );
    const pairedCopyLeft = rendered.container.querySelector(
      '[data-slot="use-case-paired-copy-left"]'
    );
    const pairedCopyRight = rendered.container.querySelector(
      '[data-slot="use-case-paired-copy-right"]'
    );
    const pairedMediaLeft = rendered.container.querySelector(
      '[data-slot="use-case-paired-media-left"]'
    );
    const pairedMediaRight = rendered.container.querySelector(
      '[data-slot="use-case-paired-media-right"]'
    );
    const productCopyWrap = rendered.container.querySelectorAll(
      '[data-slot="use-case-copy"]'
    )[1];

    expect(rendered.container.textContent).toContain(
      'Creative Ways to Use mogged'
    );

    const video = rendered.container.querySelector('video');
    const link = rendered.container.querySelector(
      'a[href="/ai-image-generator"]'
    );

    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('https://example.com/drama.mp4');
    expect(video?.autoplay).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
    expect(link?.textContent).toContain('Try It Now');
    expect(rows).toHaveLength(2);
    expect(copyCard?.className).toContain('max-w-[23rem]');
    expect(title?.className).toContain('text-base');
    expect(description?.className).toContain('text-sm');
    expect(description?.className).toContain('leading-6');
    expect(ctaWrap?.className).toContain('mt-3.5');
    expect(ctaWrap?.className).toContain('justify-start');
    expect(ctaWrap?.className).toContain('rtl:justify-end');
    expect(videoShell?.className).toContain('max-w-[23rem]');
    expect(videoShell?.className).toContain('bg-card/72');
    expect(videoShell?.className).not.toContain('min-h-');
    expect(videoFrames[0]?.className).toContain('max-w-[21.75rem]');
    expect(videoFrames[0]?.className).toContain('lg:max-w-[22.5rem]');
    expect(portraitFrame?.className).toContain('lg:h-[21rem]');
    expect(cta?.className).toContain('w-auto');
    expect(cta?.className).toContain('inline-flex');
    expect(cta?.className).toContain('h-10');
    expect(cta?.className).toContain('px-4');
    expect(cta?.className).toContain('rtl:flex-row-reverse');
    expect(cta?.className).toContain('rtl:text-right');
    expect(cta?.className).not.toContain('w-full');
    expect(productCopyWrap?.className).toContain('lg:self-center');
    expect(pairedGrid).not.toBeNull();
    expect(pairedCopyRow?.textContent).toContain(
      'Lifestyle & Visual Storytelling'
    );
    expect(pairedCopyRow?.textContent).toContain('Motion Hooks & Previs');
    expect(pairedMediaRow?.textContent).not.toContain(
      'Lifestyle & Visual Storytelling'
    );
    expect(pairedMediaRow?.textContent).not.toContain('Motion Hooks & Previs');
    expect(
      pairedCopyLeft?.querySelector('[data-slot="use-case-title"]')?.textContent
    ).toBe('Lifestyle & Visual Storytelling');
    expect(
      pairedCopyRight?.querySelector('[data-slot="use-case-title"]')
        ?.textContent
    ).toBe('Motion Hooks & Previs');
    expect(
      pairedMediaLeft?.querySelector('video')?.getAttribute('aria-label')
    ).toBe('Lifestyle & Visual Storytelling');
    expect(
      pairedMediaRight?.querySelector('video')?.getAttribute('aria-label')
    ).toBe('Motion Hooks & Previs');

    await rendered.unmount();
  });

  it('uses theme-token section styling instead of hard-coded dark classes', async () => {
    const rendered = await renderUseCasesShowcase();
    const section = rendered.container.querySelector('section');

    expect(section).not.toBeNull();
    expect(section?.className).not.toContain('bg-neutral-950');
    expect(section?.className).not.toContain('text-white');

    await rendered.unmount();
  });
});
