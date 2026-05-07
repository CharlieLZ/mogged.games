import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { UseCasesShowcase } from '@/themes/default/blocks/use-cases-showcase';

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

describe('landing use-cases showcase', () => {
  it('localizes internal workflow ctas', () => {
    const markup = renderToStaticMarkup(
      <UseCasesShowcase
        useCases={{
          id: 'use-cases',
          title: 'Typical workflows',
          items: [
            {
              title: 'Storyboard',
              description: 'Generate the next scene.',
              video_url: 'https://example.com/storyboard.mp4',
              button: {
                title: 'Start creating',
                url: '/ai-video-generator?mode=image-to-video',
              },
            },
          ],
        }}
      />
    );

    expect(markup).toContain('href="/zh/ai-video-generator?mode=image-to-video"');
  });
});
