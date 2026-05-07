// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBellButton } from './notification-bell-button';

const appContextState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isCheckSign: false,
}));

const pathnameState = vi.hoisted(() => ({
  pathname: '/ai-video-generator/video',
}));
const useTranslationsNamespaceSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    useTranslationsNamespaceSpy(namespace);
    return (key: string) => key;
  },
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
  usePathname: () => pathnameState.pathname,
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    user: appContextState.user,
    isCheckSign: appContextState.isCheckSign,
  }),
}));

describe('NotificationBellButton', () => {
  beforeEach(() => {
    appContextState.user = {
      id: 'user-1',
    };
    appContextState.isCheckSign = false;
    pathnameState.pathname = '/ai-video-generator/video';
    useTranslationsNamespaceSpy.mockReset();
    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 0,
            message: 'ok',
            data: {
              unreadCount: 3,
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
    );
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('shows an unread badge and link for signed-in users', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(NotificationBellButton));
    });

    expect(useTranslationsNamespaceSpy).toHaveBeenCalledWith(
      'common.notifications'
    );
    expect(container.textContent).toContain('3');
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/activity/notifications');

    await act(async () => {
      root.unmount();
    });
  });

  it('stays hidden when there is no signed-in user', async () => {
    appContextState.user = null;

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(NotificationBellButton));
    });

    expect(container.textContent).toBe('');

    await act(async () => {
      root.unmount();
    });
  });
});
