// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '@/themes/default/blocks/header';

const mediaState = vi.hoisted(() => ({
  isLarge: true,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
    target,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    target?: string;
    onClick?: () => void;
  }) => createElement('a', { href, className, target, onClick }, children),
  usePathname: () => '/',
}));

vi.mock('@/shared/hooks/use-media', () => ({
  useMedia: () => mediaState.isLarge,
}));

vi.mock('@/shared/lib/common-copy', () => ({
  getCommonCopy: () => ({
    a11y: {
      close_menu: 'Close menu',
      open_menu: 'Open menu',
      toggle_theme: 'Toggle theme',
      change_language: 'Change language',
    },
  }),
}));

vi.mock('@/shared/blocks/common/brand-logo', () => ({
  BrandLogo: ({ brand }: { brand: { title: string } }) =>
    createElement('span', { 'data-slot': 'brand-logo' }, brand.title),
}));

vi.mock('@/shared/blocks/common/daily-claim-button', () => ({
  DailyClaimButton: () =>
    createElement('button', { 'data-slot': 'daily-claim' }, 'Claim'),
}));

vi.mock('@/shared/blocks/common/locale-selector', () => ({
  LocaleSelector: ({ ariaLabel }: { ariaLabel?: string }) =>
    createElement(
      'button',
      { 'data-slot': 'locale-selector', 'aria-label': ariaLabel },
      'English'
    ),
}));

vi.mock('@/shared/blocks/common/smart-icon', () => ({
  SmartIcon: () => createElement('span', { 'data-slot': 'smart-icon' }),
}));

vi.mock('@/shared/blocks/common/theme-toggler', () => ({
  ThemeToggler: ({ ariaLabel }: { ariaLabel?: string }) =>
    createElement(
      'button',
      { 'data-slot': 'theme-toggler', 'aria-label': ariaLabel },
      'Theme'
    ),
}));

vi.mock('@/shared/blocks/sign/sign-user', () => ({
  SignUser: () =>
    createElement('button', { 'data-slot': 'sign-user' }, 'Account'),
}));

vi.mock('@/shared/components/ui/navigation-menu', () => ({
  NavigationMenu: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) =>
    createElement(
      'div',
      { 'data-slot': 'navigation-menu', className },
      children
    ),
  NavigationMenuContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => createElement('div', { className }, children),
  NavigationMenuItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
  }) => createElement('div', { 'data-value': value }, children),
  NavigationMenuLink: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  NavigationMenuList: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => createElement('div', { className }, children),
  NavigationMenuTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => createElement('button', { className }, children),
}));

vi.mock('@/shared/components/ui/accordion', () => ({
  Accordion: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => createElement('div', { className }, children),
  AccordionContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => createElement('div', { className }, children),
  AccordionItem: ({
    children,
    className,
    value,
  }: {
    children: React.ReactNode;
    className?: string;
    value?: string;
  }) => createElement('div', { className, 'data-value': value }, children),
  AccordionTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => createElement('button', { className }, children),
}));

const headerFixture = {
  brand: {
    title: 'mogged',
  },
  nav: {
    items: [
      {
        title: 'AI Image Editor',
        url: '/',
      },
      {
        title: 'AI Image Generator',
        url: '/ai-image-generator',
      },
      {
        title: 'Video Workflows',
        children: [
          {
            title: 'Text to Video',
            url: '/text-to-video',
          },
        ],
      },
      {
        title: 'Pricing',
        url: '/pricing',
      },
    ],
  },
  show_theme: true,
  show_locale: true,
  show_sign: true,
  buttons: [
    {
      title: 'Sign In',
      url: '/sign-in',
      variant: 'default',
    },
  ],
  user_nav: {
    items: [],
  },
};

async function renderHeader() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(Header, { header: headerFixture as any }));
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

