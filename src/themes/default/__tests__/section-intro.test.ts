// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SectionIntro } from '@/themes/default/blocks/section-intro';

async function renderSectionIntro() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(SectionIntro, {
        label: 'Creative directions',
        title: 'How the public workflow is structured',
        description:
          'A compact intro block should explain the section without taking over the page.',
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

describe('SectionIntro', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('uses the shared compact landing typography defaults', async () => {
    const rendered = await renderSectionIntro();
    const label = rendered.container.querySelector(
      '[data-slot="section-intro-label"]'
    );
    const title = rendered.container.querySelector(
      '[data-slot="section-intro-title"]'
    );
    const description = rendered.container.querySelector(
      '[data-slot="section-intro-description"]'
    );

    expect(label?.className).toContain('text-xs');
    expect(label?.className).toContain('tracking-[0.14em]');
    expect(title?.className).toContain('text-2xl');
    expect(title?.className).toContain('leading-8');
    expect(title?.className).toContain('md:text-[1.75rem]');
    expect(description?.className).toContain('text-sm');
    expect(description?.className).toContain('leading-6');
    expect(description?.className).toContain('md:text-base');

    await rendered.unmount();
  });
});
