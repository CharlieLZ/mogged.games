import { describe, expect, it } from 'vitest';

import {
  DEFAULT_APP_NAME,
  DEFAULT_APP_URL,
  DEFAULT_PUBLIC_SEO_IMAGE,
  normalizeAppName,
  normalizeAppUrl,
  replaceBrandTokens,
} from './brand';
import { SITE_BRAND_LOGO_PATH, SITE_BRAND_MARK_PATH } from './site-visuals';

describe('brand helpers', () => {
  it('normalizes placeholder app names to mogged', () => {
    expect(normalizeAppName('mogged.games')).toBe(DEFAULT_APP_NAME);
    expect(normalizeAppName('mogged')).toBe(DEFAULT_APP_NAME);
    expect(normalizeAppName('www.mogged.games')).toBe(DEFAULT_APP_NAME);
  });

  it('normalizes the canonical public domain to the canonical site url', () => {
    expect(normalizeAppUrl('https://mogged.games')).toBe(DEFAULT_APP_URL);
    expect(normalizeAppUrl('https://www.mogged.games/')).toBe(
      DEFAULT_APP_URL
    );
  });

  it('preserves explicit brand names and local development urls', () => {
    expect(normalizeAppName('Custom AI Studio')).toBe('Custom AI Studio');
    expect(normalizeAppName('Other Creative Studio')).toBe(
      'Other Creative Studio'
    );
    expect(normalizeAppUrl('https://custom.example.com/')).toBe(
      'https://custom.example.com'
    );
    expect(normalizeAppUrl('http://localhost:3000/')).toBe(
      'http://localhost:3000'
    );
    expect(normalizeAppUrl('https://workspace.example.com/')).toBe(
      'https://workspace.example.com'
    );
    expect(replaceBrandTokens('https://custom.example.com')).toBe(
      'https://custom.example.com'
    );
  });

  it('uses a local default public seo image', () => {
    expect(DEFAULT_PUBLIC_SEO_IMAGE).toBe('/opengraph-image.png');
    expect(DEFAULT_PUBLIC_SEO_IMAGE).not.toContain('mogged.games');
  });

  it('replaces shared visual asset placeholders with the canonical asset paths', () => {
    expect(replaceBrandTokens('{{brand_mark_src}}')).toBe(SITE_BRAND_MARK_PATH);
    expect(replaceBrandTokens('{{brand_logo_src}}')).toBe(SITE_BRAND_LOGO_PATH);
  });
});
