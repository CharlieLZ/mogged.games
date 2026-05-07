import { Fragment, createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/script', () => ({
  default: ({
    children,
    dangerouslySetInnerHTML,
    ...props
  }: Record<string, unknown>) =>
    createElement(
      'script',
      {
        ...props,
        dangerouslySetInnerHTML,
      },
      children as ReactNode
    ),
}));

import { AdsenseProvider } from '@/extensions/ads';

function renderProviderScripts(node: ReactNode) {
  return renderToStaticMarkup(createElement(Fragment, null, node));
}

describe('AdsenseProvider', () => {
  it('loads the Adsense bootstrap script after hydration with a stable id', () => {
    const provider = new AdsenseProvider({
      adId: 'pub-6762879731814955',
    });

    const markup = renderProviderScripts(provider.getHeadScripts());

    expect(markup).toContain('id="adsense-loader"');
    expect(markup).toContain('strategy="afterInteractive"');
    expect(markup).toContain(
      'src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=pub-6762879731814955"'
    );
  });
});
