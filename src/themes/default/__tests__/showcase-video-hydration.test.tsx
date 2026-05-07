// @vitest-environment jsdom

import { act, createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BenefitsReviewCarousel } from '@/themes/default/blocks/benefits-review-carousel';
import { GalleryShowcase } from '@/themes/default/blocks/gallery-showcase';
import { UseCasesShowcase } from '@/themes/default/blocks/use-cases-showcase';

vi.mock('@/shared/components/ui/scroll-animation', () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    createElement('a', { href, ...props }, children),
}));

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

const HYDRATION_WARNING_PATTERNS = [
  /hydration/i,
  /did not match/i,
  /server rendered html/i,
];

function collectHydrationWarnings(messages: string[]) {
  return messages.filter((message) =>
    HYDRATION_WARNING_PATTERNS.some((pattern) => pattern.test(message))
  );
}

function mutateVideoClassesBeforeHydration(container: HTMLDivElement) {
  container.querySelectorAll('video').forEach((video) => {
    video.className = `${video.className} mtz-vlc-pjdbe`.trim();
  });
}

async function hydrateWithMutatedVideoClasses(
  element: React.ReactElement
): Promise<string[]> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(element);
  mutateVideoClassesBeforeHydration(container);

  const consoleMessages: string[] = [];
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation((...args: unknown[]) => {
      consoleMessages.push(args.map(String).join(' '));
    });
  const consoleWarnSpy = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args: unknown[]) => {
      consoleMessages.push(args.map(String).join(' '));
    });

  let root: ReturnType<typeof hydrateRoot> | null = null;

  try {
    await act(async () => {
      root = hydrateRoot(container, element);
      await Promise.resolve();
    });

    return collectHydrationWarnings(consoleMessages);
  } finally {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();

    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }

    container.remove();
  }
}

describe('showcase video hydration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('ignores extension-added video classes in use case showcase media during hydration', async () => {
    const messages = await hydrateWithMutatedVideoClasses(
      <UseCasesShowcase
        useCases={{
          id: 'use-cases',
          label: 'Creative directions',
          title: 'Creative Ways to Use mogged',
          description: 'From short films to product ads.',
          items: [
            {
              title: 'Product Photo Cleanup & Variants',
              description: 'Sharper product edits.',
              video_url: 'https://example.com/drama.mp4',
              media_fit: 'cover',
            },
          ],
        }}
      />
    );

    expect(messages).toEqual([]);
  });

  it('ignores extension-added video classes in gallery showcase media during hydration', async () => {
    const messages = await hydrateWithMutatedVideoClasses(
      <GalleryShowcase
        gallery={{
          id: 'gallery',
          label: 'Curated gallery',
          title: 'Homepage Gallery',
          description: 'Video-first homepage media',
          items: [
            {
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
        }}
      />
    );

    expect(messages).toEqual([]);
  });

  it('ignores extension-added video classes in benefits review media during hydration', async () => {
    const messages = await hydrateWithMutatedVideoClasses(
      <BenefitsReviewCarousel
        benefits={{
          id: 'benefits',
          label: 'Real feedback',
          title: 'Real creations. Real feedback.',
          description:
            'See how different creators use mogged in practice.',
          items: [
            {
              title: 'James Carter',
              role: 'Small Business Marketing Video Producer',
              quote: 'Our team is small, so I wear many hats.',
              rating: 5,
              video: {
                src: 'https://example.com/review1.webm',
                poster: 'https://example.com/review1.webp',
              },
              image: {
                src: 'https://example.com/review1-avatar.webp',
                alt: 'James Carter avatar',
              },
            },
          ],
        }}
      />
    );

    expect(messages).toEqual([]);
  });
});
