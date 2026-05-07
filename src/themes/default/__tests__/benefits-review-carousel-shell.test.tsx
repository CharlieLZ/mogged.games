// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BenefitsReviewCarouselShell } from '@/themes/default/blocks/benefits-review-carousel-shell';

vi.mock('@/shared/components/ui/scroll-animation', () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
  }) => createElement('img', { alt, src, ...props }),
}));

async function renderBenefitsReviewCarouselShell() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(BenefitsReviewCarouselShell, {
        benefits: {
          id: 'benefits',
          label: 'Creator feedback',
          title: 'Edited faster. Approved faster.',
          description:
            'See how different teams use mogged in practice before final delivery.',
          className: 'bg-muted/20',
          items: [
            {
              title: 'James Carter',
              role: 'Small Business Ecommerce Lead',
              quote:
                'mogged helps me test cleaner backgrounds and lighting directions.',
              rating: 5,
              video: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review1.webm',
                alt: 'Product still concept generated with mogged',
              },
              image: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review1.webp',
                alt: 'James Carter avatar',
              },
            },
            {
              title: 'Sophie Leclerc',
              role: 'Wedding Photographer',
              quote: 'mogged helps me prototype portrait directions.',
              rating: 5,
              video: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review2.webm',
                alt: 'Wedding portrait concept preview',
              },
              image: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review2.webp',
                alt: 'Sophie Leclerc avatar',
              },
            },
            {
              title: 'Jasper Tomas',
              role: 'YouTube Thumbnail Designer',
              quote: 'mogged helps me test more cover directions.',
              rating: 5,
              video: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review3.webm',
                alt: 'Thumbnail concept preview',
              },
              image: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review3.webp',
                alt: 'Jasper Tomas avatar',
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

describe('BenefitsReviewCarouselShell block', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the interactive review video carousel used by the landing page', async () => {
    const rendered = await renderBenefitsReviewCarouselShell();

    const video = rendered.container.querySelector(
      '[data-slot="benefits-review-video"]'
    ) as HTMLVideoElement | null;
    const indicators = rendered.container.querySelectorAll(
      '[data-slot="benefits-review-indicator"]'
    );

    expect(
      rendered.container.querySelector(
        '[data-slot="benefits-review-section-fallback"]'
      )
    ).toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="benefits-review-section"]')
    ).not.toBeNull();
    expect(video?.getAttribute('src')).toContain('/review1.webm');
    expect(indicators).toHaveLength(3);
    expect(rendered.container.textContent).toContain(
      'Edited faster. Approved faster.'
    );

    await rendered.unmount();
  });
});
