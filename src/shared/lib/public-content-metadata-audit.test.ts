import { describe, expect, it, vi } from 'vitest';

import { buildPublicContentMetadata } from '@/shared/lib/public-content-page';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => {
    if (key === 'title') return 'mogged';
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

vi.mock('@/shared/models/content', () => ({
  getLocalPage: async ({ slug, locale }: { slug: string; locale: string }) => ({
    title:
      slug === 'mission'
        ? locale === 'zh'
          ? 'mogged 使命'
          : 'mogged Mission'
        : 'mogged Privacy Policy',
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

describe('public content metadata audit', () => {
  it('keeps public content pages crawlable with explicit robots metadata', async () => {
    const metadata = await buildPublicContentMetadata({
      locale: 'en',
      contentSlug: 'mission',
      publicPath: '/mission',
    });

    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    });
  });

  it('keeps policy pages noindex even though they stay publicly reachable', async () => {
    const metadata = await buildPublicContentMetadata({
      locale: 'en',
      contentSlug: 'privacy-policy',
      publicPath: '/privacy-policy',
    });

    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
  });

  it('keeps public content social metadata aligned with locale alternates', async () => {
    const metadata = await buildPublicContentMetadata({
      locale: 'zh',
      contentSlug: 'mission',
      publicPath: '/mission',
    });

    expect(metadata.openGraph).toMatchObject({
      locale: 'zh_CN',
      alternateLocale: expect.arrayContaining(['en_US', 'de_DE', 'fr_FR']),
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
});
