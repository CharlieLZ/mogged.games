// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReplacePsShowcase } from '@/themes/default/blocks/replace-ps-showcase';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    loader: _loader,
    priority: _priority,
    sizes: _sizes,
    unoptimized,
    src,
    loading,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    loader?: unknown;
    loading?: 'eager' | 'lazy';
    priority?: boolean;
    sizes?: string;
    src: string;
    unoptimized?: boolean;
  }) =>
    createElement('img', {
      alt,
      'data-loading': loading,
      'data-unoptimized': unoptimized ? 'true' : 'false',
      src,
      ...props,
    }),
}));

async function renderShowcase(locale = 'en') {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(ReplacePsShowcase, { locale }));
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

describe('ReplacePsShowcase', () => {
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
    vi.restoreAllMocks();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the R2 before and after images with tabs, hover navigation, copy action, and modal preview', async () => {
    const rendered = await renderShowcase();
    const section = rendered.container.querySelector(
      '[data-slot="replace-ps-showcase"]'
    );
    const images = rendered.container.querySelectorAll(
      '[data-slot="replace-ps-image"]'
    );
    const previousButton = rendered.container.querySelector(
      '[data-slot="replace-ps-previous"]'
    );
    const nextButton = rendered.container.querySelector(
      '[data-slot="replace-ps-next"]'
    ) as HTMLButtonElement | null;
    const copyButton = rendered.container.querySelector(
      '[data-slot="replace-ps-copy"]'
    ) as HTMLButtonElement | null;
    const promptPanel = rendered.container.querySelector(
      '[data-slot="replace-ps-prompt-panel"]'
    ) as HTMLElement | null;
    const rotationButton = rendered.container.querySelector(
      '[data-slot="replace-ps-rotation-toggle"]'
    ) as HTMLButtonElement | null;

    expect(section?.textContent).toContain(
      'Skip the traditional Photoshop workflow'
    );
    expect(section?.textContent).toContain('Background Replacement');
    expect(section?.textContent).toContain('Change the background');
    expect(images).toHaveLength(2);
    expect(images[0]?.getAttribute('src')).toContain(
      'background-before-desert-jeep.webp'
    );
    expect(images[1]?.getAttribute('src')).toContain(
      'background-after-green-field-jeep.webp'
    );
    expect(
      (images[0]?.parentElement as HTMLElement | null)?.style.aspectRatio
    ).toBe('4 / 3');
    expect(
      (images[1]?.parentElement as HTMLElement | null)?.style.aspectRatio
    ).toBe('4 / 3');
    expect(images[0]?.parentElement?.className).toContain('min-h-[15rem]');
    expect(images[1]?.parentElement?.className).toContain('min-h-[15rem]');
    expect(
      [...images].every(
        (image) => image.getAttribute('data-unoptimized') === 'true'
      )
    ).toBe(true);
    expect(
      [...images].every(
        (image) => image.getAttribute('data-loading') === 'eager'
      )
    ).toBe(true);
    expect(previousButton?.className).toContain('group-hover:opacity-100');
    expect(nextButton?.className).toContain('group-hover:opacity-100');
    expect(promptPanel?.className).toContain('mx-auto');
    expect(promptPanel?.className).toContain('max-w-4xl');
    expect(promptPanel?.className).not.toContain('absolute');
    expect(copyButton?.textContent).toContain('Copy prompt');
    expect(rotationButton?.getAttribute('aria-label')).toBe(
      'Pause automatic showcase'
    );

    await act(async () => {
      copyButton?.click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('vast grassland')
    );
    expect(rendered.container.textContent).toContain('Copied');

    await act(async () => {
      (images[0] as HTMLImageElement).click();
    });

    expect(document.body.textContent).toContain(
      'Background Replacement before image'
    );

    await rendered.unmount();
  });

  it('auto-advances across categories and advances each category series per loop', async () => {
    const rendered = await renderShowcase();
    const getActiveSlide = () =>
      rendered.container
        .querySelector('[data-slot="replace-ps-slide"]')
        ?.getAttribute('data-active-id');
    const getActiveCategory = () =>
      rendered.container
        .querySelector('[data-slot="replace-ps-slide"]')
        ?.getAttribute('data-active-category-id');
    const lightingTab = rendered.container.querySelector(
      '[data-slot="replace-ps-tab-lighting-adjustment"]'
    ) as HTMLButtonElement | null;
    const colorTab = rendered.container.querySelector(
      '[data-slot="replace-ps-tab-color-change"]'
    ) as HTMLButtonElement | null;

    expect(getActiveSlide()).toBe('background-green-field');
    expect(getActiveCategory()).toBe('background-replacement');

    await act(async () => {
      vi.advanceTimersByTime(5200);
    });

    expect(getActiveSlide()).toBe('lighting-golden-hour');
    expect(getActiveCategory()).toBe('lighting-adjustment');
    expect(lightingTab?.getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      vi.advanceTimersByTime(5200);
    });

    expect(getActiveSlide()).toBe('color-blue-rose');
    expect(getActiveCategory()).toBe('color-change');

    await act(async () => {
      vi.advanceTimersByTime(5200);
      vi.advanceTimersByTime(5200);
    });

    expect(getActiveSlide()).toBe('background-snowy-winter');
    expect(getActiveCategory()).toBe('background-replacement');

    await act(async () => {
      colorTab?.click();
    });

    expect(getActiveSlide()).toBe('color-blue-rose');

    await rendered.unmount();
  });

  it('uses the main after arrows to switch the current category after series', async () => {
    const rendered = await renderShowcase();
    const getActiveSlide = () =>
      rendered.container
        .querySelector('[data-slot="replace-ps-slide"]')
        ?.getAttribute('data-active-id');
    const getActiveCategory = () =>
      rendered.container
        .querySelector('[data-slot="replace-ps-slide"]')
        ?.getAttribute('data-active-category-id');
    const getImages = () =>
      rendered.container.querySelectorAll('[data-slot="replace-ps-image"]');
    const previousButton = rendered.container.querySelector(
      '[data-slot="replace-ps-previous"]'
    ) as HTMLButtonElement | null;
    const nextButton = rendered.container.querySelector(
      '[data-slot="replace-ps-next"]'
    ) as HTMLButtonElement | null;

    expect(getActiveSlide()).toBe('background-green-field');
    expect(getActiveCategory()).toBe('background-replacement');

    await act(async () => {
      nextButton?.click();
    });

    expect(getActiveSlide()).toBe('background-snowy-winter');
    expect(getActiveCategory()).toBe('background-replacement');
    expect(getImages()[1]?.getAttribute('src')).toContain(
      'background-after-snowy-winter-jeep.webp'
    );
    expect(rendered.container.textContent).toContain('snowy winter landscape');

    await act(async () => {
      nextButton?.click();
      nextButton?.click();
    });

    expect(getActiveSlide()).toBe('background-green-field');
    expect(getActiveCategory()).toBe('background-replacement');

    await act(async () => {
      previousButton?.click();
    });

    expect(getActiveSlide()).toBe('background-urban-street');
    expect(getActiveCategory()).toBe('background-replacement');
    expect(getImages()[1]?.getAttribute('src')).toContain(
      'background-after-urban-street-jeep.webp'
    );

    await rendered.unmount();
  });

  it('lets the after preview modal switch within the current after series', async () => {
    const rendered = await renderShowcase();
    const getActiveSlide = () =>
      rendered.container
        .querySelector('[data-slot="replace-ps-slide"]')
        ?.getAttribute('data-active-id');
    const images = rendered.container.querySelectorAll(
      '[data-slot="replace-ps-image"]'
    );

    await act(async () => {
      (images[1] as HTMLImageElement).click();
    });

    const previewNext = document.body.querySelector(
      '[data-slot="replace-ps-preview-next"]'
    ) as HTMLButtonElement | null;

    expect(previewNext).not.toBeNull();

    await act(async () => {
      previewNext?.click();
    });

    const previewImage = document.body.querySelector(
      '[data-slot="replace-ps-preview-image"]'
    ) as HTMLImageElement | null;

    expect(getActiveSlide()).toBe('background-snowy-winter');
    expect(previewImage?.getAttribute('src')).toContain(
      'background-after-snowy-winter-jeep.webp'
    );
    expect(rendered.container.textContent).toContain('snowy winter landscape');

    await rendered.unmount();
  });

  it('uses a wider desktop dialog size for the enlarged preview', async () => {
    const rendered = await renderShowcase();
    const images = rendered.container.querySelectorAll(
      '[data-slot="replace-ps-image"]'
    );

    await act(async () => {
      (images[1] as HTMLImageElement).click();
    });

    const previewDialog = document.body.querySelector<HTMLElement>(
      '[data-slot="dialog-content"]'
    );
    const previewFrame = document.body.querySelector<HTMLElement>(
      '[data-slot="replace-ps-preview-image"]'
    )?.parentElement;

    expect(previewDialog).not.toBeNull();
    expect(previewDialog?.className).toContain('max-w-[min(94vw,72rem)]');
    expect(previewDialog?.className).toContain('sm:max-w-[min(94vw,72rem)]');
    expect(previewDialog?.className).not.toContain('sm:max-w-lg');
    expect(previewFrame?.className).toContain('max-w-[min(90vw,100vh)]');

    await rendered.unmount();
  });

  it('keeps rotating on pointer hover and can be paused from the explicit control', async () => {
    const rendered = await renderShowcase();
    const getActiveSlide = () =>
      rendered.container
        .querySelector('[data-slot="replace-ps-slide"]')
        ?.getAttribute('data-active-id');
    const rotator = rendered.container.querySelector(
      '[data-slot="replace-ps-rotator"]'
    );
    const rotationButton = rendered.container.querySelector(
      '[data-slot="replace-ps-rotation-toggle"]'
    ) as HTMLButtonElement | null;

    expect(getActiveSlide()).toBe('background-green-field');

    await act(async () => {
      rotator?.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          relatedTarget: document.body,
        })
      );
      vi.advanceTimersByTime(5200);
    });

    expect(getActiveSlide()).toBe('lighting-golden-hour');

    await act(async () => {
      rotationButton?.click();
    });

    await act(async () => {
      vi.advanceTimersByTime(5200);
    });

    expect(getActiveSlide()).toBe('lighting-golden-hour');
    expect(rotationButton?.getAttribute('aria-label')).toBe(
      'Play automatic showcase'
    );

    await act(async () => {
      rotationButton?.click();
    });

    await act(async () => {
      vi.advanceTimersByTime(5200);
    });

    expect(getActiveSlide()).toBe('color-blue-rose');

    await rendered.unmount();
  });

  it('renders Chinese UI copy and prompts for the Chinese homepage', async () => {
    const rendered = await renderShowcase('zh');

    expect(rendered.container.textContent).toContain('跳过传统 PS 流程');
    expect(rendered.container.textContent).toContain('复制提示词');
    expect(rendered.container.textContent).toContain('广阔草地');

    await rendered.unmount();
  });

  it('degrades to a readable fallback when an R2 image fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rendered = await renderShowcase();
    const image = rendered.container.querySelector(
      '[data-slot="replace-ps-image"]'
    ) as HTMLImageElement | null;

    await act(async () => {
      image?.dispatchEvent(new Event('error'));
    });

    expect(rendered.container.textContent).toContain('Preview unavailable');

    await rendered.unmount();
  });
});
