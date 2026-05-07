// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GptImageComparisonShowcase } from '@/themes/default/blocks/gpt-image-comparison-showcase';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    loader,
    priority: _priority,
    sizes: _sizes,
    unoptimized,
    src,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    loader?: (props: {
      quality?: number;
      src: string;
      width: number;
    }) => string;
    priority?: boolean;
    sizes?: string;
    src: string;
    unoptimized?: boolean;
  }) =>
    createElement('img', {
      alt,
      'data-fill': _fill ? 'true' : 'false',
      'data-loader-output': loader?.({ src, width: 640, quality: 75 }) ?? '',
      'data-unoptimized': unoptimized ? 'true' : 'false',
      src,
      ...props,
    }),
}));

async function renderShowcase(locale = 'en') {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(GptImageComparisonShowcase, { locale }));
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

describe('GptImageComparisonShowcase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the paired R2 images, prompt copy action, hover navigation, and modal preview trigger', async () => {
    const rendered = await renderShowcase();
    const section = rendered.container.querySelector(
      '[data-slot="gpt-image-comparison-showcase"]'
    );
    const imageButtons = rendered.container.querySelectorAll(
      '[data-slot="gpt-image-comparison-image-button"]'
    );
    const images = rendered.container.querySelectorAll(
      '[data-slot="gpt-image-comparison-image"]'
    );
    const previousButton = rendered.container.querySelector(
      '[data-slot="gpt-image-comparison-previous"]'
    );
    const nextButton = rendered.container.querySelector(
      '[data-slot="gpt-image-comparison-next"]'
    );
    const copyButton = rendered.container.querySelector(
      '[data-slot="gpt-image-comparison-copy"]'
    ) as HTMLButtonElement | null;
    const indicatorRail = rendered.container.querySelector(
      '[data-slot="gpt-image-comparison-indicators"]'
    );
    const indicators = rendered.container.querySelectorAll(
      '[data-slot="gpt-image-comparison-indicator"]'
    );

    expect(section?.textContent).toContain('GPT Image 2 vs Nano Banana Pro');
    expect(section?.textContent).toContain('Side-by-side comparison');
    expect(section?.textContent).toContain('Design a modern, professional');
    expect(imageButtons).toHaveLength(2);
    expect(images).toHaveLength(2);
    expect(images[0]?.getAttribute('src')).toContain(
      'gpt-image-2-demo1-1.webp'
    );
    expect(images[1]?.getAttribute('src')).toContain(
      'gpt-image-2-demo1-2.webp'
    );
    expect(
      [...images].every(
        (image) => image.getAttribute('data-unoptimized') === 'true'
      )
    ).toBe(true);
    expect(
      [...images].every((image) =>
        image
          .getAttribute('data-loader-output')
          ?.startsWith('https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/')
      )
    ).toBe(true);
    expect(
      [...images].some((image) =>
        image.getAttribute('data-loader-output')?.includes('/_next/image')
      )
    ).toBe(false);
    expect(previousButton?.className).toContain('group-hover:opacity-100');
    expect(nextButton?.className).toContain('group-hover:opacity-100');
    expect(copyButton?.textContent).toContain('Copy prompt');
    expect(indicatorRail?.className).toContain('bg-card');
    expect(indicatorRail?.className).toContain('border-border');
    expect(indicators).toHaveLength(3);
    expect(indicators[0]?.className).toContain('bg-primary');
    expect(indicators[1]?.className).toContain('bg-muted-foreground/45');
    expect(imageButtons[0]?.getAttribute('aria-label')).toContain(
      'Open image preview'
    );
    expect(imageButtons[0]?.getAttribute('disabled')).toBeNull();

    await act(async () => {
      copyButton?.click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('premium milk powder')
    );
    expect(rendered.container.textContent).toContain('Copied');

    await act(async () => {
      (imageButtons[0] as HTMLButtonElement).click();
    });

    const previewCloseButton = document.body.querySelector<HTMLElement>(
      '[data-slot="gpt-image-comparison-dialog-close"]'
    );

    expect(document.body.textContent).toContain(
      'GPT Image 2 output for premium milk powder poster'
    );
    expect(previewCloseButton?.getAttribute('aria-label')).toBe(
      'Close image preview'
    );

    await rendered.unmount();
  });

  it('auto-advances slides and supports manual previous and next navigation', async () => {
    const rendered = await renderShowcase();
    const getActiveSlide = () =>
      rendered.container
        .querySelector('[data-slot="gpt-image-comparison-slide"]')
        ?.getAttribute('data-active-id');
    const previousButton = rendered.container.querySelector(
      '[data-slot="gpt-image-comparison-previous"]'
    ) as HTMLButtonElement | null;
    const nextButton = rendered.container.querySelector(
      '[data-slot="gpt-image-comparison-next"]'
    ) as HTMLButtonElement | null;

    expect(getActiveSlide()).toBe('demo-1');

    await act(async () => {
      vi.advanceTimersByTime(2999);
    });

    expect(getActiveSlide()).toBe('demo-1');

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(getActiveSlide()).toBe('demo-2');

    await act(async () => {
      nextButton?.click();
    });

    expect(getActiveSlide()).toBe('demo-3');

    await act(async () => {
      previousButton?.click();
    });

    expect(getActiveSlide()).toBe('demo-2');

    await rendered.unmount();
  });

  it('uses a content-hugging dialog with a visibly larger square preview', async () => {
    const rendered = await renderShowcase();
    const imageButtons = rendered.container.querySelectorAll(
      '[data-slot="gpt-image-comparison-image-button"]'
    );

    await act(async () => {
      (imageButtons[0] as HTMLButtonElement).click();
    });

    const previewDialog = document.body.querySelector<HTMLElement>(
      '[data-slot="dialog-content"]'
    );
    const previewFrame = document.body.querySelector<HTMLElement>(
      '[data-slot="gpt-image-comparison-preview-frame"]'
    );
    const previewCloseButton = document.body.querySelector<HTMLElement>(
      '[data-slot="gpt-image-comparison-dialog-close"]'
    );

    expect(previewDialog).not.toBeNull();
    expect(previewDialog?.className).toContain('w-auto');
    expect(previewDialog?.className).toContain('max-w-none');
    expect(previewDialog?.className).toContain('sm:max-w-none');
    expect(previewDialog?.className).toContain('bg-transparent');
    expect(previewDialog?.className).toContain('border-none');
    expect(previewDialog?.className).toContain('p-0');
    expect(previewDialog?.className).toContain('shadow-none');
    expect(previewDialog?.className).not.toContain('sm:max-w-lg');
    expect(previewFrame?.className).toContain('shadow-2xl');
    expect(previewDialog?.style.width).toBe('fit-content');
    expect(previewDialog?.style.maxWidth).toBe('none');
    expect(previewFrame?.style.width).toBe('88vw');
    expect(previewFrame?.style.height).toBe('88vw');
    expect(previewFrame?.style.maxWidth).toBe('44rem');
    expect(previewFrame?.style.maxHeight).toBe('44rem');
    expect(previewCloseButton?.getAttribute('aria-label')).toBe(
      'Close image preview'
    );

    await rendered.unmount();
  });

  it('renders the comparison and preview images without next/image fill sizing', async () => {
    const rendered = await renderShowcase();
    const imageButtons = rendered.container.querySelectorAll(
      '[data-slot="gpt-image-comparison-image-button"]'
    );
    const inlineImages = rendered.container.querySelectorAll<HTMLImageElement>(
      '[data-slot="gpt-image-comparison-image"]'
    );

    expect(inlineImages).toHaveLength(2);
    expect(
      [...inlineImages].every((image) => image.getAttribute('data-fill') === 'false')
    ).toBe(true);
    expect(
      [...inlineImages].every(
        (image) => !(image.getAttribute('class') || '').includes('h-full')
      )
    ).toBe(true);

    await act(async () => {
      (imageButtons[0] as HTMLButtonElement).click();
    });

    const previewImage = document.body.querySelector<HTMLImageElement>(
      '[data-slot="gpt-image-comparison-preview-frame"] img'
    );

    expect(previewImage?.getAttribute('data-fill')).toBe('false');
    expect(previewImage?.getAttribute('class')).not.toContain('h-full');

    await rendered.unmount();
  });

  it('renders Chinese UI copy when the homepage locale is zh', async () => {
    const rendered = await renderShowcase('zh');

    expect(rendered.container.textContent).toContain('提示词');
    expect(rendered.container.textContent).toContain('复制提示词');
    expect(rendered.container.textContent).toContain('GPT Image 2 vs Nano Banana Pro');

    await rendered.unmount();
  });
});
