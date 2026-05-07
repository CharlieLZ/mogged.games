// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleSelector } from './locale-selector';

const pushSpy = vi.fn();
const deferredState = vi.hoisted(() => ({
  ready: true,
}));
let currentLocale = 'zh';
let currentPathname = '/';
let searchQuery = 'view=compact';

vi.mock('next-intl', () => ({
  useLocale: () => currentLocale,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushSpy,
  }),
  useSearchParams: () => ({
    toString: () => searchQuery,
  }),
}));

vi.mock('@/shared/hooks/use-deferred-client-render', () => ({
  useDeferredClientRender: () => deferredState.ready,
}));

vi.mock('@/core/i18n/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
}));

vi.mock('@/shared/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => createElement('button', { onClick }, children),
}));

async function renderSelector(
  props: React.ComponentProps<typeof LocaleSelector> = { type: 'button' }
) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(LocaleSelector, props));
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

describe('LocaleSelector', () => {
  beforeEach(() => {
    pushSpy.mockReset();
    currentLocale = 'zh';
    currentPathname = '/';
    searchQuery = 'view=compact';
    deferredState.ready = true;
    localStorage.clear();
    document.cookie = 'NEXT_LOCALE=; Max-Age=0; path=/';
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('switches from zh root to the unprefixed english root instead of /en', async () => {
    const rendered = await renderSelector();
    const englishButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.trim() === 'English');

    await act(async () => {
      englishButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(pushSpy).toHaveBeenCalledWith('/?view=compact');
    expect(localStorage.getItem('locale')).toBe('en');
    expect(document.cookie).toContain('NEXT_LOCALE=en');

    await rendered.unmount();
  });

  it('labels the icon trigger for assistive technology', async () => {
    const rendered = await renderSelector({
      type: 'icon',
      ariaLabel: 'Change language',
    });

    expect(
      rendered.container.querySelector('button[aria-label="Change language"]')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('keeps the custom aria label on the deferred fallback trigger', async () => {
    deferredState.ready = false;

    const rendered = await renderSelector({
      type: 'icon',
      ariaLabel: 'Switch workspace language',
    });

    expect(
      rendered.container.querySelector(
        'button[aria-label="Switch workspace language"]'
      )
    ).not.toBeNull();

    await rendered.unmount();
  });
});
