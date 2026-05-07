import { describe, expect, it } from 'vitest';

import {
  getDefaultLocaleCanonicalPath,
  getLocalizedHref,
  getLocalizedPath,
  normalizeLocalizedPath,
} from './localized-path';

describe('localized-path', () => {
  it('keeps the default english locale on root without an /en prefix', () => {
    expect(getLocalizedPath('/', 'en')).toBe('/');
    expect(getLocalizedPath('/pricing', 'en')).toBe('/pricing');
  });

  it('adds a locale prefix for non-default locales', () => {
    expect(getLocalizedPath('/', 'zh')).toBe('/zh');
    expect(getLocalizedPath('/pricing', 'zh')).toBe('/zh/pricing');
  });

  it('normalizes trailing slashes and empty values', () => {
    expect(normalizeLocalizedPath('')).toBe('/');
    expect(normalizeLocalizedPath('pricing/')).toBe('/pricing');
    expect(normalizeLocalizedPath('/pricing///')).toBe('/pricing');
  });


  it('strips existing locale prefixes before rebuilding localized paths', () => {
    expect(normalizeLocalizedPath('/en')).toBe('/');
    expect(normalizeLocalizedPath('/en/pricing')).toBe('/pricing');
    expect(normalizeLocalizedPath('/zh/pricing')).toBe('/pricing');
    expect(getLocalizedPath('/en/pricing', 'en')).toBe('/pricing');
    expect(getLocalizedPath('/en/pricing', 'zh')).toBe('/zh/pricing');
  });


  it('returns canonical root-path redirects for accidental default-locale URLs', () => {
    expect(getDefaultLocaleCanonicalPath('/en')).toBe('/');
    expect(getDefaultLocaleCanonicalPath('/en/pricing')).toBe('/pricing');
    expect(getDefaultLocaleCanonicalPath('/zh/pricing')).toBeNull();
    expect(getDefaultLocaleCanonicalPath('/pricing')).toBeNull();
  });

  it('preserves search params and hashes when building a localized href', () => {
    expect(
      getLocalizedHref({
        pathname: '/',
        locale: 'en',
        search: 'tab=plans',
        hash: 'details',
      })
    ).toBe('/?tab=plans#details');

    expect(
      getLocalizedHref({
        pathname: '/pricing',
        locale: 'zh',
        search: '?cycle=yearly',
        hash: '#faq',
      })
    ).toBe('/zh/pricing?cycle=yearly#faq');
  });
});
