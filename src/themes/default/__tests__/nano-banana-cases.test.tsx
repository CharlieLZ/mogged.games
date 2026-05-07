// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NanoBananaCases,
  type NanoBananaCasesBlock,
} from '@/themes/default/blocks/nano-banana-cases';

function localizeHref(href: string) {
  if (!href.startsWith('/')) {
    return href;
  }

  return href === '/' ? '/zh' : `/zh${href}`;
}

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    createElement('a', { href: localizeHref(href), ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill,
    height,
    priority: _priority,
    sizes: _sizes,
    src,
    unoptimized: _unoptimized,
    width,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    fill?: boolean;
    height?: number;
    priority?: boolean;
    sizes?: string;
    unoptimized?: boolean;
    width?: number;
  }) =>
    createElement('img', {
      alt,
      'data-fill': fill ? 'true' : 'false',
      'data-height': height,
      'data-width': width,
      src,
      ...props,
    }),
}));

const cases: NanoBananaCasesBlock = {
  id: 'nano-banana-cases',
  title: 'Typical use cases of Nano Banana',
  description: 'See how Nano Banana can improve your design efficiency.',
  labels: {
    prompt: 'Prompt',
    previous: 'Previous use case',
    next: 'Next use case',
    copyPrompt: 'Copy prompt',
    openImage: 'Open image preview',
    closeImage: 'Close image preview',
    imageUnavailable: 'Image preview unavailable',
    enlargedImage: 'Enlarged use case image',
  },
  items: [
    {
      id: 'ecommerce-product-promotional-image',
      title: 'E-commerce product promotional image',
      description:
        'Transform your e-commerce game with stunning promotional visuals.',
      prompt:
        'Create a premium e-commerce promotional image using the uploaded product and model photos.',
      image: {
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/E-commerce.webp',
        alt: 'Nano Banana e-commerce product promotional image workflow',
      },
      button: {
        title: 'Try It Now',
        url: '/ai-image-generator?mode=image-to-image',
      },
    },
    {
      id: 'movie-storyboard-generation',
      title: 'Movie storyboard generation',
      description:
        'Input the initial frame photo and generate subsequent storyboard frames.',
      prompt:
        'Generate a coherent movie storyboard from the uploaded first frame while preserving character continuity.',
      image: {
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/FilmStoryboardProduction.webp',
        alt: 'Nano Banana movie storyboard generation workflow',
      },
      button: {
        title: 'Start Creating',
        url: '/ai-video-generator?mode=image-to-video',
      },
    },
  ],
};

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

