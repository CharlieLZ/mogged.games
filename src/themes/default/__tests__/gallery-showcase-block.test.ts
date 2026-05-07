// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GalleryShowcase } from '@/themes/default/blocks/gallery-showcase';

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    fill?: boolean;
    priority?: boolean;
  }) => createElement('img', { alt, src, ...props }),
}));

async function renderGalleryShowcase() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(GalleryShowcase, {
        gallery: {
          id: 'gallery',
          label: 'Curated gallery',
          title: 'Homepage Gallery',
          description: 'Video-first homepage media',
          items: [
            {
              badge: 'Video sample',
              title: 'Flight through a sci-fi harbor',
              description: 'Preview video card',
              type: 'video',
              url: 'https://example.com/flight.mp4',
              image: {
                src: 'https://example.com/flight-poster.jpg',
                alt: 'Flight poster',
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

describe('GalleryShowcase block', () => {
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

  it('renders video cards when gallery items carry video sources', async () => {
    const rendered = await renderGalleryShowcase();
    const video = rendered.container.querySelector('video');
    const card = rendered.container.querySelector('[data-slot="gallery-card"]');
    const marquee = rendered.container.querySelector(
      '[data-slot="gallery-marquee"]'
    );
    const label = rendered.container.querySelector(
      '[data-slot="section-intro-label"]'
    );
    const title = rendered.container.querySelector(
      '[data-slot="section-intro-title"]'
    );
    const description = rendered.container.querySelector(
      '[data-slot="section-intro-description"]'
    );
    const cardTitle = rendered.container.querySelector(
      '[data-slot="gallery-card-title"]'
    );
    const cardDescription = rendered.container.querySelector(
      '[data-slot="gallery-card-description"]'
    );

    expect(video).not.toBeNull();
    expect(video?.autoplay).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
    expect(card).not.toBeNull();
    expect(marquee).not.toBeNull();
    expect(marquee?.getAttribute('data-direction')).toBe('right');
    expect(card?.className).toContain('w-[min(84vw,400px)]');
    expect(card?.className).toContain('rtl:text-right');
    expect(label?.className).toContain('text-xs');
    expect(title?.className).toContain('text-2xl');
    expect(title?.className).toContain('md:text-[1.75rem]');
    expect(description?.className).toContain('text-sm');
    expect(description?.className).toContain('md:text-base');
    expect(cardTitle?.className).toContain('text-base');
    expect(cardDescription?.className).toContain('text-sm');
    expect(cardDescription?.className).toContain('rtl:text-right');
    expect(cardTitle?.tagName).toBe('P');
    expect(rendered.container.querySelector('h3')).toBeNull();
    expect(rendered.container.textContent).not.toContain('Video sample');

    await rendered.unmount();
  });

  it('uses theme-token section styling instead of hard-coded dark classes', async () => {
    const rendered = await renderGalleryShowcase();
    const section = rendered.container.querySelector('section');

    expect(section).not.toBeNull();
    expect(section?.className).not.toContain('bg-neutral-950');
    expect(section?.className).not.toContain('text-white');

    await rendered.unmount();
  });
});
