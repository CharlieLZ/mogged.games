import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  adminWorkbenchLocales,
  backlogAdminWorkbenchLocales,
  backlogPublicSiteLocales,
  getDocumentLocaleAttributes,
  getLocaleBcp47,
  getLocaleTag,
  getLocaleOpenGraph,
  getStaticLocaleParams,
  isRtlLocale,
  normalizeLocale,
  plannedAdminWorkbenchLocales,
  plannedPublicSiteLocales,
  publicSiteLocales,
  resolveAppLocale,
  userWorkbenchLocales,
} from './index';

describe('locale config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes locale tags into supported app locales', () => {
    expect(resolveAppLocale('zh-CN')).toBe('zh');
    expect(resolveAppLocale('fr-FR')).toBe('fr');
    expect(resolveAppLocale('ar_EG')).toBe('ar');
    expect(resolveAppLocale('unknown')).toBe('en');
  });

  it('ships the full public locale rollout while promoting the user workbench to live', () => {
    expect(publicSiteLocales).toEqual([
      'en',
      'zh',
      'de',
      'fr',
      'es',
      'ja',
      'it',
      'ko',
      'ar',
    ]);
    expect(plannedPublicSiteLocales).toEqual([]);
    expect(backlogPublicSiteLocales).toEqual([]);

    expect(userWorkbenchLocales).toEqual([
      'en',
      'zh',
      'de',
      'fr',
      'es',
      'ja',
      'it',
      'ko',
      'ar',
    ]);
  });

  it('keeps the admin rollout staged separately from the user workbench', () => {
    expect(adminWorkbenchLocales).toEqual(['en', 'zh']);
    expect(plannedAdminWorkbenchLocales).toEqual([
      'de',
      'fr',
      'es',
      'ja',
      'it',
      'ko',
    ]);
    expect(backlogAdminWorkbenchLocales).toEqual(['ar']);
  });

  it('exposes locale metadata for SEO and RTL handling', () => {
    expect(getLocaleBcp47('de')).toBe('de-DE');
    expect(getLocaleOpenGraph('ja')).toBe('ja_JP');
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('fr')).toBe(false);
  });

  it('keeps legacy locale helpers available for existing consumers', () => {
    expect(normalizeLocale('ja-JP')).toBe('ja');
    expect(normalizeLocale('unknown')).toBeUndefined();
    expect(getLocaleTag('fr')).toBe('fr-FR');
  });

  it('provides stable locale params for prerendering public routes', () => {
    expect(getStaticLocaleParams()).toEqual(
      publicSiteLocales.map((locale) => ({ locale }))
    );
  });

  it('skips locale prerender params during development to avoid dev manifest corruption', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(getStaticLocaleParams()).toEqual([]);
  });

  it('derives document locale attributes without request cookies', () => {
    expect(getDocumentLocaleAttributes('ar')).toEqual({
      locale: 'ar',
      dir: 'rtl',
    });
    expect(getDocumentLocaleAttributes('unknown')).toEqual({
      locale: 'en',
      dir: 'ltr',
    });
  });
});
