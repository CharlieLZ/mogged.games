import { describe, expect, it } from 'vitest';

import arLanding from '@/config/locale/messages/ar/landing.json';
import arPricing from '@/config/locale/messages/ar/pricing.json';
import deLanding from '@/config/locale/messages/de/landing.json';
import dePricing from '@/config/locale/messages/de/pricing.json';
import enLanding from '@/config/locale/messages/en/landing.json';
import enPricing from '@/config/locale/messages/en/pricing.json';
import esLanding from '@/config/locale/messages/es/landing.json';
import esPricing from '@/config/locale/messages/es/pricing.json';
import frLanding from '@/config/locale/messages/fr/landing.json';
import frPricing from '@/config/locale/messages/fr/pricing.json';
import itLanding from '@/config/locale/messages/it/landing.json';
import itPricing from '@/config/locale/messages/it/pricing.json';
import jaLanding from '@/config/locale/messages/ja/landing.json';
import jaPricing from '@/config/locale/messages/ja/pricing.json';
import koLanding from '@/config/locale/messages/ko/landing.json';
import koPricing from '@/config/locale/messages/ko/pricing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import zhPricing from '@/config/locale/messages/zh/pricing.json';

type FaqItem = {
  question?: string;
  answer?: string;
};

type FaqCategory = {
  title?: string;
  items?: FaqItem[];
};

type FaqSection = {
  categories?: FaqCategory[];
  items?: FaqItem[];
};

function getFaqQuestions(faq: FaqSection): string[] {
  return [
    ...(faq.categories || []).flatMap((category) =>
      (category.items || []).map((item) => item.question || '')
    ),
    ...(faq.items || []).map((item) => item.question || ''),
  ].filter(Boolean);
}

const landingFaqByLocale = {
  en: enLanding.faq,
  zh: zhLanding.faq,
  de: deLanding.faq,
  fr: frLanding.faq,
  es: esLanding.faq,
  ja: jaLanding.faq,
  it: itLanding.faq,
  ko: koLanding.faq,
  ar: arLanding.faq,
} satisfies Record<string, FaqSection>;

const pricingFaqByLocale = {
  en: enPricing.faq,
  zh: zhPricing.faq,
  de: dePricing.faq,
  fr: frPricing.faq,
  es: esPricing.faq,
  ja: jaPricing.faq,
  it: itPricing.faq,
  ko: koPricing.faq,
  ar: arPricing.faq,
} satisfies Record<string, FaqSection>;

describe('presale faq copy', () => {
  it('keeps the English landing faq focused on first-visit user decisions', () => {
    expect(getFaqQuestions(enLanding.faq)).toEqual(
      expect.arrayContaining([
        'What is mogged?',
        'Do I need an account to play?',
        'How does the AI rating work?',
        'How do rank tiers work?',
        'Is my face data stored?',
        'Can the AI be tricked?',
        'How is matchmaking fair?',
        'How do I report an issue?',
      ])
    );
  });

  it('keeps the English pricing faq focused on plan, credit, and billing questions only', () => {
    expect(getFaqQuestions(enPricing.faq)).toEqual(
      expect.arrayContaining([
        'What am I paying for on {{app_domain}}?',
        'Do I need a paid plan to use mogged?',
        'Do free browser tools consume credits?',
        'Do credits pay for mog battles and leaderboard features?',
        'How do battle credit costs change?',
        'Which plan should I start with?',
        'Can I cancel a subscription anytime?',
        'How do I get help with billing or plan selection?',
      ])
    );
    expect(getFaqQuestions(enPricing.faq)).not.toContain(
      'What is mogged?'
    );
  });

  it('keeps landing and pricing faq item counts aligned across all public locales', () => {
    const landingQuestionCount = getFaqQuestions(enLanding.faq).length;
    const pricingQuestionCount = getFaqQuestions(enPricing.faq).length;

    for (const locale of Object.keys(landingFaqByLocale) as Array<
      keyof typeof landingFaqByLocale
    >) {
      expect(getFaqQuestions(landingFaqByLocale[locale]).length).toBe(
        landingQuestionCount
      );
      expect(getFaqQuestions(pricingFaqByLocale[locale]).length).toBe(
        pricingQuestionCount
      );
    }
  });
});
