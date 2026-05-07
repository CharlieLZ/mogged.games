// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeaturesStep } from '@/themes/default/blocks/features-step';

vi.mock('@/shared/components/ui/scroll-animation', () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

async function renderFeaturesStep() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(FeaturesStep, {
        features: {
          id: 'usage',
          label: 'Workflow',
          title: 'How to Create AI Videos with mogged',
          description:
            'Generate your first mogged video in four simple steps, from prompt to export.',
          className: 'bg-muted/20',
          items: [
            {
              title: 'Write Your Prompt',
              description:
                'Describe your video scene in natural language, or upload a reference image.',
            },
            {
              title: 'Choose Your Style',
              description:
                'Select your preferred video style, aspect ratio, duration, and motion intensity.',
            },
            {
              title: 'Generate with mogged',
              description:
                'mogged renders your video in the cloud so you can review results without local hardware.',
            },
            {
              title: 'Download & Share',
              description:
                'Export your happy horse AI video in full quality and share directly.',
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

describe('FeaturesStep block', () => {
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

  it('renders a stacked step list instead of narrow desktop columns', async () => {
    const rendered = await renderFeaturesStep();
    const section = rendered.container.querySelector(
      '[data-slot="features-step-section"]'
    );
    const list = rendered.container.querySelector(
      '[data-slot="features-step-list"]'
    );
    const cards = rendered.container.querySelectorAll(
      '[data-slot="features-step-card"]'
    );
    const indices = rendered.container.querySelectorAll(
      '[data-slot="features-step-index"]'
    );
    const title = rendered.container.querySelector(
      '[data-slot="section-intro-title"]'
    );
    const description = rendered.container.querySelector(
      '[data-slot="section-intro-description"]'
    );
    const cardTitle = rendered.container.querySelector(
      '[data-slot="features-step-card-title"]'
    );
    const cardDescription = rendered.container.querySelector(
      '[data-slot="features-step-card-description"]'
    );

    expect(section?.className).toContain('bg-muted/20');
    expect(list?.className).toContain('max-w-4xl');
    expect(list?.className).toContain('space-y-4');
    expect(cards).toHaveLength(4);
    expect(indices).toHaveLength(4);
    expect(indices[0]?.textContent).toBe('1');
    expect(indices[3]?.textContent).toBe('4');
    expect(title?.textContent).toContain(
      'How to Create AI Videos with mogged'
    );
    expect(title?.className).toContain('font-mono');
    expect(description?.className).toContain('font-mono');
    expect(cardTitle?.className).toContain('text-base');
    expect(cardTitle?.className).toContain('md:text-lg');
    expect(cardDescription?.className).toContain('text-sm');
    expect(cardDescription?.className).toContain('max-w-3xl');
    expect(rendered.container.textContent).toContain('Download & Share');

    await rendered.unmount();
  });
});
