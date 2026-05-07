import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  buildPublicContentMetadata,
  renderPublicContentPage,
} from '@/shared/lib/public-content-page';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => {
    if (key === 'title')
      return 'mogged | AI video workflows, pricing, FAQ, and tools';
    if (key === 'description') return 'Common metadata description';
    if (key === 'keywords') return 'common, keywords';
    return '';
  },
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound');
  },
}));

vi.mock('@/themes/default/pages/page-detail', () => ({
  default: ({ page }: any) =>
    createElement('main', { 'data-page-title': page.title }, page.title),
}));

vi.mock('@/shared/models/content', () => ({
  getLocalPage: async ({ slug, locale }: { slug: string; locale: string }) => ({
    title:
      slug === 'mission'
        ? locale === 'zh'
          ? 'mogged 使命'
          : 'mogged Mission'
        : 'mogged Privacy Policy | Accounts, Billing, Workflows',
    seo_title:
      slug === 'mission'
        ? locale === 'zh'
          ? 'mogged 使命｜图片与视频工作流方向'
          : 'mogged Mission | Image and Video Workflow Direction'
        : '',
    description: 'Public page description',
    keywords: 'public, page',
    image: '/images/icons/logo.png',
    created_at_iso: '2026-04-10T00:00:00.000Z',
    updated_at_iso: '2026-04-11T00:00:00.000Z',
  }),
}));

describe('public content metadata', () => {
  it('uses seo_title for mission metadata while keeping a shorter page title', async () => {
    const metadata = await buildPublicContentMetadata({
      locale: 'en',
      contentSlug: 'mission',
      publicPath: '/mission',
    });

    expect(metadata.title).toBe(
      'mogged Mission | Image and Video Workflow Direction'
    );
  });

  it('adds locale-aware social metadata for live non-english public pages', async () => {
    const metadata = await buildPublicContentMetadata({
      locale: 'zh',
      contentSlug: 'mission',
      publicPath: '/mission',
    });

    expect(metadata.alternates).toMatchObject({
      canonical: expect.stringMatching(/\/zh\/mission$/),
    });
    expect(metadata.openGraph).toMatchObject({
      locale: 'zh_CN',
      url: expect.stringMatching(/\/zh\/mission$/),
      images: [
        expect.objectContaining({
          url: expect.stringMatching(/\/images\/icons\/logo\.png$/),
          alt: expect.stringContaining('mogged 使命'),
        }),
      ],
    });
    expect(metadata.twitter?.images).toEqual([
      expect.objectContaining({
        url: expect.stringMatching(/\/images\/icons\/logo\.png$/),
        alt: expect.stringContaining('mogged 使命'),
      }),
    ]);
  });

  it('renders mission as an about page with a branded visible heading', async () => {
    const markup = renderToStaticMarkup(
      await renderPublicContentPage({
        locale: 'en',
        contentSlug: 'mission',
        publicPath: '/mission',
      })
    );

    expect(markup).toContain('data-page-title="mogged Mission"');
    expect(markup).toContain('"@type":"AboutPage"');
  });

  it('renders policy pages as generic web pages instead of articles', async () => {
    const markup = renderToStaticMarkup(
      await renderPublicContentPage({
        locale: 'en',
        contentSlug: 'privacy-policy',
        publicPath: '/privacy-policy',
      })
    );

    expect(markup).toContain('"@type":"WebPage"');
    expect(markup).not.toContain('"@type":"Article"');
  });
});
