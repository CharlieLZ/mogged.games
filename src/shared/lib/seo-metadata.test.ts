import { describe, expect, it, vi } from 'vitest';

import { getMetadata } from './seo';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => ({
    has: () => false,
    t: () => '',
  }),
  setRequestLocale: vi.fn(),
}));

describe('seo metadata builder', () => {
  it('uses the generated social card route and rich google bot preview settings', async () => {
    const generateMetadata = getMetadata({
      title: 'mogged Pricing',
      description: 'Hosted AI video pricing',
      canonicalUrl: '/pricing',
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringMatching(/\/opengraph-image\.png$/),
        width: 1200,
        height: 630,
      }),
    ]);
    expect(metadata.twitter?.images).toEqual([
      expect.objectContaining({
        url: expect.stringMatching(/\/opengraph-image\.png$/),
        alt: 'mogged Pricing social share card',
        width: 1200,
        height: 630,
      }),
    ]);
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

  it('locks noindex pages down for both generic robots and google bot', async () => {
    const generateMetadata = getMetadata({
      title: 'mogged Sign In',
      description: 'Sign in',
      canonicalUrl: '/sign-in',
      noIndex: true,
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
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

  it('auto-noindexes configured public free-tool routes from their canonical path', async () => {
    const noIndexPaths = [
      '/free-tools',
      '/free-tools/image-converter',
      '/free-tools/image-color-extractor',
      '/free-tools/image-compressor',
      '/free-tools/image-cropper',
      '/free-tools/image-resizer',
      '/free-tools/image-upscaler',
      '/free-tools/image-rotator',
      '/free-tools/image-metadata-remover',
      '/free-tools/video-converter',
      '/free-tools/video-trimmer',
      '/free-tools/video-to-gif',
      '/free-tools/video-thumbnail',
    ] as const;

    for (const canonicalUrl of noIndexPaths) {
      const generateMetadata = getMetadata({
        title: `Metadata for ${canonicalUrl}`,
        description: `Description for ${canonicalUrl}`,
        canonicalUrl,
      });

      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: 'en' }),
      });

      expect(metadata.robots, canonicalUrl).toMatchObject({
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      });
    }
  });

  it('uses locale-aware alternates and open graph locale metadata for live non-english routes', async () => {
    const generateMetadata = getMetadata({
      title: 'mogged Pricing',
      description: 'Hosted AI video pricing',
      canonicalUrl: '/pricing',
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'de' }),
    });

    expect(metadata.alternates).toMatchObject({
      canonical: expect.stringMatching(/\/de\/pricing$/),
      languages: {
        en: expect.stringMatching(/\/pricing$/),
        de: expect.stringMatching(/\/de\/pricing$/),
        'x-default': expect.stringMatching(/\/pricing$/),
      },
    });
    expect(metadata.openGraph).toMatchObject({
      locale: 'de_DE',
      url: expect.stringMatching(/\/de\/pricing$/),
      alternateLocale: expect.arrayContaining([
        'en_US',
        'zh_CN',
        'fr_FR',
      ]),
    });
  });
});
