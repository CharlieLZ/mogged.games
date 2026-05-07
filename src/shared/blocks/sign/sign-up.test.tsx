// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SignUp } from './sign-up';

const currentLocaleState = vi.hoisted(() => ({
  locale: 'zh',
}));

const pushSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useLocale: () => currentLocaleState.locale,
  useTranslations: () => (key: string) =>
    (
      ({
        sign_up_title: 'Sign Up',
        sign_up_description: 'Create an account',
        name_title: 'Name',
        name_placeholder: 'Input your name here',
        email_title: 'Email',
        email_placeholder: 'Input your email here',
        password_title: 'Password',
        password_placeholder: 'Input your password here',
        already_have_account: 'Already have an account?',
        sign_in_title: 'Sign In',
        email_magic_link_title: 'Email me a magic link',
      }) as Record<string, string>
    )[key] ?? key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushSpy,
  }),
}));

vi.mock('@/core/auth/client', () => ({
  signUp: {
    email: vi.fn(),
  },
  signIn: {
    magicLink: vi.fn(),
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

vi.mock('@/shared/components/ui/card', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', props, children),
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', props, children),
  CardTitle: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) =>
    createElement('div', props, children),
  CardDescription: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLParagraphElement>) =>
    createElement('div', props, children),
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', props, children),
  CardFooter: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', props, children),
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

vi.mock('./social-providers', () => ({
  SocialProviders: () =>
    createElement('div', { 'data-slot': 'social-providers' }, 'social'),
}));

async function renderSignUp() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(SignUp, {
        configs: {
          email_auth_enabled: 'true',
          google_auth_enabled: 'false',
          github_auth_enabled: 'false',
        },
        callbackUrl: '/activity',
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

describe('SignUp', () => {
  beforeEach(() => {
    currentLocaleState.locale = 'zh';
    pushSpy.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders a localized magic link action for passwordless signup', async () => {
    const rendered = await renderSignUp();

    expect(rendered.container.textContent).toContain('Email me a magic link');

    await rendered.unmount();
  });

  it('marks the sign-up password as a new password for password managers', async () => {
    const rendered = await renderSignUp();
    const passwordInput = rendered.container.querySelector(
      'input[type="password"]'
    );

    expect(passwordInput?.getAttribute('autocomplete')).toBe('new-password');

    await rendered.unmount();
  });
});
