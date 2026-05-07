// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DailyClaimButton } from './daily-claim-button';

const appContextState = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    credits: {
      remainingCredits: 100,
      expiresAt: null,
      dailyClaim: {
        claimedToday: false,
        creditsAmount: 15,
      },
    },
  } as
    | {
        id: string;
        credits?: {
          remainingCredits: number;
          expiresAt: null;
          dailyClaim?: {
            claimedToday: boolean;
            creditsAmount: number;
          };
        };
      }
    | null,
  isCheckSign: false,
  configs: {
    daily_claim_credits_amount: '15',
  } as Record<string, string>,
  fetchUserCredits: vi.fn(),
}));

const fetchApiJsonMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const pushSpy = vi.hoisted(() => vi.fn());
const useTranslationsNamespaceSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    useTranslationsNamespaceSpy(namespace);

    return (key: string, values?: Record<string, unknown>) => {
      if (key === 'title') return 'Credits Details';
      if (key === 'description') {
        return 'Claim your daily bonus and manage your credits';
      }
      if (key === 'available_credits') return 'Available Credits';
      if (key === 'daily_bonus.title') return 'Daily Bonus Available!';
      if (key === 'daily_bonus.subtitle') {
        return `Claim +${values?.credits ?? 0} Credits`;
      }
      if (key === 'daily_bonus.button_claim') {
        return `Claim +${values?.credits ?? 0} Credits`;
      }
      if (key === 'daily_bonus.button_claimed') return 'Claimed Today';
      if (key === 'daily_bonus.come_back') {
        return 'Come back tomorrow for another bonus!';
      }
      if (key === 'buttons.buy_more') return 'Buy More Credits';
      if (key === 'messages.success') {
        return `Claimed ${values?.credits ?? 0} credits successfully!`;
      }
      if (key === 'messages.already_claimed') {
        return 'You have already claimed today';
      }
      if (key === 'messages.error') return 'Failed to claim credits';
      return key;
    };
  },
}));

vi.mock('@/core/i18n/navigation', () => ({
  useRouter: () => ({
    push: pushSpy,
  }),
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    user: appContextState.user,
    isCheckSign: appContextState.isCheckSign,
    configs: appContextState.configs,
    fetchUserCredits: appContextState.fetchUserCredits,
  }),
}));

vi.mock('@/shared/lib/api/client', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    status: number;

    constructor(message: string, options: { status: number }) {
      super(message);
      this.status = options.status;
    }
  },
  fetchApiJson: fetchApiJsonMock,
}));

vi.mock('sonner', () => ({
  toast: Object.assign(toastMock, {
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
}));

vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-root' }, children),
  DialogTrigger: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-trigger' }, children),
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-content' }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-header' }, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-title' }, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-description' }, children),
}));

async function renderButton() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(DailyClaimButton));
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

describe('DailyClaimButton', () => {
  beforeEach(() => {
    appContextState.user = {
      id: 'user-1',
      credits: {
        remainingCredits: 100,
        expiresAt: null,
        dailyClaim: {
          claimedToday: false,
          creditsAmount: 15,
        },
      },
    };
    appContextState.isCheckSign = false;
    appContextState.configs = {
      daily_claim_credits_amount: '15',
    };
    appContextState.fetchUserCredits.mockReset();
    fetchApiJsonMock.mockReset();
    fetchApiJsonMock.mockResolvedValue({
      code: 0,
      message: 'ok',
      data: {
        credits: 15,
      },
    });
    toastSuccessMock.mockReset();
    toastMock.mockReset();
    toastErrorMock.mockReset();
    pushSpy.mockReset();
    useTranslationsNamespaceSpy.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('stays hidden until a signed-in user is available', async () => {
    appContextState.user = null;

    const rendered = await renderButton();

    expect(useTranslationsNamespaceSpy).toHaveBeenCalledWith(
      'common.daily_claim'
    );
    expect(rendered.container.textContent).toBe('');

    await rendered.unmount();
  });

  it('updates the visible balance immediately after a successful daily claim', async () => {
    const rendered = await renderButton();
    const claimButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('Claim +15 Credits'));

    expect(rendered.container.textContent).toContain('100');
    expect(claimButton).toBeTruthy();

    await act(async () => {
      claimButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fetchApiJsonMock).toHaveBeenCalledWith('/api/user/daily-claim', {
      method: 'POST',
    });
    expect(appContextState.fetchUserCredits).toHaveBeenCalledTimes(1);
    expect(rendered.container.textContent).toContain('115');
    expect(rendered.container.textContent).toContain('Claimed Today');
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Claimed 15 credits successfully!'
    );

    await rendered.unmount();
  });
});
