// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LandingLayout from '@/themes/default/layouts/landing';

vi.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async () => ({
    raw: (key?: string) => {
      if (key === 'skip_to_content') {
        return 'Skip to main content';
      }

      return undefined;
    },
  }),
}));

vi.mock('@/themes/default/blocks/header', () => ({
  Header: () => createElement('header', { 'data-slot': 'landing-header' }),
}));

vi.mock('@/themes/default/blocks/footer', () => ({
  Footer: () => createElement('footer', { 'data-slot': 'landing-footer' }),
}));

async function renderLandingLayout() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      await LandingLayout({
        children: createElement('div', { 'data-slot': 'layout-children' }),
        header: {} as any,
        footer: {} as any,
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

describe('LandingLayout', () => {
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

  it('defines stable landing layout tokens on the shell itself', async () => {
    const rendered = await renderLandingLayout();
    const shell = rendered.container.querySelector('div.min-h-screen');

    expect(shell?.getAttribute('data-slot')).toBe('landing-shell');
    expect(shell?.getAttribute('style')).toContain(
      '--landing-header-height: 4.5rem'
    );
    expect(shell?.getAttribute('style')).toContain(
      '--landing-header-height-mobile: 3.5rem'
    );

    await rendered.unmount();
  });

  it('defines shared public-page top spacing tokens for landing pages', async () => {
    const rendered = await renderLandingLayout();
    const shell = rendered.container.querySelector('div.min-h-screen');

    expect(shell?.getAttribute('style')).toContain(
      '--landing-page-top-space: 2.5rem'
    );
    expect(shell?.getAttribute('style')).toContain(
      '--landing-page-top-space-mobile: 1.5rem'
    );

    await rendered.unmount();
  });

  it('renders a skip link and wraps landing content in a main landmark', async () => {
    const rendered = await renderLandingLayout();
    const skipLink = rendered.container.querySelector(
      'a[href="#main-content"]'
    );
    const main = rendered.container.querySelector('main#main-content');

    expect(skipLink?.textContent).toBe('Skip to main content');
    expect(skipLink?.className).toContain('sr-only');
    expect(skipLink?.className).toContain('focus:not-sr-only');
    expect(main).not.toBeNull();
    expect(main?.className).toContain('scroll-mt-');
    expect(main?.querySelector('[data-slot="layout-children"]')).not.toBeNull();

    await rendered.unmount();
  });
});
