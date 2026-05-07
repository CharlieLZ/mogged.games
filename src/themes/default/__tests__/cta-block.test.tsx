// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeFinalCTA } from '@/themes/default/blocks/home-final-cta';

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({
    children,
    className,
    href,
    target,
  }: {
    children: ReactNode;
    className?: string;
    href: string;
    target?: string;
  }) =>
    createElement(
      'a',
      {
        className,
        href,
        target,
      },
      children
    ),
}));

async function renderCTA() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(HomeFinalCTA, {
        cta: {
          id: 'cta',
          label: 'IMAGE EDITOR AI WORKFLOW',
          title: 'Start generating with the free AI image generator',
          description:
            'Free to try when guest credits are available. No credit card. Generate in seconds with GPT Image 2, Nano Banana Pro, and more top AI image models.',
          items: [
            {
              title: 'Text to image',
              description: 'Build a fresh concept from a prompt.',
            },
            {
              title: 'Image to image',
              description: 'Guide edits with an uploaded source.',
            },
            {
              title: 'Browser cleanup',
              description: 'Prepare final files locally.',
            },
          ],
          buttons: [
            {
              title: 'Generate My First Image for Free',
              url: '/ai-image-generator',
              target: '_self',
              icon: 'Zap',
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

describe('HomeFinalCTA block', () => {
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

  it('renders the homepage final CTA as an isolated token-driven panel', async () => {
    const rendered = await renderCTA();
    const section = rendered.container.querySelector(
      '[data-slot="home-final-cta-section"]'
    );
    const panel = rendered.container.querySelector(
      '[data-slot="home-final-cta-panel"]'
    );
    const content = rendered.container.querySelector(
      '[data-slot="home-final-cta-content"]'
    );
    const actions = rendered.container.querySelector(
      '[data-slot="home-final-cta-actions"]'
    );
    const highlights = rendered.container.querySelectorAll(
      '[data-slot="home-final-cta-highlight"]'
    );
    const label = rendered.container.querySelector(
      '[data-slot="home-final-cta-label"]'
    );
    const preview = rendered.container.querySelector(
      '[data-slot="home-final-cta-preview"]'
    );
    const description = rendered.container.querySelector('p');
    const primary = rendered.container.querySelector(
      'a[href="/ai-image-generator"]'
    );

    expect(section?.getAttribute('id')).toBe('cta');
    expect(panel?.className).toContain('isolate');
    expect(panel?.className).toContain('overflow-hidden');
    expect(panel?.className).toContain('text-center');
    expect(panel?.className).toContain('py-12');
    expect(panel?.className).toContain('md:py-16');
    expect(panel?.className).toContain('md:min-h-[22rem]');
    expect(panel?.className).toContain('border-border/70');
    expect(panel?.className).toContain('bg-card');
    expect(panel?.className).toContain('text-card-foreground');
    expect(panel?.className).not.toContain('grid');
    expect(panel?.className).not.toContain('bg-neutral');
    expect(panel?.className).not.toContain('text-white');
    expect(panel?.className).not.toContain('from-purple');
    expect(panel?.className).not.toContain('--home-final-cta-panel');
    expect(panel?.className).not.toContain('--home-final-cta-text');
    expect(panel?.className).not.toContain('color-mix');
    expect(content?.className).toContain('mx-auto');
    expect(content?.className).toContain('max-w-3xl');
    expect(description?.className).toContain('text-muted-foreground');
    expect(description?.className).not.toContain('--home-final-cta-text');
    expect(label).toBeNull();
    expect(highlights).toHaveLength(0);
    expect(preview).toBeNull();
    expect(actions?.className).toContain('justify-center');
    expect(primary?.className).toContain('min-h-12');
    expect(primary?.className).toContain('rounded-full');
    expect(primary?.className).toContain('gap-2');
    expect(primary?.className).toContain('bg-primary');
    expect(primary?.className).toContain('text-primary-foreground');
    expect(primary?.className).toContain('shadow-lg');
    expect(rendered.container.textContent).toContain(
      'Start generating with the free AI image generator'
    );
    expect(rendered.container.textContent).toContain(
      'Free to try when guest credits are available. No credit card. Generate in seconds with GPT Image 2, Nano Banana Pro, and more top AI image models.'
    );
    expect(primary?.textContent).toContain('Generate My First Image for Free');
    expect(rendered.container.querySelector('a[href="/pricing"]')).toBeNull();
    expect(rendered.container.textContent).not.toContain(
      'IMAGE EDITOR AI WORKFLOW'
    );
    expect(rendered.container.textContent).not.toContain('Browser cleanup');

    await rendered.unmount();
  });
});
