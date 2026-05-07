// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageHeader } from '@/shared/blocks/common/page-header';

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    createElement('a', { href, ...props }, children),
}));

async function renderPageHeader(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(PageHeader, {
        title: 'Pricing',
        description: 'Hosted workspace plans and browser tools.',
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

describe('PageHeader', () => {
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

  it('uses tightened default public-page spacing', async () => {
    const rendered = await renderPageHeader();
    const section = rendered.container.querySelector('section');

    expect(section?.className).toContain(
      'pt-[var(--landing-page-top-space-mobile)]'
    );
    expect(section?.className).toContain('pb-6');
    expect(section?.className).toContain(
      'md:pt-[var(--landing-page-top-space)]'
    );
    expect(section?.className).toContain('md:pb-8');
    expect(section?.className).not.toContain('py-16');
    expect(section?.className).not.toContain('md:py-32');

    await rendered.unmount();
  });

  it('uses tightened compact public-page spacing', async () => {
    const rendered = await renderPageHeader({ size: 'compact' });
    const section = rendered.container.querySelector('section');

    expect(section?.className).toContain(
      'pt-[calc(var(--landing-page-top-space-mobile)/2)]'
    );
    expect(section?.className).toContain('pb-3');
    expect(section?.className).toContain(
      'md:pt-[calc(var(--landing-page-top-space)/2)]'
    );
    expect(section?.className).toContain('md:pb-5');
    expect(section?.className).not.toContain('py-8');
    expect(section?.className).not.toContain('md:py-12');

    await rendered.unmount();
  });

  it('renders compact single-line public H1 classes without an empty action row', async () => {
    const rendered = await renderPageHeader({ size: 'compact' });
    const content = rendered.container.querySelector('section > div > div');
    const heading = rendered.container.querySelector('h1');
    const description = rendered.container.querySelector('p');
    const emptyActionRow = Array.from(
      rendered.container.querySelectorAll('div')
    ).find((node) =>
      String(node.className).includes('flex flex-wrap justify-center gap-3')
    );

    expect(content?.className).toContain('max-w-6xl');
    expect(content?.className).toContain('space-y-2');
    expect(content?.className).not.toContain('max-w-4xl');
    expect(content?.className).not.toContain('space-y-4');
    expect(heading?.className).toContain('text-2xl');
    expect(heading?.className).toContain('md:text-[1.75rem]');
    expect(heading?.className).toContain('lg:text-3xl');
    expect(heading?.className).toContain('lg:whitespace-nowrap');
    expect(heading?.className).not.toContain('text-[2.25rem]');
    expect(heading?.className).not.toContain('lg:text-[3.5625rem]');
    expect(heading?.className).not.toContain('text-balance');
    expect(description?.className).toContain('max-w-6xl');
    expect(description?.className).toContain('text-sm');
    expect(description?.className).toContain('leading-6');
    expect(description?.className).toContain('lg:whitespace-nowrap');
    expect(description?.className).not.toContain('xl:whitespace-nowrap');
    expect(description?.className).not.toContain('text-pretty');
    expect(emptyActionRow).toBeUndefined();

    await rendered.unmount();
  });
});
