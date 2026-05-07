import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-themes', () => ({
  ThemeProvider: ({
    children,
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    createElement('div', { 'data-slot': 'theme-provider' }, children),
}));

import { ThemeProvider } from './provider';

describe('ThemeProvider', () => {
  it('renders without requiring the next-intl context when locale is passed from the layout', () => {
    const html = renderToStaticMarkup(
      createElement(
        ThemeProvider as React.ComponentType<{
          children?: React.ReactNode;
          locale?: string;
        }>,
        {
          locale: 'fr',
          children: createElement('main', null, 'workspace'),
        }
      )
    );

    expect(html).toContain('workspace');
    expect(html).toContain('data-slot="theme-provider"');
  });
});
