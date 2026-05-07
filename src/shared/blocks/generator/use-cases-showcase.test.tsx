// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UseCasesShowcase, type UseCase } from './use-cases-showcase';

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
    src,
    fill: _fill,
    priority: _priority,
    sizes: _sizes,
    unoptimized: _unoptimized,
    ...props
  }: {
    alt?: string;
    src?: string;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
    unoptimized?: boolean;
  }) => createElement('img', { alt, src, ...props }),
}));

const sampleItems: UseCase[] = [
  {
    id: 'portrait-sample',
    title: 'Portrait Sample',
    beforeImage:
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/portrait-before.webp',
    previewBeforeImage:
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/portrait-before-original.webp',
    afterImage:
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/portrait-after.webp',
    previewAfterImage:
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/portrait-after-original.webp',
    prompt: 'Create a cinematic portrait with soft light and natural skin.',
  },
  {
    id: 'product-sample',
    title: 'Product Sample',
    beforeImage:
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/product-before.webp',
    previewBeforeImage:
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/product-before-original.webp',
    afterImage:
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/product-after.webp',
    previewAfterImage:
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/product-after-original.webp',
    prompt: 'Create a premium product campaign with glass reflections.',
  },
];

const manySampleItems: UseCase[] = Array.from({ length: 16 }, (_, index) => {
  const item = sampleItems[index % sampleItems.length]!;

  return {
    ...item,
    id: `${item.id}-${index}`,
    title: `${item.title} ${index + 1}`,
  };
});

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

