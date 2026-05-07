// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Features } from '@/themes/default/blocks/features';

vi.mock('@/shared/components/ui/scroll-animation', () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

vi.mock('@/shared/blocks/common/smart-icon', () => ({
  SmartIcon: ({ name }: { name: string }) =>
    createElement('span', { 'data-slot': 'smart-icon' }, name),
}));

async function renderFeatures() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(Features, {
        features: {
          id: 'features',
          label: 'Model strengths',
          title: 'Motion that feels shot, not simulated',
          description:
            'mogged focuses on the AI video bottlenecks that slow teams down most: floaty motion, weak prompt follow-through, continuity breaks, and slow rerenders.',
          className: 'bg-muted/20',
          items: [
            {
              title: 'Motion Quality',
              description: 'Generate fluid action.',
              icon: 'RiMovieLine',
            },
            {
              title: 'Prompt Adherence',
              description: 'Stay closer to the brief.',
              icon: 'Pencil',
            },
            {
              title: 'Image to Video',
              description: 'Bring still frames to life.',
              icon: 'RiImageLine',
            },
            {
              title: 'Fast Render',
              description: 'Reach a better first draft faster.',
              icon: 'Zap',
            },
            {
              title: 'Cinematic Control',
              description: 'Use camera language and rhythm.',
              icon: 'RiCameraLensLine',
            },
            {
              title: 'Character Lock',
              description: 'Reduce continuity breaks.',
              icon: 'RiLockPasswordLine',
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

describe('Features block', () => {
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

  it('keeps the features intro stacked above the grid with centered copy', async () => {
    const rendered = await renderFeatures();
    const section = rendered.container.querySelector(
      '[data-slot="features-section"]'
    );
    const layout = rendered.container.querySelector(
      '[data-slot="features-layout"]'
    );
    const grid = rendered.container.querySelector(
      '[data-slot="features-grid"]'
    );
    const cards = rendered.container.querySelectorAll(
      '[data-slot="features-card"]'
    );
    const intro = rendered.container.querySelector(
      '[data-slot="section-intro"]'
    );
    const title = rendered.container.querySelector(
      '[data-slot="section-intro-title"]'
    );
    const label = rendered.container.querySelector(
      '[data-slot="section-intro-label"]'
    );
    const description = rendered.container.querySelector(
      '[data-slot="section-intro-description"]'
    );
    const cardTitle = rendered.container.querySelector(
      '[data-slot="features-card-title"]'
    );
    const cardDescription = rendered.container.querySelector(
      '[data-slot="features-card-description"]'
    );
    const card = rendered.container.querySelector(
      '[data-slot="features-card"]'
    );

    expect(section?.className).toContain('bg-muted/20');
    expect(section?.className).toContain('py-6');
    expect(section?.className).toContain('md:py-8');
    expect(section?.className).not.toContain('bg-foreground');
    expect(section?.className).not.toContain('bg-black');
    expect(section?.className).not.toContain('text-white');
    expect(layout?.className).toContain('space-y-4');
    expect(layout?.className).toContain('md:space-y-7');
    expect(layout?.className).not.toContain('lg:grid-cols');
    expect(intro?.className).toContain('text-center');
    expect(intro?.className).toContain('max-w-4xl');
    expect(grid?.className).toContain('mx-auto');
    expect(grid?.className).toContain('sm:grid-cols-2');
    expect(grid?.className).toContain('lg:grid-cols-3');
    expect(cards).toHaveLength(6);
    expect(label?.className).toContain('text-xs');
    expect(title?.textContent).toContain(
      'Motion that feels shot, not simulated'
    );
    expect(title?.className).toContain('text-foreground');
    expect(title?.className).toContain('md:text-[1.75rem]');
    expect(title?.className).toContain('lg:text-3xl');
    expect(description?.textContent).toContain('mogged focuses');
    expect(description?.className).toContain('text-muted-foreground');
    expect(description?.className).toContain('mx-auto');
    expect(description?.className).toContain('max-w-[38rem]');
    expect(card?.className).toContain('min-h-[10.5rem]');
    expect(card?.className).toContain('text-center');
    expect(card?.className).toContain('rounded-[1.25rem]');
    expect(card?.className).toContain('border');
    expect(card?.className).toContain('bg-background/85');
    expect(card?.className).toContain('p-4');
    expect(card?.className).toContain('lg:p-4.5');
    expect(cardTitle?.className).toContain('text-center');
    expect(cardTitle?.className).toContain('text-base');
    expect(cardDescription?.className).toContain('mx-auto');
    expect(cardDescription?.className).toContain('text-center');
    expect(cardDescription?.className).toContain('max-w-[26ch]');
    expect(rendered.container.textContent).toContain('Character Lock');

    await rendered.unmount();
  });
});