describe('NanoBananaCases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders every use case expanded down the page without carousel controls', async () => {
    const rendered = await render(<NanoBananaCases cases={cases} />);

    const section = rendered.container.querySelector(
      '[data-slot="nano-banana-cases"]'
    );
    const cards = rendered.container.querySelectorAll(
      '[data-slot="nano-banana-case-card"]'
    );
    const images = rendered.container.querySelectorAll<HTMLImageElement>(
      '[data-slot="nano-banana-case-image"]'
    );
    const imageButtons = rendered.container.querySelectorAll(
      '[data-slot="nano-banana-case-image-button"]'
    );
    const caseTitles = rendered.container.querySelectorAll<HTMLHeadingElement>(
      '[data-slot="nano-banana-case-card"] h3'
    );
    const firstCardParagraphs =
      cards[0]?.querySelectorAll<HTMLParagraphElement>('p') ?? [];
    const firstCardLink = cards[0]?.querySelector<HTMLAnchorElement>('a');
    const secondCardLink = cards[1]?.querySelector<HTMLAnchorElement>('a');
    const copyButtons = rendered.container.querySelectorAll<HTMLButtonElement>(
      '[data-slot="nano-banana-case-copy"]'
    );
    const promptTexts = rendered.container.querySelectorAll(
      '[data-slot="nano-banana-case-prompt-text"]'
    );
    const previousButton = rendered.container.querySelector(
      '[data-slot="nano-banana-case-previous"]'
    );
    const nextButton = rendered.container.querySelector(
      '[data-slot="nano-banana-case-next"]'
    );
    const pagination = rendered.container.querySelector(
      '[data-slot="nano-banana-case-pagination"]'
    );

    expect(section).not.toBeNull();
    expect(section?.className).toContain('bg-gradient-to-b');
    expect(section?.className).not.toContain('bg-neutral-950');
    expect(section?.className).not.toContain('text-white');
    expect(rendered.container.textContent).toContain(
      'Typical use cases of Nano Banana'
    );
    expect(rendered.container.textContent).toContain(
      'E-commerce product promotional image'
    );
    expect(rendered.container.textContent).toContain(
      'Movie storyboard generation'
    );
    expect(cards).toHaveLength(2);
    expect(imageButtons[0]?.className).toContain('block');
    expect(imageButtons[0]?.className).toContain('aspect-[4/3]');
    expect(imageButtons[0]?.className).toContain('w-full');
    expect(imageButtons[0]?.className).toContain('min-h-[15rem]');
    expect(imageButtons[0]?.className).toContain('sm:min-h-[17rem]');
    expect(imageButtons[0]?.className).toContain('lg:min-h-[18rem]');
    expect(imageButtons[0]?.className).not.toContain('w-[58%]');
    expect(imageButtons[0]?.className).not.toContain('max-w-[19rem]');
    expect(images[0]?.getAttribute('data-fill')).toBe('false');
    expect(images[0]?.getAttribute('data-width')).toBe('1600');
    expect(images[0]?.getAttribute('data-height')).toBe('1200');
    expect(images[0]?.getAttribute('src')).toContain('/E-commerce.webp');
    expect(images[1]?.getAttribute('src')).toContain(
      '/FilmStoryboardProduction.webp'
    );
    expect(caseTitles[0]?.className).toContain('text-xl');
    expect(caseTitles[0]?.className).toContain('md:text-[1.625rem]');
    expect(firstCardParagraphs[0]?.className).toContain('text-[0.8125rem]');
    expect(firstCardParagraphs[1]?.className).toContain('text-xs');
    expect(firstCardParagraphs[2]?.className).toContain('text-[0.8125rem]');
    expect(firstCardLink?.className).toContain('text-sm');
    expect(firstCardLink?.getAttribute('href')).toBe(
      '/zh/ai-image-generator?mode=image-to-image'
    );
    expect(secondCardLink?.getAttribute('href')).toBe(
      '/zh/ai-video-generator?mode=image-to-video'
    );
    expect(copyButtons).toHaveLength(2);
    expect(promptTexts).toHaveLength(2);
    expect(promptTexts[0]?.className).not.toContain('line-clamp');
    expect(previousButton).toBeNull();
    expect(nextButton).toBeNull();
    expect(pagination).toBeNull();

    await rendered.click(
      '[data-case-id="movie-storyboard-generation"] [data-slot="nano-banana-case-copy"]'
    );

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      cases.items?.[1]?.prompt
    );

    await rendered.unmount();
  });

  it('opens an enlarged image preview and ignores incomplete case rows', async () => {
    const rendered = await render(
      <NanoBananaCases
        cases={{
          ...cases,
          items: [
            {
              id: 'missing-prompt',
              title: 'Missing prompt',
              description: 'This row should not render.',
              prompt: '',
              image: {
                src: 'https://example.com/missing.webp',
                alt: 'Missing prompt',
              },
            },
            cases.items![1]!,
          ],
        }}
      />
    );

    expect(rendered.container.textContent).not.toContain('Missing prompt');
    expect(rendered.container.textContent).toContain(
      'Movie storyboard generation'
    );

    await rendered.click('[data-slot="nano-banana-case-image-button"]');

    expect(
      document.body.querySelector('[data-slot="nano-banana-case-dialog"]')
    ).not.toBeNull();
    expect(document.body.textContent).toContain(cases.labels?.enlargedImage);
    const previewImage = document.body.querySelector<HTMLImageElement>(
      '[data-slot="nano-banana-case-dialog"] img'
    );
    expect(previewImage?.getAttribute('data-fill')).toBe('false');
    expect(previewImage?.getAttribute('data-width')).toBe('1600');
    expect(previewImage?.getAttribute('data-height')).toBe('1200');

    await rendered.click('[data-slot="nano-banana-case-dialog-close"]');

    expect(
      document.body.querySelector('[data-slot="nano-banana-case-dialog"]')
    ).toBeNull();

    await rendered.unmount();
  });

  it('uses a wide desktop dialog size for the enlarged preview', async () => {
    const rendered = await render(<NanoBananaCases cases={cases} />);

    await rendered.click('[data-slot="nano-banana-case-image-button"]');

    const previewDialog = document.body.querySelector<HTMLElement>(
      '[data-slot="nano-banana-case-dialog"]'
    );

    expect(previewDialog).not.toBeNull();
    expect(previewDialog?.className).toContain('max-w-[min(94vw,72rem)]');
    expect(previewDialog?.className).toContain('sm:max-w-[min(94vw,72rem)]');
    expect(previewDialog?.className).not.toContain('sm:max-w-lg');

    await rendered.unmount();
  });
});
