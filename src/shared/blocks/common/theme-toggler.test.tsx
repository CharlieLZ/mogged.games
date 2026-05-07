// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggler } from './theme-toggler';

const themeState = vi.hoisted(() => ({
  setTheme: vi.fn(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: themeState.setTheme,
  }),
}));

vi.mock('@/shared/hooks/use-deferred-client-render', () => ({
  useDeferredClientRender: () => true,
}));

async function renderThemeToggler(
  props: React.ComponentProps<typeof ThemeToggler> = {}
) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(ThemeToggler, props));
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

describe('ThemeToggler', () => {
  beforeEach(() => {
    themeState.setTheme.mockReset();
    document.documentElement.classList.remove('dark');
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('labels the icon button for assistive technology', async () => {
    const rendered = await renderThemeToggler({
      ariaLabel: 'Toggle theme',
    });

    expect(
      rendered.container.querySelector('button[aria-label="Toggle theme"]')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('falls back to an immediate theme change when view transitions are unavailable', async () => {
    const rendered = await renderThemeToggler({
      ariaLabel: 'Toggle theme',
    });
    const button = rendered.container.querySelector(
      'button[aria-label="Toggle theme"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(themeState.setTheme).toHaveBeenCalledWith('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await rendered.unmount();
  });

  it('skips view transition animation when reduced motion is preferred', async () => {
    const startViewTransition = vi.fn();
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const rendered = await renderThemeToggler({
      ariaLabel: 'Toggle theme',
    });
    const button = rendered.container.querySelector(
      'button[aria-label="Toggle theme"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(themeState.setTheme).toHaveBeenCalledWith('dark');

    await rendered.unmount();
  });
});
