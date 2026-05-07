// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Footer } from '@/themes/default/blocks/footer';

vi.mock('@/shared/blocks/common/brand-logo', () => ({
  BrandLogo: () => null,
}));

vi.mock('@/shared/blocks/common/built-with', () => ({
  BuiltWith: () => null,
}));

vi.mock('@/shared/blocks/common/copyright', () => ({
  Copyright: () => null,
}));

vi.mock('@/shared/blocks/common/locale-selector', () => ({
  LocaleSelector: () => null,
}));

vi.mock('@/shared/blocks/common/smart-link', () => ({
  SmartLink: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => createElement('a', { href, className }, children),
}));

vi.mock('@/shared/blocks/common/theme-toggler', () => ({
  ThemeToggler: () => null,
}));

vi.mock('@/shared/blocks/common/smart-icon', () => ({
  SmartIcon: () => null,
}));

async function renderFooter() {
  const container = document.createElement('div');
  const root = createRoot(container);
  const footer = {
    id: 'footer',
    brand: {
      title: 'mogged',
      description:
        'Hosted video workflows and browser tools on mogged.games.',
    },
    disclaimer:
      'mogged is an independent product operated on mogged.games and is not affiliated with any model provider.',
    nav: {
      items: [
        {
          title: 'Mission',
          children: [
            {
              title: 'Our Mission',
              url: '/mission',
            },
            {
              title: 'Pricing',
              url: '/pricing',
            },
            {
              title: 'Support',
              url: 'mailto:support@example.com',
            },
          ],
        },
      ],
    },
  };

  await act(async () => {
    root.render(createElement(Footer, { footer }));
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

describe('Footer support email links', () => {
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

  it('shows the support email address instead of a generic Support label for mailto items', async () => {
    const rendered = await renderFooter();
    const sectionTitle = rendered.container.querySelector('span');
    const brandDescription = rendered.container.querySelector('p');
    const supportLink = rendered.container.querySelector('a[href="mailto:support@example.com"]');
    const pricingLink = rendered.container.querySelector('a[href="/pricing"]');
    const disclaimer = rendered.container.querySelector('[data-nosnippet]');

    expect(sectionTitle?.textContent).toBe('Mission');
    expect(brandDescription?.className).toContain('max-w-none');
    expect(brandDescription?.className).toContain('sm:max-w-[34ch]');
    expect(brandDescription?.className).toContain('sm:text-balance');
    expect(brandDescription?.className).not.toContain(' text-balance ');
    expect(pricingLink?.textContent).toBe('Pricing');
    expect(rendered.container.textContent).toContain('support@example.com');
    expect(supportLink?.textContent).toBe('support@example.com');
    expect(disclaimer?.className).toContain('whitespace-normal');
    expect(disclaimer?.className).not.toContain('md:whitespace-nowrap');
    expect(rendered.container.textContent).not.toContain('Support');
    expect(rendered.container.textContent).not.toContain('FAQ');
    expect(rendered.container.textContent).not.toContain('About');

    await rendered.unmount();
  });
});
