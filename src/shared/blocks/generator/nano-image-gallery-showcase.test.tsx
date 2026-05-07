// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IMAGE_GENERATOR_APPLY_PROMPT_EVENT } from '@/shared/lib/image-generator-prompt-event';

import {
  NanoImageGalleryShowcase,
  type NanoImageGalleryItem,
} from './nano-image-gallery-showcase';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    priority: _priority,
    sizes: _sizes,
    ...props
  }: {
    alt?: string;
    src?: string;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
  }) => createElement('img', { alt, src, ...props }),
}));

const sampleItems: NanoImageGalleryItem[] = [
  {
    id: 'portrait-sample',
    title: 'Portrait Sample',
    category: 'Portrait & Avatar',
    image: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/portrait.webp',
    prompt: 'Create a cinematic portrait with soft light and natural skin.',
  },
  {
    id: 'product-sample',
    title: 'Product Sample',
    category: 'Product & Commercial',
    image: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/product.webp',
    prompt: 'Create a premium product campaign with glass reflections.',
  },
];

async function render(element: ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  return {
    container,
    async click(selector: string) {
      const target =
        container.querySelector<HTMLElement>(selector) ||
        document.body.querySelector<HTMLElement>(selector);
      expect(target).not.toBeNull();

      await act(async () => {
        target?.click();
      });
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('NanoImageGalleryShowcase', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders a left-moving gallery with hover prompt actions and a full details dialog', async () => {
    const copied: string[] = [];
    const dispatched: Array<{
      prompt: string;
      mode?: string;
      sourceImageUrl?: string;
    }> = [];
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn(async (value: string) => {
          copied.push(value);
        }),
      },
    });
    window.addEventListener(IMAGE_GENERATOR_APPLY_PROMPT_EVENT, (event) => {
      dispatched.push(
        (event as CustomEvent<(typeof dispatched)[number]>).detail
      );
    });

    const rendered = await render(
      <NanoImageGalleryShowcase items={sampleItems} />
    );

    expect(
      rendered.container.querySelector('[data-slot="image-generator-gallery"]')
    ).not.toBeNull();
    const description = rendered.container.querySelector(
      '[data-slot="nano-gallery-description"]'
    );
    expect(description?.textContent).toContain(
      'Browse ready-to-use image prompts, copy a prompt, reuse an image as reference, or send the idea straight back to the generator.'
    );
    expect(description?.className).toContain('lg:whitespace-nowrap');
    expect(
      rendered.container.querySelector('[data-slot="nano-gallery-marquee"]')
    ).not.toBeNull();
    expect(rendered.container.textContent).toContain('Portrait Sample');
    expect(rendered.container.textContent).toContain(
      'AI image editor example for Portrait Sample. Open mogged to inspect the result and reuse the full prompt.'
    );
    expect(
      rendered.container.querySelector('[data-slot="nano-gallery-card-title"]')
        ?.tagName
    ).toBe('P');
    expect(rendered.container.querySelector('h3')).toBeNull();

    await rendered.click('[data-slot="nano-gallery-copy"]');
    expect(copied).toEqual([sampleItems[0].prompt]);

    await rendered.click('[data-slot="nano-gallery-use-prompt"]');
    expect(dispatched.at(-1)).toEqual({
      prompt: sampleItems[0].prompt,
      mode: 'text-to-image',
    });

    await rendered.click('[data-slot="nano-gallery-card-open"]');
    expect(
      document.body.querySelector('[data-slot="nano-gallery-dialog"]')
    ).not.toBeNull();
    expect(document.body.textContent).toContain('Categories:');
    expect(document.body.textContent).toContain(
      'Tip: English prompts usually deliver better generation quality'
    );

    await rendered.click('[data-slot="nano-gallery-use-reference"]');
    expect(dispatched.at(-1)).toEqual({
      prompt: sampleItems[0].prompt,
      mode: 'image-to-image',
      sourceImageUrl: sampleItems[0].image,
    });

    await rendered.unmount();
  });

  it('links gallery images to the image-to-video workflow with the image prefilled', async () => {
    const rendered = await render(
      <NanoImageGalleryShowcase items={sampleItems} />
    );

    await rendered.click('[data-slot="nano-gallery-card-open"]');

    const imageToVideoLink = document.body.querySelector<HTMLAnchorElement>(
      '[data-slot="nano-gallery-image-to-video"]'
    );
    expect(imageToVideoLink).not.toBeNull();
    expect(imageToVideoLink?.getAttribute('href')).toBe(
      `/ai-video-generator?imageUrl=${encodeURIComponent(sampleItems[0].image)}&mode=image-to-video`
    );

    await rendered.unmount();
  });
});
