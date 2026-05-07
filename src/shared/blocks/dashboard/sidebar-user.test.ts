// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarUser } from './sidebar-user';

const appContextState = vi.hoisted(() => ({
  user: null as
    | {
        name?: string | null;
        email?: string | null;
        image?: string | null;
      }
    | null,
  sessionUser: null as
    | {
        name?: string | null;
        email?: string | null;
        image?: string | null;
      }
    | null,
  isCheckSign: false,
  setIsShowSignModal: vi.fn(),
}));

const signOutSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/core/auth/client', () => ({
  signOut: signOutSpy,
  useSession: () => {
    throw new Error('SidebarUser should rely on AppContext auth state');
  },
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/shared/blocks/common/smart-icon', () => ({
  SmartIcon: ({ name }: { name: string }) =>
    createElement('span', { 'data-slot': 'smart-icon' }, name),
}));

vi.mock('@/shared/blocks/sign/sign-modal', () => ({
  SignModal: () => createElement('div', { 'data-slot': 'sign-modal' }),
}));

vi.mock('@/shared/components/ui/avatar', () => ({
  Avatar: ({ children }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', null, children),
  AvatarFallback: ({ children }: React.HTMLAttributes<HTMLSpanElement>) =>
    createElement('span', null, children),
  AvatarImage: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    createElement('img', props),
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
}));

vi.mock('@/shared/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', null, children),
  DropdownMenuContent: ({ children }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', null, children),
  DropdownMenuGroup: ({ children }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', null, children),
  DropdownMenuItem: ({
    children,
    onClick,
  }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('button', { onClick }, children),
  DropdownMenuLabel: ({ children }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', null, children),
  DropdownMenuSeparator: () => createElement('hr'),
  DropdownMenuTrigger: ({ children }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', null, children),
}));

vi.mock('@/shared/components/ui/sidebar', () => ({
  SidebarMenu: ({ children }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', null, children),
  SidebarMenuButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
  SidebarMenuItem: ({ children }: React.HTMLAttributes<HTMLDivElement>) =>
    createElement('div', null, children),
  useSidebar: () => ({
    isMobile: false,
    open: true,
  }),
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    user: appContextState.user,
    sessionUser: appContextState.sessionUser,
    isCheckSign: appContextState.isCheckSign,
    setIsShowSignModal: appContextState.setIsShowSignModal,
  }),
}));

async function renderSidebarUser() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(SidebarUser, {
        user: {
          show_email: true,
          signin_callback: '/sign-in',
        },
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

describe('SidebarUser', () => {
  beforeEach(() => {
    appContextState.user = null;
    appContextState.sessionUser = null;
    appContextState.isCheckSign = false;
    appContextState.setIsShowSignModal.mockReset();
    signOutSpy.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the shared session user from app context without querying auth again', async () => {
    appContextState.sessionUser = {
      name: 'mogged',
      email: 'hello@mogged.games',
      image: '',
    };

    const rendered = await renderSidebarUser();

    expect(rendered.container.textContent).toContain('mogged');
    expect(rendered.container.textContent).toContain(
      'hello@mogged.games'
    );

    await rendered.unmount();
  });
});
