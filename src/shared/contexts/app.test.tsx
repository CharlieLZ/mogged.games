// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authGetSession: vi.fn(),
  getAuthClient: vi.fn(),
  fetchApiJson: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  triggerGoogleOneTap: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}));

vi.mock('@/config', () => ({
  envConfigs: {
    auth_secret: 'test-secret',
  },
}));

vi.mock('@/core/auth/client', () => ({
  authClient: {
    getSession: mocks.authGetSession,
  },
  getAuthClient: mocks.getAuthClient,
  useSession: () => {
    throw new Error('useSession should not run during provider render');
  },
}));

vi.mock('@/core/auth/one-tap-client', () => ({
  triggerGoogleOneTap: mocks.triggerGoogleOneTap,
}));

vi.mock('@/shared/lib/api/client', () => ({
  fetchApiJson: mocks.fetchApiJson,
}));

describe('AppContextProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.authGetSession.mockResolvedValue({ data: null });
    mocks.fetchApiJson.mockResolvedValue({ data: {} });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('syncs the auth session from an effect instead of subscribing during render', async () => {
    const { AppContextProvider } = await import('./app');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(
          AppContextProvider,
          { authEnabled: true },
          createElement('div', { 'data-slot': 'child' }, 'ready')
        )
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('ready');
    expect(mocks.authGetSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });

  it('uses the server-provided authEnabled flag for the initial auth snapshot', async () => {
    const { AppContextProvider, useAppContext } = await import('./app');

    function ContextConsumer() {
      const context = useAppContext();

      return createElement('div', {
        'data-is-check-sign': String(context.isCheckSign),
      });
    }

    const authDisabledHtml = renderToString(
      createElement(
        AppContextProvider,
        { authEnabled: false },
        createElement(ContextConsumer)
      )
    );
    const authEnabledHtml = renderToString(
      createElement(
        AppContextProvider,
        { authEnabled: true },
        createElement(ContextConsumer)
      )
    );

    expect(authDisabledHtml).toContain('data-is-check-sign="false"');
    expect(authEnabledHtml).toContain('data-is-check-sign="true"');
  });

  it('exposes safe fallback values when a consumer renders outside the provider', async () => {
    const { useAppContext } = await import('./app');
    const container = document.createElement('div');
    const root = createRoot(container);

    function ContextConsumer() {
      const context = useAppContext();

      useEffect(() => {
        context.setIsShowPaymentModal(true);
        context.setIsShowSignModal(true);
        void context.fetchUserCredits();
        void context.fetchUserInfo();
      }, [context]);

      return createElement('div', {
        'data-auth-modal-view': context.authModalView,
        'data-config-count': String(Object.keys(context.configs).length),
        'data-is-check-sign': String(context.isCheckSign),
        'data-is-show-payment-modal': String(context.isShowPaymentModal),
        'data-is-show-sign-modal': String(context.isShowSignModal),
      });
    }

    await act(async () => {
      root.render(createElement(ContextConsumer));
      await Promise.resolve();
    });

    const consumer = container.querySelector('div');

    expect(consumer?.getAttribute('data-auth-modal-view')).toBe('sign-in');
    expect(consumer?.getAttribute('data-config-count')).toBe('0');
    expect(consumer?.getAttribute('data-is-check-sign')).toBe('false');
    expect(consumer?.getAttribute('data-is-show-payment-modal')).toBe('false');
    expect(consumer?.getAttribute('data-is-show-sign-modal')).toBe('false');

    await act(async () => {
      root.unmount();
    });
  });

  it('falls back to the sign-in modal when google one tap is skipped', async () => {
    mocks.fetchApiJson.mockImplementation(async (input: string) => {
      if (input === '/api/config/get-configs') {
        return {
          data: {
            google_auth_enabled: 'true',
            google_one_tap_enabled: 'true',
            google_client_id: 'google-client-id',
          },
        };
      }

      return { data: {} };
    });
    mocks.triggerGoogleOneTap.mockImplementation(async (options) => {
      options.onPromptNotification?.({
        getMomentType: () => 'skipped',
      });
      return true;
    });

    const { AppContextProvider, useAppContext } = await import('./app');
    const container = document.createElement('div');
    const root = createRoot(container);

    function ContextConsumer() {
      const context = useAppContext();

      return createElement('div', {
        'data-auth-modal-view': context.authModalView,
        'data-is-check-sign': String(context.isCheckSign),
        'data-is-show-sign-modal': String(context.isShowSignModal),
      });
    }

    await act(async () => {
      root.render(
        createElement(
          AppContextProvider,
          { authEnabled: true },
          createElement(ContextConsumer)
        )
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const consumer = container.querySelector('div');

    expect(mocks.triggerGoogleOneTap).toHaveBeenCalledWith(
      expect.objectContaining({
        configs: expect.objectContaining({
          google_auth_enabled: 'true',
          google_one_tap_enabled: 'true',
          google_client_id: 'google-client-id',
        }),
        onPromptNotification: expect.any(Function),
      })
    );
    expect(consumer?.getAttribute('data-auth-modal-view')).toBe('sign-in');
    expect(consumer?.getAttribute('data-is-show-sign-modal')).toBe('true');
    expect(consumer?.getAttribute('data-is-check-sign')).toBe('false');

    await act(async () => {
      root.unmount();
    });
  });

  it('skips auth session sync when the server says auth is disabled', async () => {
    const { AppContextProvider } = await import('./app');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(
          AppContextProvider,
          { authEnabled: false },
          createElement('div', { 'data-slot': 'child' }, 'ready')
        )
      );
      await Promise.resolve();
    });

    expect(mocks.authGetSession).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });
});
