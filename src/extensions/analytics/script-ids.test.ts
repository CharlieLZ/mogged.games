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

import {
  ClarityAnalyticsProvider,
  GoogleAnalyticsProvider,
  PlausibleAnalyticsProvider,
} from '@/extensions/analytics';

function renderProviderScripts(node: ReactNode) {
  return renderToStaticMarkup(createElement(Fragment, null, node));
}

describe('analytics bootstrap script ids', () => {
  it('uses a non-conflicting id for the Clarity bootstrap script', () => {
    const provider = new ClarityAnalyticsProvider({ clarityId: 'wbmhlwkst2' });

    const markup = renderProviderScripts(provider.getHeadScripts());

    expect(markup).toContain('id="clarity-bootstrap"');
    expect(markup).not.toContain('id="clarity"');
  });

  it('uses a non-conflicting id for the Plausible bootstrap script', () => {
    const provider = new PlausibleAnalyticsProvider({
      domain: 'mogged.games',
      src: 'https://click.pageview.click/js/script.js',
    });

    const markup = renderProviderScripts(provider.getHeadScripts());

    expect(markup).toContain('id="plausible-bootstrap"');
    expect(markup).not.toContain('id="plausible"');
  });

  it('renders Google Analytics as direct head scripts', () => {
    const provider = new GoogleAnalyticsProvider({
      gaId: 'G-D3SR4CETSK',
    });

    const markup = renderProviderScripts(provider.getHeadScripts());

    expect(markup).toContain(
      'src="https://www.googletagmanager.com/gtag/js?id=G-D3SR4CETSK"'
    );
    expect(markup).toContain("gtag('config', 'G-D3SR4CETSK');");
    expect(markup).not.toContain('strategy=');
  });

  it('renders Plausible as direct head scripts', () => {
    const provider = new PlausibleAnalyticsProvider({
      domain: 'mogged.games',
      src: 'https://click.pageview.click/js/script.js',
    });

    const markup = renderProviderScripts(provider.getHeadScripts());

    expect(markup).toContain(
      'src="https://click.pageview.click/js/script.js"'
    );
    expect(markup).toContain('data-domain="mogged.games"');
    expect(markup).not.toContain('strategy=');
  });
});
