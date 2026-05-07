import { describe, expect, it } from 'vitest';

import arLanding from '@/config/locale/messages/ar/landing.json';
import deLanding from '@/config/locale/messages/de/landing.json';
import enLanding from '@/config/locale/messages/en/landing.json';
import esLanding from '@/config/locale/messages/es/landing.json';
import frLanding from '@/config/locale/messages/fr/landing.json';
import itLanding from '@/config/locale/messages/it/landing.json';
import jaLanding from '@/config/locale/messages/ja/landing.json';
import koLanding from '@/config/locale/messages/ko/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

const localizedLandingPages = {
  ar: arLanding,
  de: deLanding,
  en: enLanding,
  es: esLanding,
  fr: frLanding,
  it: itLanding,
  ja: jaLanding,
  ko: koLanding,
  zh: zhLanding,
} as const;

describe('localized landing image-editor positioning', () => {
  it('keeps every homepage high-intent section focused on image editing without removing live generator workflows', () => {
    for (const [locale, landing] of Object.entries(localizedLandingPages)) {
      const copy = replaceBrandTokensDeep(landing);
      const highIntentSections = JSON.stringify({
        benefits: copy.benefits,
        usage: copy.usage,
        features: copy.features,
        gallery: copy.gallery,
        use_cases: copy.use_cases,
        faq: copy.faq,
      }).toLowerCase();

      expect(copy.usage.title, `${locale} usage title`).toBeTruthy();
      expect(copy.features.title, `${locale} features title`).toBeTruthy();
      expect(copy.faq.title, `${locale} faq title`).toBeTruthy();
      expect(
        highIntentSections,
        `${locale} should not describe live video workflows as removed`
      ).not.toContain('deprecated video');
      expect(
        highIntentSections,
        `${locale} should not describe live video workflows as removed`
      ).not.toContain('deleted video');
      expect(
        highIntentSections,
        `${locale} should keep the homepage tied to the surviving image workspace`
      ).toContain('/ai-image-generator');
    }
  });

  it('keeps homepage FAQ concise while covering image and video entry points', () => {
    for (const [locale, landing] of Object.entries(localizedLandingPages)) {
      const faqItems =
        landing.faq.categories?.flatMap((category) => category.items ?? []) ??
        [];
      const faqText = JSON.stringify(landing.faq).toLowerCase();

      expect(faqItems, `${locale} homepage FAQ count`).toHaveLength(7);
      expect(
        faqText,
        `${locale} homepage FAQ should point to image page`
      ).toContain('ai-image-generator');
      expect(
        faqText,
        `${locale} homepage FAQ should point to video page`
      ).toContain('ai-video-generator');
    }
  });
});
