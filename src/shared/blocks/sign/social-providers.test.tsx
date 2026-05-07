// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SocialProviders } from './social-providers';

const appContextState = vi.hoisted(() => ({
  isShowSignModal: true,
}));

const signInSocialSpy = vi.hoisted(() => vi.fn());
const setIsShowSignModalSpy = vi.hoisted(() => vi.fn());
const toastErrorSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) =>
    (
      ({
        google_sign_in_title: 'Sign in with Google',
        github_sign_in_title: 'Sign in with GitHub',
        or: 'Or',
      }) as Record<string, string>
    )[key] ?? key,
}));

vi.mock('@/core/auth/client', () => ({
  signIn: {
    social: signInSocialSpy,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorSpy,
  },
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    isShowSignModal: appContextState.isShowSignModal,
    setIsShowSignModal: setIsShowSignModalSpy,
  }),
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
}));

async function renderSocialProviders({
  configs,
  showDivider = true,
  setLoading = vi.fn(),
}: {
  configs: Record<string, string>;
  showDivider?: boolean;
  setLoading?: (loading: boolean) => void;
}) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(SocialProviders, {
        configs,
        callbackUrl: '/pricing',
        loading: false,
        setLoading,
        showDivider,
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

describe('SocialProviders', () => {
  beforeEach(() => {
    signInSocialSpy.mockReset();
    setIsShowSignModalSpy.mockReset();
    toastErrorSpy.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders an accessible divider before enabled social providers', async () => {
    const rendered = await renderSocialProviders({
      configs: {
        google_auth_enabled: 'true',
        google_client_id: 'google-client',
        github_auth_enabled: 'true',
        github_client_id: 'github-client',
      },
    });

    expect(rendered.container.textContent).toContain('Or');
    expect(rendered.container.textContent).toContain('Sign in with Google');
    expect(rendered.container.textContent).toContain('Sign in with GitHub');
    expect(rendered.container.querySelectorAll('button')).toHaveLength(2);

    await rendered.unmount();
  });

  it('uses a colored Google mark instead of a monochrome icon', async () => {
    const rendered = await renderSocialProviders({
      configs: {
        google_auth_enabled: 'true',
        google_client_id: 'google-client',
      },
    });
    const googleButton = rendered.container.querySelector(
      'button[aria-label="Sign in with Google"]'
    );
    const googleIcon = googleButton?.querySelector('svg');

    expect(googleIcon?.innerHTML).toMatch(/#[0-9a-f]{6}/i);

    await rendered.unmount();
  });

  it('renders nothing when every social provider is unavailable', async () => {
    const rendered = await renderSocialProviders({
      configs: {
        google_auth_enabled: 'false',
        github_auth_enabled: 'false',
      },
    });

    expect(rendered.container.textContent).toBe('');
    expect(rendered.container.querySelector('button')).toBeNull();

    await rendered.unmount();
  });

  it('surfaces social sign-in failures and clears the busy state', async () => {
    const setLoadingSpy = vi.fn();
    signInSocialSpy.mockRejectedValueOnce(new Error('OAuth popup blocked'));
    const rendered = await renderSocialProviders({
      configs: {
        google_auth_enabled: 'true',
        google_client_id: 'google-client',
      },
      setLoading: setLoadingSpy,
    });
    const googleButton = rendered.container.querySelector('button');

    await act(async () => {
      googleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toastErrorSpy).toHaveBeenCalledWith('OAuth popup blocked');
    expect(setLoadingSpy).toHaveBeenCalledWith(false);

    await rendered.unmount();
  });

  it('keeps the modal open when the provider reports an auth error', async () => {
    const setLoadingSpy = vi.fn();
    signInSocialSpy.mockImplementationOnce(async (_input, callbacks) => {
      callbacks.onRequest();
      callbacks.onError({ error: { message: 'Provider unavailable' } });
      callbacks.onResponse({ response: { ok: false } });
    });
    const rendered = await renderSocialProviders({
      configs: {
        google_auth_enabled: 'true',
        google_client_id: 'google-client',
      },
      setLoading: setLoadingSpy,
    });
    const googleButton = rendered.container.querySelector('button');

    await act(async () => {
      googleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toastErrorSpy).toHaveBeenCalledWith('Provider unavailable');
    expect(setLoadingSpy).toHaveBeenLastCalledWith(false);
    expect(setIsShowSignModalSpy).not.toHaveBeenCalled();

    await rendered.unmount();
  });
});
