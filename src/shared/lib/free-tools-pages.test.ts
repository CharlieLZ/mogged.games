import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import {
  freeToolsPageLocaleMessagesPaths,
  publicPageLocaleMessagesPaths,
} from '@/config/locale';
import { renderFreeToolsIndexPage } from '@/shared/lib/free-tools-pages';

const FREE_TOOL_PAGE_FILES = [
  'src/shared/lib/free-tools-pages.tsx',
  'src/shared/lib/free-tools-catalog.ts',
  'src/app/[locale]/(landing)/free-tools/[slug]/page.tsx',
] as const;

const mockToolCopy = {
  title: 'Tool title',
  description: 'Tool description',
  tips: ['Tip'],
};

vi.mock('next-intl/server', () => ({
  getTranslations: async () => ({
    raw: (key: string) => {
      if (key === 'free_tools.index') {
        return {
          title: 'Free Browser Image and Video Tools',
          description: 'Prepare media files locally before upload.',
          sections: [
            {
              title: 'Images',
              description: 'Local browser tools for image prep.',
              items: [
                {
                  title: 'Image Converter',
                  description: 'Convert images locally.',
                  url: '/free-tools/image-converter',
                },
              ],
            },
          ],
        };
      }

      if (key.startsWith('free_tools.')) {
        return mockToolCopy;
      }

      throw new Error(`unexpected translation key: ${key}`);
    },
  }),
  setRequestLocale: vi.fn(),
}));

vi.mock('@/shared/blocks/common/page-header', () => ({
  PageHeader: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => createElement('header', null, `${title} ${description}`),
}));

vi.mock('@/shared/components/ui/card', () => ({
  Card: ({
    children,
    className,
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) =>
    createElement('div', { className }, children),
  CardHeader: ({
    children,
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) =>
    createElement('div', null, children),
  CardTitle: ({
    children,
    className,
  }: React.HTMLAttributes<HTMLHeadingElement> & { children: React.ReactNode }) =>
    createElement('h3', { className }, children),
  CardContent: ({
    children,
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

describe('free tools pages', () => {
  it('does not load or render retired tool guide SEO copy sections', () => {
    const projectRoot = process.cwd();

    expect(publicPageLocaleMessagesPaths).not.toContain('tool_guides');
    expect(freeToolsPageLocaleMessagesPaths).not.toContain('tool_guides');

    for (const relativeFile of FREE_TOOL_PAGE_FILES) {
      const source = fs.readFileSync(
        path.join(projectRoot, relativeFile),
        'utf8'
      );

      expect(source, relativeFile).not.toContain('ToolGuideContent');
      expect(source, relativeFile).not.toContain(
        "getTranslations('tool_guides')"
      );
      expect(source, relativeFile).not.toContain('tool-guide-content');
      expect(source, relativeFile).not.toContain('guideSlug');
    }
  });

  it('keeps free tool index links localized for non-default locales', async () => {
    const markup = renderToStaticMarkup(await renderFreeToolsIndexPage('zh'));

    expect(markup).toContain('href="/zh/free-tools/image-converter"');
    expect(markup).toContain('href="/zh/free-tools/image-color-extractor"');
    expect(markup).toContain('href="/zh/free-tools/video-trimmer"');
  });
});
