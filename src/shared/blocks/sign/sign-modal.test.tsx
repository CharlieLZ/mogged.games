// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SignModal } from './sign-modal';

const modalState = vi.hoisted(() => ({
  authModalView: 'sign-in' as 'sign-in' | 'sign-up',
  isShowSignModal: true,
}));

const setAuthModalViewSpy = vi.hoisted(() => vi.fn());
const setIsShowSignModalSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    (
      ({
        sign_in_modal_title: 'Welcome to PhotoEditorAI',
        sign_in_modal_description: 'Log in to receive 10 free Credits every day',
        sign_in_modal_kicker: 'Welcome to PhotoEditorAI',
        sign_in_modal_benefit_1:
          '🎁 Completely Free! Sign in to get free 60 credits',
        sign_in_modal_benefit_2:
          '💾 Auto Save your edits and generation history',
        sign_in_modal_benefit_3:
          '✨ AI-powered photo editing, generation, and enhancement',
        sign_in_modal_security_note:
          'By continuing, you agree to our Terms of Service and Privacy Policy.',
        sign_up_modal_title: 'Welcome to PhotoEditorAI',
        sign_up_modal_description: 'Create an account to unlock free daily credits',
        sign_up_modal_kicker: 'Welcome to PhotoEditorAI',
        sign_up_modal_benefit_1:
          '🎁 Completely Free! Sign in to get free 60 credits',
        sign_up_modal_benefit_2:
          '💾 Auto Save your edits and generation history',
        sign_up_modal_benefit_3:
          '✨ AI-powered photo editing, generation, and enhancement',
        sign_up_modal_security_note:
          'By continuing, you agree to our Terms of Service and Privacy Policy.',
        cancel_title: 'Cancel',
      }) as Record<string, string>
    )[key] ?? key,
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    authModalView: modalState.authModalView,
    isShowSignModal: modalState.isShowSignModal,
    setAuthModalView: setAuthModalViewSpy,
    setIsShowSignModal: setIsShowSignModalSpy,
  }),
}));

vi.mock('@/shared/hooks/use-media-query', () => ({
  useMediaQuery: () => true,
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
}));

vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) =>
    createElement(
      'div',
      null,
      children,
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => onOpenChange?.(false),
        },
        'close'
      )
    ),
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('h2', null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    createElement('p', null, children),
}));

vi.mock('@/shared/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DrawerClose: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DrawerContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DrawerFooter: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DrawerHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DrawerTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  DrawerDescription: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

vi.mock('@/core/auth/callback', () => ({
  resolveClientAuthCallback: () => '/pricing',
}));

vi.mock('./sign-in-form', () => ({
  SignInForm: () =>
    createElement('div', { 'data-slot': 'sign-in-form' }, 'sign-in-form'),
}));

vi.mock('./sign-up-form', () => ({
  SignUpForm: () =>
    createElement('div', { 'data-slot': 'sign-up-form' }, 'sign-up-form'),
}));

async function renderSignModal() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(SignModal, {}));
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

describe('SignModal', () => {
  beforeEach(() => {
    modalState.authModalView = 'sign-in';
    modalState.isShowSignModal = true;
    setAuthModalViewSpy.mockReset();
    setIsShowSignModalSpy.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the shared sign-in form by default', async () => {
    const rendered = await renderSignModal();

    expect(rendered.container.textContent).toContain('Welcome to PhotoEditorAI');
    expect(rendered.container.textContent).toContain('Welcome to PhotoEditorAI');
    expect(rendered.container.textContent).toContain(
      '🎁 Completely Free! Sign in to get free 60 credits'
    );
    expect(rendered.container.textContent).toContain(
      'By continuing, you agree to our Terms of Service and Privacy Policy.'
    );
    expect(
      rendered.container.querySelector('[data-slot="sign-in-form"]')
    ).not.toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="sign-up-form"]')
    ).toBeNull();

    await rendered.unmount();
  });

  it('renders the shared sign-up form when the modal switches view', async () => {
    modalState.authModalView = 'sign-up';

    const rendered = await renderSignModal();

    expect(rendered.container.textContent).toContain('Welcome to PhotoEditorAI');
    expect(rendered.container.textContent).toContain('Welcome to PhotoEditorAI');
    expect(rendered.container.textContent).toContain(
      '💾 Auto Save your edits and generation history'
    );
    expect(
      rendered.container.querySelector('[data-slot="sign-up-form"]')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('resets the modal view to sign-in when closing', async () => {
    modalState.authModalView = 'sign-up';

    const rendered = await renderSignModal();
    const closeButton = rendered.container.querySelector('button');

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setIsShowSignModalSpy).toHaveBeenCalledWith(false);
    expect(setAuthModalViewSpy).toHaveBeenCalledWith('sign-in');

    await rendered.unmount();
  });
});
