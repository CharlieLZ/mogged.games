// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMagicLinkRequest } from './use-magic-link-request';

const currentLocaleState = vi.hoisted(() => ({
  locale: 'zh',
}));

const signInMagicLinkSpy = vi.hoisted(() => vi.fn());
const toastErrorSpy = vi.hoisted(() => vi.fn());
const toastSuccessSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useLocale: () => currentLocaleState.locale,
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    (
      ({
        magic_link_email_required:
          'Enter your email to continue with a magic link',
        magic_link_failed: 'Magic link request failed',
        magic_link_sent_toast: 'Magic link sent',
        magic_link_sign_in_sent: `Check ${values?.email || ''} for a secure sign-in link.`,
        magic_link_sign_up_sent: `Check ${values?.email || ''} for a secure sign-up link.`,
      }) as Record<string, string>
    )[key] ?? key,
}));

vi.mock('@/config/locale', () => ({
  defaultLocale: 'en',
  locales: ['en', 'zh'],
}));

vi.mock('@/core/auth/client', () => ({
  signIn: {
    magicLink: signInMagicLinkSpy,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorSpy,
    success: toastSuccessSpy,
  },
}));

function MagicLinkRequestHarness({
  callbackUrl,
  email,
  errorPath,
  name,
  successMessageKey,
}: {
  callbackUrl: string;
  email: string;
  errorPath: '/sign-in' | '/sign-up';
  name?: string | null;
  successMessageKey: 'magic_link_sign_in_sent' | 'magic_link_sign_up_sent';
}) {
  const { requestMagicLink } = useMagicLinkRequest({
    callbackUrl,
    errorPath,
    successMessageKey,
  });

  useEffect(() => {
    void requestMagicLink({ email, name });
  }, []);

  return null;
}

async function renderMagicLinkRequestHarness(
  props: React.ComponentProps<typeof MagicLinkRequestHarness>
) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(MagicLinkRequestHarness, props));
  });

  return {
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useMagicLinkRequest', () => {
  beforeEach(() => {
    currentLocaleState.locale = 'zh';
    signInMagicLinkSpy.mockReset();
    signInMagicLinkSpy.mockResolvedValue({ status: true });
    toastErrorSpy.mockReset();
    toastSuccessSpy.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('preserves the localized callback url in the sign-in error return path', async () => {
    const rendered = await renderMagicLinkRequestHarness({
      callbackUrl: '/ai-video-generator/image-to-video',
      email: 'alice@example.com',
      errorPath: '/sign-in',
      successMessageKey: 'magic_link_sign_in_sent',
    });

    expect(signInMagicLinkSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        callbackURL: '/zh/ai-video-generator/image-to-video',
        newUserCallbackURL: '/zh/ai-video-generator/image-to-video',
        errorCallbackURL:
          '/zh/sign-in?callbackUrl=%2Fzh%2Fai-video-generator%2Fimage-to-video',
      }),
      expect.objectContaining({
        onError: expect.any(Function),
      })
    );

    await rendered.unmount();
  });

  it('preserves the localized callback url in the sign-up error return path', async () => {
    const rendered = await renderMagicLinkRequestHarness({
      callbackUrl: '/activity',
      email: 'alice@example.com',
      name: 'Alice',
      errorPath: '/sign-up',
      successMessageKey: 'magic_link_sign_up_sent',
    });

    expect(signInMagicLinkSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        name: 'Alice',
        callbackURL: '/zh/activity',
        newUserCallbackURL: '/zh/activity',
        errorCallbackURL: '/zh/sign-up?callbackUrl=%2Fzh%2Factivity',
      }),
      expect.objectContaining({
        onError: expect.any(Function),
      })
    );

    await rendered.unmount();
  });
});
