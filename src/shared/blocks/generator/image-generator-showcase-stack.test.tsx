// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getImageGeneratorShowcaseCopy } from '@/shared/lib/ai-image-generator-showcase';

import { ImageGeneratorShowcaseStack } from './image-generator-showcase-stack';

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    <a href={href} {...props}>{children}</a>,
}));

async function render(element: ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
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

describe('ImageGeneratorShowcaseStack', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders localized showcase content without redundant gallery copy or CTA controls', async () => {
    const content = getImageGeneratorShowcaseCopy('en');
    const rendered = await render(
      <ImageGeneratorShowcaseStack content={content} />
    );

    expect(
      rendered.container.querySelector(
        '[data-slot="image-generator-showcase-overview"]'
      )
    ).not.toBeNull();
    expect(
      rendered.container.querySelectorAll(
        '[data-slot="image-generator-showcase-feature-section"]'
      )
    ).toHaveLength(3);
    expect(
      rendered.container.querySelectorAll(
        '[data-slot="image-generator-showcase-gallery-item"]'
      )
    ).toHaveLength(4);
    expect(
      rendered.container.querySelector(
        '[data-slot="image-generator-showcase-gallery-grid"]'
      )
    ).not.toBeNull();
    expect(rendered.container.textContent).toContain(
      content.sections[0]?.title ?? ''
    );
    expect(rendered.container.textContent).toContain(
      content.gallery.items[0]?.title ?? ''
    );
    expect(rendered.container.textContent).not.toContain(
      'Open four fully expanded prompt looks at once'
    );
    expect(rendered.container.textContent).not.toContain(
      'Compare commercial, editorial, poster, and scrapbook treatments side by side without leaving the same AI image workspace.'
    );
    expect(rendered.container.textContent).not.toContain('Try in Image Editor');
    expect(rendered.container.textContent).not.toContain(
      'Open mogged'
    );
    expect(
      rendered.container.querySelector(
        '[data-slot="image-generator-showcase-gallery-copy"]'
      )
    ).toBeNull();
    expect(
      rendered.container.querySelector(
        '[data-slot="image-generator-showcase-overview-apply-prompt"]'
      )
    ).toBeNull();
    expect(
      rendered.container.querySelector(
        '[data-slot="image-generator-showcase-apply-prompt"]'
      )
    ).toBeNull();
    expect(
      rendered.container.querySelector(
        '[data-slot="image-generator-showcase-gallery-apply-prompt"]'
      )
    ).toBeNull();
    expect(rendered.container.querySelectorAll('button')).toHaveLength(0);
    expect(rendered.container.querySelectorAll('a')).toHaveLength(0);

    await rendered.unmount();
  });

  it('only flips the requested illustration and retail splits on desktop', async () => {
    const content = getImageGeneratorShowcaseCopy('en');
    const rendered = await render(
      <>
        <div id="image-generator-workspace" />
        <ImageGeneratorShowcaseStack content={content} />
      </>
    );

    const overviewCopy = rendered.container.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-overview-copy"]'
    );
    const overviewVisual = rendered.container.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-overview-visual"]'
    );
    const featureSections = Array.from(
      rendered.container.querySelectorAll<HTMLElement>(
        '[data-slot="image-generator-showcase-feature-section"]'
      )
    );
    const firstFeatureCopy = featureSections[0]?.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-feature-copy"]'
    );
    const firstFeatureVisual = featureSections[0]?.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-feature-visual"]'
    );
    const secondFeatureCopy = featureSections[1]?.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-feature-copy"]'
    );
    const secondFeatureVisual = featureSections[1]?.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-feature-visual"]'
    );
    const thirdFeatureCopy = featureSections[2]?.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-feature-copy"]'
    );
    const thirdFeatureVisual = featureSections[2]?.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-feature-visual"]'
    );
    const galleryGrid = rendered.container.querySelector<HTMLElement>(
      '[data-slot="image-generator-showcase-gallery-grid"]'
    );

    expect(overviewCopy?.className).toContain('lg:order-1');
    expect(overviewVisual?.className).toContain('lg:order-2');
    expect(firstFeatureCopy?.className).toContain('lg:order-2');
    expect(firstFeatureVisual?.className).toContain('lg:order-1');
    expect(secondFeatureCopy?.className).toContain('lg:order-1');
    expect(secondFeatureVisual?.className).toContain('lg:order-2');
    expect(thirdFeatureCopy?.className).toContain('lg:order-2');
    expect(thirdFeatureVisual?.className).toContain('lg:order-1');
    expect(
      rendered.container.querySelector(
        '[data-slot="image-generator-showcase-gallery-copy"]'
      )
    ).toBeNull();
    expect(galleryGrid?.className).not.toContain('lg:order-1');

    await rendered.unmount();
  });
});