describe('Landing header layout', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders a stable header shell with centered desktop navigation', async () => {
    mediaState.isLarge = true;
    const rendered = await renderHeader();
    const shell = rendered.container.querySelector(
      '[data-slot="landing-header-shell"]'
    );
    const row = rendered.container.querySelector(
      '[data-slot="landing-header-row"]'
    );
    const navRail = rendered.container.querySelector(
      '[data-slot="landing-header-nav-rail"]'
    );
    const navMenu = rendered.container.querySelector(
      '[data-slot="navigation-menu"]'
    );

    expect(shell).not.toBeNull();
    expect(shell?.className).toContain('min-h-14');
    expect(shell?.className).toContain('lg:min-h-18');
    expect(shell?.className).not.toContain('absolute inset-x-0 top-0');
    expect(row?.className).toContain(
      'lg:grid-cols-[minmax(12rem,1fr)_auto_minmax(12rem,1fr)]'
    );
    expect(navRail?.className).toContain('lg:justify-center');
    expect(navMenu?.className).not.toContain('lg:-translate-x-1/3');
    expect(navRail?.className).not.toContain('lg:-translate-x-1/3');
    expect(navRail?.className).not.toContain('lg:justify-start');

    await rendered.unmount();
  });

  it('renders a dedicated mobile panel so controls stack below the brand row when the menu opens', async () => {
    mediaState.isLarge = false;
    const rendered = await renderHeader();

    const toggle = rendered.container.querySelector(
      'button[aria-label="Open menu"]'
    ) as HTMLButtonElement | null;

    expect(toggle).not.toBeNull();

    await act(async () => {
      toggle?.click();
    });

    expect(
      rendered.container.querySelector(
        '[data-slot="landing-header-mobile-panel"]'
      )
    ).not.toBeNull();
    expect(
      rendered.container.querySelector(
        '[data-slot="landing-header-mobile-actions"]'
      )
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('places theme and locale controls to the right of the sign-in action on desktop', async () => {
    mediaState.isLarge = true;
    const rendered = await renderHeader();

    const actions = rendered.container.querySelector(
      '[data-slot="landing-header-actions"]'
    );
    const slots = Array.from(
      actions?.querySelectorAll('[data-slot]') ?? []
    ).map((element) => element.getAttribute('data-slot'));
    const signIndex = slots.indexOf('sign-user');
    const themeIndex = slots.indexOf('theme-toggler');
    const localeIndex = slots.indexOf('locale-selector');

    expect(signIndex).toBeGreaterThanOrEqual(0);
    expect(themeIndex).toBeGreaterThan(signIndex);
    expect(localeIndex).toBeGreaterThan(signIndex);

    await rendered.unmount();
  });

  it('renders primary product navigation links on desktop and mobile', async () => {
    mediaState.isLarge = true;
    const desktop = await renderHeader();
    const desktopLinks = Array.from(
      desktop.container.querySelectorAll(
        '[data-slot="landing-header-nav-rail"] a'
      )
    ).map((link) => [link.textContent?.trim(), link.getAttribute('href')]);

    expect(desktopLinks).toEqual(
      expect.arrayContaining([
        ['AI Image Editor', '/'],
        ['AI Image Generator', '/ai-image-generator'],
      ])
    );
    expect(desktopLinks).not.toEqual(
      expect.arrayContaining([['Free Tools', '']])
    );

    await desktop.unmount();

    mediaState.isLarge = false;
    const mobile = await renderHeader();
    const toggle = mobile.container.querySelector(
      'button[aria-label="Open menu"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      toggle?.click();
    });

    const mobileLinks = Array.from(
      mobile.container.querySelectorAll(
        '[data-slot="landing-header-mobile-panel"] a'
      )
    ).map((link) => [link.textContent?.trim(), link.getAttribute('href')]);

    expect(mobileLinks).toEqual(
      expect.arrayContaining([
        ['AI Image Editor', '/'],
        ['AI Image Generator', '/ai-image-generator'],
      ])
    );
    expect(mobileLinks).not.toEqual(
      expect.arrayContaining([['Free Tools', '']])
    );

    await mobile.unmount();
  });

  it('renders a single theme and locale control in the desktop action rail', async () => {
    mediaState.isLarge = true;
    const rendered = await renderHeader();

    const actions = rendered.container.querySelector(
      '[data-slot="landing-header-actions"]'
    );

    expect(
      actions?.querySelectorAll('[data-slot="theme-toggler"]')
    ).toHaveLength(1);
    expect(
      actions?.querySelectorAll('[data-slot="locale-selector"]')
    ).toHaveLength(1);

    await rendered.unmount();
  });

  it('passes accessible labels to global header controls', async () => {
    mediaState.isLarge = true;
    const rendered = await renderHeader();

    const actions = rendered.container.querySelector(
      '[data-slot="landing-header-actions"]'
    );

    expect(
      actions
        ?.querySelector('[data-slot="theme-toggler"]')
        ?.getAttribute('aria-label')
    ).toBe('Toggle theme');
    expect(
      actions
        ?.querySelector('[data-slot="locale-selector"]')
        ?.getAttribute('aria-label')
    ).toBe('Change language');

    await rendered.unmount();
  });

  it('renders a single theme and locale control in the open mobile action panel', async () => {
    mediaState.isLarge = false;
    const rendered = await renderHeader();

    const toggle = rendered.container.querySelector(
      'button[aria-label="Open menu"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      toggle?.click();
    });

    const actions = rendered.container.querySelector(
      '[data-slot="landing-header-mobile-actions"]'
    );

    expect(
      actions?.querySelectorAll('[data-slot="theme-toggler"]')
    ).toHaveLength(1);
    expect(
      actions?.querySelectorAll('[data-slot="locale-selector"]')
    ).toHaveLength(1);

    await rendered.unmount();
  });
});
