import { Fragment, createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getAnalyticsManagerWithConfigs } from './analytics';

function renderAnalyticsNode(node: ReactNode) {
  return renderToStaticMarkup(createElement(Fragment, null, node));
}

describe('analytics service', () => {
  it('renders direct Google and Plausible head scripts from resolved configs', () => {
    const manager = getAnalyticsManagerWithConfigs({
      google_analytics_id: 'G-D3SR4CETSK',
      enable_ads_tracking: 'true',
      google_ads_conversion_id: '18076962334',
      plausible_domain: 'mogged.games',
      plausible_src: 'https://click.pageview.click/js/script.js',
      clarity_id: '',
      openpanel_client_id: '',
      vercel_analytics_enabled: 'false',
    });

    const markup = renderAnalyticsNode(manager.getHeadScripts());

    expect(markup).toContain(
      'src="https://www.googletagmanager.com/gtag/js?id=G-D3SR4CETSK"'
    );
    expect(markup).toContain("gtag('config', 'G-D3SR4CETSK');");
    expect(markup).toContain("gtag('config', 'AW-18076962334');");
    expect(markup).toContain(
      'src="https://click.pageview.click/js/script.js"'
    );
    expect(markup).toContain('data-domain="mogged.games"');
    expect(markup).not.toContain('strategy=');
  });
});
