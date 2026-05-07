// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BenefitsReviewCarousel } from '@/themes/default/blocks/benefits-review-carousel';

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

async function renderBenefitsReviewCarousel() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(BenefitsReviewCarousel, {
        benefits: {
          id: 'benefits',
          label: 'Real feedback',
          title: 'Real creations. Real feedback.',
          description:
            'See how different creators use mogged in practice before you open the studio.',
          className: 'bg-muted/20',
          items: [
            {
              title: 'James Carter',
              role: 'Small Business Marketing Video Producer',
              quote:
                'Our team is small, so I wear many hats - including making promotional videos.',
              rating: 5,
              video: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review1.webm',
                alt: 'Review video one',
              },
              image: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review1.webp',
                alt: 'James Carter avatar',
              },
            },
            {
              title: 'Sophie Leclerc',
              role: 'Wedding Videographer',
              quote:
                'Couples want unique save-the-date videos and personalized photo collages.',
              rating: 5,
              video: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review2.webm',
                alt: 'Review video two',
              },
              image: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review2.webp',
                alt: 'Sophie Leclerc avatar',
              },
            },
            {
              title: 'Jasper Tomas',
              role: 'YouTube Vlogger',
              quote:
                'Thumbnails and intro clips make or break a video’s success.',
              rating: 5,
              video: {
                src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/review3.webm',
                alt: 'Review video three',
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

describe('BenefitsReviewCarousel block', () => {
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

  it('renders the review carousel with review video, avatar, stars, and slide controls', async () => {
    const rendered = await renderBenefitsReviewCarousel();
    const section = rendered.container.querySelector(
      '[data-slot="benefits-review-section"]'
    );
    const panel = rendered.container.querySelector(
      '[data-slot="benefits-review-panel"]'
    );
    const video = rendered.container.querySelector(
      '[data-slot="benefits-review-video"]'
    ) as HTMLVideoElement | null;
    const avatar = rendered.container.querySelector(
      '[data-slot="benefits-review-avatar"]'
    ) as HTMLImageElement | null;
    const stars = rendered.container.querySelectorAll(
      '[data-slot="benefits-review-star"]'
    );
    const indicators = rendered.container.querySelectorAll(
      '[data-slot="benefits-review-indicator"]'
    );
    const previousButton = rendered.container.querySelector(
      '[data-slot="benefits-review-previous"]'
    ) as HTMLButtonElement | null;
    const nextButton = rendered.container.querySelector(
      '[data-slot="benefits-review-next"]'
    ) as HTMLButtonElement | null;
    const previousWrap = previousButton?.parentElement as HTMLElement | null;
    const nextWrap = nextButton?.parentElement as HTMLElement | null;

    expect(section?.className).toContain('bg-muted/20');
    expect(section?.className).not.toContain('bg-foreground');
    expect(panel).not.toBeNull();
    expect(rendered.container.textContent).toContain(
      'Real creations. Real feedback.'
    );
    expect(rendered.container.textContent).toContain('James Carter');
    expect(video?.getAttribute('src')).toContain('/review1.webm');
    expect(avatar?.getAttribute('src')).toContain('/review1.webp');
    expect(stars).toHaveLength(5);
    expect(indicators).toHaveLength(3);
    expect(previousButton).not.toBeNull();
    expect(nextButton).not.toBeNull();
    expect(previousButton?.innerHTML).toContain('rtl:rotate-180');
    expect(nextButton?.innerHTML).toContain('rtl:rotate-180');
    expect(previousWrap?.className).toContain('rtl:md:left-auto');
    expect(previousWrap?.className).toContain('rtl:md:right-0');
    expect(nextWrap?.className).toContain('rtl:md:right-auto');
    expect(nextWrap?.className).toContain('rtl:md:left-0');

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(rendered.container.textContent).toContain('Sophie Leclerc');
    expect(rendered.container.textContent).not.toContain('James Carter');

    await act(async () => {
      previousButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(rendered.container.textContent).toContain('James Carter');

    await rendered.unmount();
  });

  it('keeps auto-advancing even when the viewport is hovered', async () => {
    const rendered = await renderBenefitsReviewCarousel();
    const viewport = rendered.container.querySelector(
      '[data-slot="benefits-review-viewport"]'
    ) as HTMLElement | null;

    expect(rendered.container.textContent).toContain('James Carter');

    await act(async () => {
      viewport?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersToNextTimer();
    });

    expect(rendered.container.textContent).toContain('Sophie Leclerc');

    await act(async () => {
      vi.advanceTimersToNextTimer();
    });

    expect(rendered.container.textContent).toContain('Jasper Tomas');

    await rendered.unmount();
  });
});
