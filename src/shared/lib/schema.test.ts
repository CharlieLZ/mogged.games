import { describe, expect, it } from 'vitest';

import { DEFAULT_APP_NAME, DEFAULT_APP_URL } from './brand';
import {
  getArticleSchema,
  getOrganizationSchema,
  getWebApplicationSchema,
  getWebPageSchema,
} from './schema';
import { SITE_BRAND_LOGO_PATH } from './site-visuals';

describe('schema helpers', () => {
  it('uses the default public seo image for the organization logo fallback', () => {
    const schema = getOrganizationSchema();

    expect(schema.name).toBe(DEFAULT_APP_NAME);
    expect(schema.url).toBe(DEFAULT_APP_URL);
    expect(schema.logo).toBe(`${DEFAULT_APP_URL}${SITE_BRAND_LOGO_PATH}`);
  });

  it('uses the default public seo image for the article publisher logo fallback', () => {
    const schema = getArticleSchema({
      headline: 'mogged update',
      description: 'Schema defaults should stay aligned with brand seo assets.',
      image: '/images/icons/logo.png',
      datePublished: '2026-04-12T00:00:00.000Z',
      dateModified: '2026-04-12T00:00:00.000Z',
      url: '/updates/schema-defaults',
    });

    expect(schema.publisher).toEqual({
      '@type': 'Organization',
      name: DEFAULT_APP_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${DEFAULT_APP_URL}${SITE_BRAND_LOGO_PATH}`,
      },
    });
  });

  it('builds web page schema with the requested page subtype', () => {
    const schema = getWebPageSchema({
      type: 'AboutPage',
      name: 'Our Mission',
      description: 'Learn what mogged is for.',
      url: '/mission',
    });

    expect(schema['@type']).toBe('AboutPage');
    expect(schema.url).toBe(`${DEFAULT_APP_URL}/mission`);
    expect(schema.name).toBe('Our Mission');
    expect(schema.isPartOf).toEqual({
      '@type': 'WebSite',
      name: DEFAULT_APP_NAME,
      url: DEFAULT_APP_URL,
    });
  });

  it('includes optional image and publish metadata for public tool pages', () => {
    const schema = getWebPageSchema({
      name: 'Image Converter',
      description: 'Convert images in the browser.',
      url: '/free-tools/image-converter',
      image: '/opengraph-image.png',
      datePublished: '2026-04-10T00:00:00.000Z',
      dateModified: '2026-04-12T00:00:00.000Z',
    });

    expect(schema.datePublished).toBe('2026-04-10T00:00:00.000Z');
    expect(schema.dateModified).toBe('2026-04-12T00:00:00.000Z');
    expect(schema.primaryImageOfPage).toEqual({
      '@type': 'ImageObject',
      url: `${DEFAULT_APP_URL}/opengraph-image.png`,
    });
  });

  it('supports multiple pricing offers on a web application schema', () => {
    const schema = getWebApplicationSchema({
      name: DEFAULT_APP_NAME,
      description: 'Pricing for the hosted workspace.',
      url: '/pricing',
      offers: [
        {
          name: 'Try Monthly',
          price: '14.99',
          priceCurrency: 'USD',
          url: `${DEFAULT_APP_URL}/pricing#pricing`,
          category: 'monthly',
        },
        {
          name: 'Pro Yearly',
          price: '299.99',
          priceCurrency: 'USD',
          url: `${DEFAULT_APP_URL}/pricing#pricing`,
          category: 'yearly',
        },
      ],
    });

    expect(schema.offers).toEqual([
      {
        '@type': 'Offer',
        name: 'Try Monthly',
        price: '14.99',
        priceCurrency: 'USD',
        url: `${DEFAULT_APP_URL}/pricing#pricing`,
        category: 'monthly',
      },
      {
        '@type': 'Offer',
        name: 'Pro Yearly',
        price: '299.99',
        priceCurrency: 'USD',
        url: `${DEFAULT_APP_URL}/pricing#pricing`,
        category: 'yearly',
      },
    ]);
  });
});
