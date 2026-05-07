// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestPasswordResetCard } from './request-password-reset-card';

const testState = vi.hoisted(() => ({
  locale: 'zh',
  requestPasswordResetMock: vi.fn(),
  pushMock: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => testState.locale,
  useTranslations: () => (key: string) =>
    (
      {
        'fields.email': 'Email',
        'reset_password_request.title': 'Reset Password',
        'reset_password_request.description': 'Send a reset email.',
        'reset_password_request.tip': 'Tip copy',
        'reset_password_request.sent_hint': 'Sent hint',
        'reset_password_request.email_placeholder': 'you@example.com',
        'reset_password_request.buttons.submit': 'Send Reset Email',
        'reset_password_request.buttons.submitting': 'Sending...',
        'reset_password_request.buttons.back_to_sign_in': 'Back to Sign In',
        'reset_password_request.messages.emailRequired':
          'Enter an email address first.',
        'reset_password_request.messages.sent':
          'If that email exists, a reset link has been sent.',
        'reset_password_request.messages.sendFailed':
          'Failed to send reset email.',
      } as Record<string, string>
    )[key] ?? key,
}));

vi.mock('@/core/auth/client', () => ({
  requestPasswordReset: testState.requestPasswordResetMock,
}));

vi.mock('@/core/i18n/navigation', () => ({
  useRouter: () => ({
    push: testState.pushMock,
  }),
}));

vi.mock('@/core/i18n/localized-path', () => ({
  getLocalizedPath: (href: string, locale?: string) =>
    locale && locale !== 'en' ? `/${locale}${href}` : href,
}));

vi.mock('sonner', () => ({
  toast: {
    error: testState.toastError,
    success: testState.toastSuccess,
  },
}));

vi.mock('lucide-react', () => ({
  Loader2: () => createElement('span', { 'data-slot': 'loader' }),
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

vi.mock('@/shared/components/ui/card', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', props, children),
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', props, children),
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', props, children),
  CardDescription: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => createElement('div', props, children),
  CardContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => createElement('div', props, children),
  CardFooter: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', props, children),
}));

async function renderCard(props?: Partial<React.ComponentProps<typeof RequestPasswordResetCard>>) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(RequestPasswordResetCard, props));
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

describe('RequestPasswordResetCard', () => {
  beforeEach(() => {
    testState.locale = 'zh';
    testState.requestPasswordResetMock.mockReset();
    testState.requestPasswordResetMock.mockResolvedValue({});
    testState.pushMock.mockReset();
    testState.toastError.mockReset();
    testState.toastSuccess.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('defaults reset email links to the localized reset-password page', async () => {
    const rendered = await renderCard({
      defaultEmail: 'alice@example.com',
    });
    const submitButton = rendered.container.querySelector(
      'button'
    ) as HTMLButtonElement | null;

    await act(async () => {
      submitButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, button: 0 })
      );
    });

    expect(testState.requestPasswordResetMock).toHaveBeenCalledWith({
      email: 'alice@example.com',
      redirectTo: '/zh/reset-password',
    });

    await rendered.unmount();
  });
});
