import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Copyright } from '@/shared/blocks/common/copyright';

function localizeHref(href: string) {
  if (!href.startsWith('/')) {
    return href;
  }

  return href === '/' ? '/zh' : `/zh${href}`;
}

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    createElement('a', { href: localizeHref(href), ...props }, children),
}));

describe('Copyright', () => {
  it('uses locale-aware internal brand links', () => {
    const markup = renderToStaticMarkup(
      <Copyright
        brand={{
          title: 'mogged',
          url: '/',
        }}
      />
    );

    expect(markup).toContain('href="/zh"');
  });

  it('keeps external fallback urls unchanged', () => {
    const markup = renderToStaticMarkup(
      <Copyright
        brand={{
          title: 'mogged',
        }}
      />
    );

    expect(markup).toContain('href="https://mogged.games"');
  });
});
