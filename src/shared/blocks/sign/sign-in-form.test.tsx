// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SignInForm } from './sign-in-form';

const currentLocaleState = vi.hoisted(() => ({
  locale: 'zh',
}));

const appContextState = vi.hoisted(() => ({
  configs: {
    email_auth_enabled: 'true',
    google_auth_enabled: 'false',
    github_auth_enabled: 'false',
  } as Record<string, string>,
}));

const signInEmailSpy = vi.hoisted(() => vi.fn());
const signInMagicLinkSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useLocale: () => currentLocaleState.locale,
  useTranslations: () => (key: string) =>
    (
      {
        email_title: 'Email',
        email_placeholder: 'Input your email here',
        password_title: 'Password',
        password_placeholder: 'Input your password here',
        forgot_password: 'Forgot password?',
        no_account: "Don't have an account?",
        sign_up_title: 'Sign Up',
        sign_in_title: 'Sign In',
        email_magic_link_title: 'Email me a magic link',
      } as Record<string, string>
    )[key] ?? key,
}));

vi.mock('@/config/locale', () => ({
  defaultLocale: 'en',
  locales: ['en', 'zh'],
}));

vi.mock('@/core/auth/client', () => ({
  signIn: {
    email: signInEmailSpy,
    magicLink: signInMagicLinkSpy,
  },
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => {
    const localizedHref =
      currentLocaleState.locale === 'en' ||
      !href.startsWith('/') ||
      href.startsWith(`/${currentLocaleState.locale}`)
        ? href
        : `/${currentLocaleState.locale}${href}`;

    return createElement('a', { href: localizedHref, ...props }, children);
  },
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
}));

vi.mock('@/shared/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    createElement('input', props),
}));

vi.mock('@/shared/components/ui/label', () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) =>
    createElement('label', props, children),
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    configs: appContextState.configs,
  }),
}));

vi.mock('./social-providers', () => ({
  SocialProviders: () =>
    createElement('div', { 'data-slot': 'social-providers' }, 'social'),
}));

async function renderSignInForm() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(SignInForm, {
        callbackUrl: '/ai-video-generator/image-to-video',
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

describe('SignInForm', () => {
  beforeEach(() => {
    currentLocaleState.locale = 'zh';
    signInEmailSpy.mockReset();
    signInMagicLinkSpy.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('shows a localized forgot-password entry in the shared sign-in form', async () => {
    const rendered = await renderSignInForm();

    expect(rendered.container.textContent).toContain('Password');

    const passwordLabel = rendered.container.querySelector(
      'label[for="password"]'
    );
    const forgotPasswordLink = rendered.container.querySelector(
      'a[href="/zh/forgot-password"]'
    );
    const signUpLink = rendered.container.querySelector('a[href="/zh/sign-up"]');

    expect(passwordLabel?.textContent).toBe('Password');
    expect(forgotPasswordLink?.textContent).toBe('Forgot password?');
    expect(signUpLink?.textContent).toContain('Sign Up');
    expect(rendered.container.textContent).toContain('Email me a magic link');

    await rendered.unmount();
  });
});
