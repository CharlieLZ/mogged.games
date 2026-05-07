// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VideoGeneratorPreview } from './video-generator-preview';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'ja',
}));

vi.mock('@/shared/blocks/common/lazy-image', () => ({
  LazyImage: ({
    alt,
    src,
    wrapperClassName,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    wrapperClassName?: string;
  }) =>
    createElement(
      'span',
      {
        className: wrapperClassName,
        'data-slot': 'mock-lazy-image-wrapper',
      },
      createElement('img', { alt, src, ...props })
    ),
}));

function getActiveSampleImage(container: HTMLElement) {
  return container.querySelector(
    '[data-slot="generator-sample-preview-frame"] img'
  ) as HTMLImageElement | null;
}

function getSampleCarouselTrack(container: HTMLElement) {
  return container.querySelector(
    '[data-slot="generator-sample-carousel-track"]'
  ) as HTMLElement | null;
}

async function renderVideoGeneratorPreview(
  props?: Partial<ComponentProps<typeof VideoGeneratorPreview>>
) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(VideoGeneratorPreview, {
        mode: 'text-to-video',
        generatedMedia: [],
        isGenerating: false,
        showSamplePreview: true,
        resultsUseVideoIcon: true,
        errorMessage: null,
        downloadingMediaId: null,
        onDownloadMedia: vi.fn(),
        canRewritePrompt: false,
        isRewritingPrompt: false,
        onRewritePrompt: vi.fn(),
        ...props,
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

describe('VideoGeneratorPreview sample carousel', () => {
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

  it('rotates between the two portrait sample videos in the empty preview state', async () => {
    const rendered = await renderVideoGeneratorPreview();
    const previewCard = rendered.container.querySelector(
      '[data-slot="video-generator-preview"]'
    );
    const dots = rendered.container.querySelectorAll(
      '[data-slot="generator-sample-carousel-dot"]'
    );
    const previousButton = rendered.container.querySelector(
      '[data-slot="generator-sample-carousel-previous"]'
    );
    const carousel = rendered.container.querySelector(
      '[data-slot="generator-sample-carousel"]'
    );
    const initialFrame = rendered.container.querySelector(
      '[data-slot="generator-sample-preview-frame"]'
    );
    const initialVideo = rendered.container.querySelector(
      '[data-slot="generator-sample-preview-video"]'
    ) as HTMLVideoElement | null;

    expect(previewCard?.className).toContain('bg-card/90');
    expect(previewCard?.className).not.toContain('bg-white');
    expect(dots).toHaveLength(2);
    expect(initialFrame?.className).toContain('aspect-[9/16]');
    expect(initialFrame?.className).toContain('max-w-[18rem]');
    expect(previousButton).toBeNull();
    expect(carousel?.className).toContain('mt-4');
    expect(carousel?.className).not.toContain('absolute');
    expect(initialVideo?.getAttribute('src')).toContain('vertical-1.mp4');

    await act(async () => {
      vi.advanceTimersByTime(4500);
    });

    const rotatedFrame = rendered.container.querySelector(
      '[data-slot="generator-sample-preview-frame"]'
    );
    const rotatedVideo = rendered.container.querySelector(
      '[data-slot="generator-sample-preview-video"]'
    ) as HTMLVideoElement | null;

    expect(rotatedFrame?.className).toContain('aspect-[9/16]');
    expect(rotatedVideo?.getAttribute('src')).toContain('vertical-2.mp4');

    await rendered.unmount();
  });

  it('rotates uploaded sample images and exposes previous and next controls', async () => {
    const rendered = await renderVideoGeneratorPreview({
      mode: 'text-to-image',
      resultsUseVideoIcon: false,
      translationNamespace: 'ai.image.generator',
    });
    const dots = rendered.container.querySelectorAll(
      '[data-slot="generator-sample-carousel-dot"]'
    );
    const previousButton = rendered.container.querySelector(
      '[data-slot="generator-sample-carousel-previous"]'
    ) as HTMLButtonElement | null;
    const nextButton = rendered.container.querySelector(
      '[data-slot="generator-sample-carousel-next"]'
    ) as HTMLButtonElement | null;
    const initialImage = getActiveSampleImage(rendered.container);
    const initialTrack = getSampleCarouselTrack(rendered.container);
    const initialSlide = initialTrack?.querySelector(
      '[data-slot="generator-sample-carousel-slide"]'
    );
    const initialImageWrapper = initialTrack?.querySelector(
      '[data-slot="mock-lazy-image-wrapper"]'
    );

    expect(dots).toHaveLength(4);
    expect(previousButton).not.toBeNull();
    expect(nextButton).not.toBeNull();
    expect(initialTrack?.className).toContain('transition-transform');
    expect(initialTrack?.style.transform).toBe('translateX(-0%)');
    expect(initialSlide?.className).toContain('min-w-full');
    expect(initialSlide?.className).toContain('max-w-full');
    expect(initialSlide?.className).toContain('shrink-0');
    expect(initialImageWrapper?.className).toContain('h-full');
    expect(initialImageWrapper?.className).toContain('w-full');
    expect(initialImage?.className).toContain('object-contain');
    expect(initialImage?.getAttribute('src')).toBe(
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/TextRendering.webp'
    );

    await act(async () => {
      vi.advanceTimersByTime(4500);
    });

    expect(getSampleCarouselTrack(rendered.container)?.style.transform).toBe(
      'translateX(-100%)'
    );

    const rotatedPreviousButton = rendered.container.querySelector(
      '[data-slot="generator-sample-carousel-previous"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      rotatedPreviousButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(getSampleCarouselTrack(rendered.container)?.style.transform).toBe(
      'translateX(-0%)'
    );

    await rendered.unmount();
  });

  it('shows a prompt rewrite action when the error is safety related', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onRewritePrompt = vi.fn();

    await act(async () => {
      root.render(
        createElement(VideoGeneratorPreview, {
          mode: 'text-to-video',
          generatedMedia: [],
          isGenerating: false,
          showSamplePreview: false,
          resultsUseVideoIcon: true,
          errorMessage: 'error_nsfw_blocked',
          downloadingMediaId: null,
          onDownloadMedia: vi.fn(),
          canRewritePrompt: true,
          isRewritingPrompt: false,
          onRewritePrompt,
        })
      );
    });

    const rewriteButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('form.rewrite_prompt')
    );

    expect(container.textContent).toContain('form.rewrite_prompt_hint');
    expect(rewriteButton).toBeDefined();

    await act(async () => {
      rewriteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRewritePrompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });
});
