// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeaturesList } from '@/themes/default/blocks/features-list';

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

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('@/shared/blocks/common/smart-icon', () => ({
  SmartIcon: ({ name }: { name: string }) =>
    createElement('span', { 'data-slot': 'smart-icon' }, name),
}));

async function renderFeaturesList(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(FeaturesList, {
        features: {
          id: 'introduce',
          label: 'Workflow map',
          title: 'Pick the lane that matches the job',
          description:
            'mogged keeps the public path simple: draft from text, guide with frames, steer with references, then clean up the export in the browser.',
          items: [
            {
              title: 'Text to Video',
              description: 'Start from a prompt-led draft.',
              icon: 'RiMagicLine',
            },
            {
              title: 'Image to Video',
              description: 'Lock composition with fixed frames.',
              icon: 'RiImage2Line',
            },
          ],
          buttons: [
            {
              title: 'Start Creating',
              url: '/ai-image-generator',
              variant: 'default',
            },
            {
              title: 'See Pricing',
              url: '/pricing',
              variant: 'outline',
            },
          ],
        },
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

describe('FeaturesList block', () => {
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

  it('uses the shared smaller section typography scale', async () => {
    const rendered = await renderFeaturesList();
    const label = rendered.container.querySelector(
      '[data-slot="section-intro-label"]'
    );
    const title = rendered.container.querySelector(
      '[data-slot="section-intro-title"]'
    );
    const description = rendered.container.querySelector(
      '[data-slot="section-intro-description"]'
    );
    const itemTitle = rendered.container.querySelector('h3');
    const itemDescription = rendered.container.querySelector(
      '.text-muted-foreground.min-w-0'
    );
    const section = rendered.container.querySelector('section');

    expect(section?.className).toContain('py-10');
    expect(section?.className).toContain('md:py-16');
    expect(label?.className).toContain('text-xs');
    expect(title?.className).toContain('text-2xl');
    expect(title?.className).toContain('md:text-[1.75rem]');
    expect(description?.className).toContain('text-sm');
    expect(description?.className).toContain('md:text-base');
    expect(itemTitle?.className).toContain('text-sm');
    expect(itemDescription?.className).toContain('text-xs');
    expect(itemDescription?.className).toContain('md:text-sm');

    await rendered.unmount();
  });

  it('keeps feature CTA buttons on the shared default and outline button surfaces', async () => {
    const rendered = await renderFeaturesList();
    const primary = rendered.container.querySelector(
      'a[href="/ai-image-generator"]'
    );
    const secondary = rendered.container.querySelector('a[href="/pricing"]');

    expect(primary?.getAttribute('data-slot')).toBe('button');
    expect(primary?.className).toContain('rounded-md');
    expect(secondary?.getAttribute('data-slot')).toBe('button');
    expect(secondary?.className).toContain('rounded-md');
    expect(secondary?.className).toContain('border');

    await rendered.unmount();
  });
});
