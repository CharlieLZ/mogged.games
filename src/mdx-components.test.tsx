import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MDXComponents } from 'mdx/types';

import { getMDXComponents } from '@/mdx-components';

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    createElement('a', { href, ...props }, children),
}));

function renderLinkMarkup({
  href,
  locale,
  customAnchor,
}: {
  href: string;
  locale: string;
  customAnchor?: React.ComponentType<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >;
}) {
  const overrides = customAnchor
    ? ({ a: customAnchor } as MDXComponents)
    : undefined;
  const LinkComponent = getMDXComponents(overrides, { locale }).a;

  return renderToStaticMarkup(
    createElement(LinkComponent as any, { href }, 'Open page')
  );
}

describe('mdx link components', () => {
  it('localizes root-relative internal links for non-english locales', () => {
    const markup = renderLinkMarkup({
      href: '/pricing',
      locale: 'zh',
    });

    expect(markup).toContain('href="/zh/pricing"');
  });

  it('localizes same-origin absolute links for non-english locales', () => {
    const markup = renderLinkMarkup({
      href: 'https://mogged.games/mission',
      locale: 'fr',
    });

    expect(markup).toContain('href="/fr/mission"');
  });

  it('passes localized internal hrefs through custom anchor components', () => {
    const markup = renderLinkMarkup({
      href: '/terms-of-service',
      locale: 'de',
      customAnchor: ({ children, href, ...props }) =>
        createElement('a', { href, 'data-kind': 'custom', ...props }, children),
    });

    expect(markup).toContain('data-kind="custom"');
    expect(markup).toContain('href="/de/terms-of-service"');
  });
});
