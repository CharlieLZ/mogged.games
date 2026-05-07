// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleDetector } from './locale-detector';

const replaceSpy = vi.fn();
let currentLocale = 'zh';
let currentPathname = '/';
let searchQuery = 'source=banner';

vi.mock('next-intl', () => ({
  useLocale: () => currentLocale,
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    switch (key) {
      case 'tip_label':
        return 'Language tip';
      case 'dismiss_label':
        return 'Dismiss';
      case 'not_now':
        return 'Not now';
      case 'switch_to':
        return `Switch to ${values?.locale ?? ''}`.trim();
      case 'title':
        return `Try ${values?.locale ?? ''}`.trim();
      default:
        return key;
    }
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceSpy,
  }),
  useSearchParams: () => ({
    toString: () => searchQuery,
  }),
}));

vi.mock('@/core/i18n/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
}));

async function renderDetector() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(LocaleDetector));
  });

  await act(async () => {
    await Promise.resolve();
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

describe('LocaleDetector', () => {
  beforeEach(() => {
    replaceSpy.mockReset();
    currentLocale = 'zh';
    currentPathname = '/';
    searchQuery = 'source=banner';
    localStorage.clear();
    document.cookie = 'NEXT_LOCALE=; Max-Age=0; path=/';
    window.location.hash = '#preview';
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
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

  it('switches the locale detector banner back to the unprefixed english route', async () => {
    const rendered = await renderDetector();
    const switchButton = Array.from(rendered.container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Switch to English')
    );
    const popup = rendered.container.firstElementChild as HTMLElement | null;

    expect(rendered.container.textContent).toContain('Try English');
    expect(popup?.className).toContain('rtl:left-4');
    expect(popup?.className).toContain('rtl:right-auto');

    await act(async () => {
      switchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(replaceSpy).toHaveBeenCalledWith('/?source=banner#preview');
    expect(localStorage.getItem('locale')).toBe('en');
    expect(document.cookie).toContain('NEXT_LOCALE=en');

    await rendered.unmount();
  });
});