describe('UseCasesShowcase', () => {
  const shareSpy = vi.fn(async () => undefined);
  const clipboardSpy = vi.fn(async () => undefined);

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    shareSpy.mockClear();
    clipboardSpy.mockClear();
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: clipboardSpy,
      },
      share: shareSpy,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the original before/after showcase layout with preview and details dialogs', async () => {
    const rendered = await render(<UseCasesShowcase items={sampleItems} />);

    expect(
      rendered.container.querySelector(
        '[data-slot="image-generator-use-cases"]'
      )
    ).not.toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="use-case-section-header"]')
    ).toBeNull();
    expect(
      rendered.container.querySelector(
        '[data-slot="use-case-section-description"]'
      )
    ).toBeNull();
    expect(rendered.container.textContent).not.toContain(
      'Compare before and after examples for portraits, product shots, seasonal edits, and style transfers before sending the prompt back to the generator.'
    );
    expect(
      rendered.container.querySelector('[data-slot="use-case-card"]')?.className
    ).toContain('max-w-7xl');
    expect(
      rendered.container.querySelector('[data-slot="use-case-card"]')?.className
    ).toContain('rounded-2xl');
    expect(
      rendered.container.querySelector('[data-slot="use-case-before-image"]')
    ).not.toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="use-case-after-image"]')
    ).not.toBeNull();
    expect(
      (
        rendered.container.querySelector(
          '[data-slot="use-case-before-image"]'
        ) as HTMLElement | null
      )?.className
    ).not.toContain('aspect-[4/3]');
    expect(
      (
        rendered.container.querySelector(
          '[data-slot="use-case-before-image"]'
        ) as HTMLElement | null
      )?.className
    ).not.toContain('md:aspect-square');
    expect(
      (
        rendered.container.querySelector(
          '[data-slot="use-case-before-image"]'
        ) as HTMLElement | null
      )?.style.aspectRatio
    ).toBe('6 / 5');
    const stagePrev = rendered.container.querySelector(
      '[data-slot="use-case-prev"]'
    );
    const stageNext = rendered.container.querySelector(
      '[data-slot="use-case-next"]'
    );
    expect(stagePrev).not.toBeNull();
    expect(stageNext).not.toBeNull();
    expect(stagePrev?.className).toContain(
      'hidden rounded-full md:inline-flex'
    );
    expect(stageNext?.className).toContain(
      'hidden rounded-full md:inline-flex'
    );
    expect(rendered.container.textContent).toContain('Portrait Sample');
    expect(
      rendered.container.querySelector('[data-slot="use-case-title"]')
        ?.className
    ).toContain('md:text-2xl');
    expect(rendered.container.textContent).toContain(
      'mogged before-and-after example for Portrait Sample. Open the prompt details to review the full image edit workflow.'
    );

    await rendered.click('[data-slot="use-case-next"]');
    expect(rendered.container.textContent).toContain('Product Sample');

    await rendered.click('[data-slot="use-case-before-image"]');
    const previewDialog = document.body.querySelector(
      '[data-slot="use-case-image-dialog"]'
    ) as HTMLElement | null;
    expect(previewDialog).not.toBeNull();
    expect(previewDialog?.className).toContain('w-fit');
    expect(previewDialog?.className).not.toContain('w-full');
    const previewImage = document.body.querySelector<HTMLImageElement>(
      '[data-slot="use-case-image-preview-image"]'
    );
    expect(previewImage).not.toBeNull();
    expect(previewDialog?.style.maxWidth).toBe('68rem');
    expect(previewImage?.getAttribute('src')).toBe(
      sampleItems[1].previewBeforeImage
    );
    expect(previewImage?.className).toContain('h-auto');
    expect(previewImage?.className).toContain('w-auto');
    expect(previewImage?.className).toContain('object-contain');
    expect(previewImage?.style.maxWidth).toBe('64rem');
    expect(previewImage?.style.maxHeight).toBe('40rem');
    const previewStage = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Close before image preview"]'
    );
    expect(previewStage).not.toBeNull();
    expect(previewStage?.className).toContain('mx-auto');
    expect(previewStage?.className).toContain('w-auto');
    expect(previewStage?.className).not.toContain('h-full w-full');
    expect(previewStage?.style.maxWidth).toBe('64rem');
    expect(previewStage?.style.maxHeight).toBe('40rem');
    expect(
      document.body.querySelector('[data-slot="use-case-image-preview-prev"]')
    ).not.toBeNull();
    expect(
      document.body.querySelector('[data-slot="use-case-image-preview-next"]')
    ).not.toBeNull();

    await rendered.click('[data-slot="use-case-image-preview-next"]');
    const nextPreviewImage = document.body.querySelector<HTMLImageElement>(
      '[data-slot="use-case-image-preview-image"]'
    );
    expect(nextPreviewImage?.getAttribute('src')).toBe(
      sampleItems[1].previewAfterImage
    );

    await rendered.click('[data-slot="use-case-image-dialog-close"]');
    await rendered.click('[data-slot="use-case-details-open"]');
    const detailsDialog = document.body.querySelector(
      '[data-slot="use-case-details-dialog"]'
    ) as HTMLElement | null;
    expect(detailsDialog).not.toBeNull();
    expect(detailsDialog?.className).toContain('gap-0');
    expect(detailsDialog?.style.width).toBe('calc(100vw - 2rem)');
    expect(detailsDialog?.style.maxWidth).toBe('88rem');
    expect(detailsDialog?.style.maxHeight).toBe('calc(100vh - 2rem)');
    expect(
      document.body.querySelector('[data-slot="use-case-details-layout"]')
        ?.className
    ).toContain('lg:grid-cols-2');
    const detailsMedia = document.body.querySelector(
      '[data-slot="use-case-details-media"]'
    );
    expect(detailsMedia).not.toBeNull();
    expect(detailsMedia?.className).not.toContain('lg:w-3/5');
    const detailsCopy = document.body.querySelector(
      '[data-slot="use-case-details-copy"]'
    ) as HTMLElement | null;
    expect(detailsCopy).not.toBeNull();
    expect(detailsCopy?.className).toContain('overflow-y-auto');
    expect(detailsCopy?.style.maxHeight).toBe('calc(100vh - 2rem)');
    expect(
      document.body.querySelector('[data-slot="use-case-comparison-slider"]')
        ?.className
    ).not.toContain('aspect-[4/3]');
    expect(
      (
        document.body.querySelector(
          '[data-slot="use-case-comparison-slider"]'
        ) as HTMLElement | null
      )?.style.aspectRatio
    ).toBe('6 / 5');
    expect(document.body.textContent).toContain('Prompt');
    expect(document.body.textContent).toContain('Share');
    expect(document.body.textContent).toContain('Try it now');
    expect(document.body.textContent).not.toContain('Use as Reference');
    expect(document.body.textContent).not.toContain('Image to Video');

    await rendered.unmount();
  });

  it('keeps the active use case prompt preview in the original two-line layout', async () => {
    const rendered = await render(<UseCasesShowcase items={sampleItems} />);

    const promptPreview = rendered.container.querySelector(
      '[data-slot="use-case-prompt-preview"]'
    );
    expect(promptPreview).not.toBeNull();
    expect(promptPreview?.className).toContain('line-clamp-2');
    expect(promptPreview?.className).toContain('md:text-base');
    expect(promptPreview?.className).not.toContain('line-clamp-1');

    await rendered.unmount();
  });

  it('centers the use cases heading inside the showcase card', async () => {
    const rendered = await render(<UseCasesShowcase items={sampleItems} />);

    const heading = rendered.container.querySelector(
      '[data-slot="use-case-heading"]'
    );
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe('What mogged Can Edit Fast');
    expect(heading?.className).toContain('text-center');

    await rendered.unmount();
  });

  it('uses a taller details comparison frame for portrait-heavy use cases', async () => {
    const rendered = await render(<UseCasesShowcase items={sampleItems} />);

    await rendered.click('[data-slot="use-case-details-open"]');

    const comparisonSlider = document.body.querySelector(
      '[data-slot="use-case-comparison-slider"]'
    ) as HTMLElement | null;
    expect(comparisonSlider).not.toBeNull();
    expect(comparisonSlider?.style.aspectRatio).toBe('6 / 5');
    expect(comparisonSlider?.className).not.toContain('aspect-[4/3]');

    await rendered.unmount();
  });

  it('keeps the full use case count obvious in the navigation rail', async () => {
    const rendered = await render(<UseCasesShowcase items={manySampleItems} />);

    const navigation = rendered.container.querySelector(
      '[data-slot="use-case-dot-navigation"]'
    );
    expect(navigation).not.toBeNull();
    expect(navigation?.className).toContain('flex-nowrap');
    expect(navigation?.className).toContain('overflow-x-auto');
    expect(navigation?.className).toContain('md:flex-wrap');
    expect(navigation?.className).toContain('md:justify-center');
    expect(navigation?.className).toContain('md:overflow-visible');
    expect(navigation?.getAttribute('aria-label')).toBe('Use case navigation');

    const position = rendered.container.querySelector(
      '[data-slot="use-case-position"]'
    );
    expect(position).not.toBeNull();
    expect(position?.textContent).toBe(`1 / ${manySampleItems.length}`);

    const dots = rendered.container.querySelectorAll(
      '[data-slot="use-case-dot"]'
    );
    expect(dots).toHaveLength(manySampleItems.length);
    expect(dots[0]?.getAttribute('aria-current')).toBe('true');

    const inactiveDot = Array.from(dots).find(
      (dot) => dot.getAttribute('aria-current') !== 'true'
    );
    expect(inactiveDot?.className).toContain('bg-muted-foreground/45');
    expect(inactiveDot?.className).toContain('hover:bg-muted-foreground/70');
    expect(inactiveDot?.className).toContain('w-2.5');

    await rendered.click('[data-slot="use-case-dot"]:nth-of-type(4)');
    expect(rendered.container.textContent).toContain('Product Sample 4');
    expect(position?.textContent).toBe(`4 / ${manySampleItems.length}`);

    await rendered.unmount();
  });

  it('scrolls the active dot into view only after the active case changes', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    try {
      const rendered = await render(
        <UseCasesShowcase items={manySampleItems} />
      );

      expect(scrollIntoViewSpy).not.toHaveBeenCalled();

      await rendered.click('[data-slot="use-case-dot"]:nth-of-type(5)');

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({
        block: 'nearest',
        inline: 'nearest',
      });

      await rendered.unmount();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('does not trigger page scrolling when the showcase auto-advances', async () => {
    vi.useFakeTimers();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    try {
      await render(<UseCasesShowcase items={manySampleItems} />);

      expect(scrollIntoViewSpy).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(5200);
      });

      expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('keeps details actions independent from generator state', async () => {
    const rendered = await render(
      <UseCasesShowcase items={sampleItems} tryItNowHref="#custom-workspace" />
    );

    await rendered.click('[data-slot="use-case-details-open"]');
    await rendered.click('[data-slot="use-case-share"]');

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: sampleItems[0].title,
        text: sampleItems[0].prompt,
      })
    );

    const tryItNow = document.body.querySelector<HTMLAnchorElement>(
      '[data-slot="use-case-try-it-now"] a, a[href="#custom-workspace"]'
    );
    expect(tryItNow?.getAttribute('href')).toBe('#custom-workspace');

    await rendered.click('[data-slot="use-case-try-it-now"]');
    expect(
      document.body.querySelector('[data-slot="use-case-details-dialog"]')
    ).toBeNull();

    await rendered.unmount();
  });

  it('localizes internal try-it-now ctas inside the details dialog', async () => {
    const rendered = await render(
      <UseCasesShowcase items={sampleItems} tryItNowHref="/ai-image-generator" />
    );

    await rendered.click('[data-slot="use-case-details-open"]');

    const tryItNow = document.body.querySelector<HTMLAnchorElement>(
      'a[data-slot="use-case-try-it-now"]'
    );
    expect(tryItNow?.getAttribute('href')).toBe('/zh/ai-image-generator');

    await rendered.unmount();
  });
});
