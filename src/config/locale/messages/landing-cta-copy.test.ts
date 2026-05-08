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

const localizedLandings = {
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

const localizedCtaExpectations = {
  ar: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
  de: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
  en: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
  es: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
  fr: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
  it: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
  ja: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
  ko: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
  zh: {
    title: 'Ready to Get Mogged?',
    description:
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.',
    primaryButton: 'Enter the Arena — Free',
  },
} as const;

describe('landing cta copy', () => {
  it('uses the English image-workflow CTA copy', () => {
    const copy = replaceBrandTokensDeep(enLanding);

    expect(copy.cta).not.toHaveProperty('label');
    expect(copy.cta.title).toBe('Ready to Get Mogged?');
    expect(copy.cta.description).toBe(
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.'
    );
    expect(copy.cta.description).not.toContain('hosted video workspace');
    expect(copy.cta).not.toHaveProperty('items');
    expect(copy.cta.buttons).toHaveLength(1);
    expect(copy.cta.buttons[0]?.title).toBe('Enter the Arena — Free');
    expect(copy.cta.buttons[0]?.url).toBe('/');
    expect(copy.cta.buttons[1]).toBeUndefined();
  });

  it('uses the Chinese image-workflow CTA copy', () => {
    const copy = replaceBrandTokensDeep(zhLanding);

    expect(copy.cta).not.toHaveProperty('label');
    expect(copy.cta.title).toBe('Ready to Get Mogged?');
    expect(copy.cta.description).toBe(
      'Turn on your camera, face the AI, and climb the leaderboard. Free to try — no credit card needed.'
    );
    expect(copy.cta.description).not.toContain('托管视频工作台');
    expect(copy.cta).not.toHaveProperty('items');
    expect(copy.cta.buttons).toHaveLength(1);
    expect(copy.cta.buttons[0]?.title).toBe('Enter the Arena — Free');
    expect(copy.cta.buttons[0]?.url).toBe('/');
    expect(copy.cta.buttons[1]).toBeUndefined();
  });

  it('keeps every live locale on the same image-first CTA route contract', () => {
    for (const [locale, landing] of Object.entries(localizedLandings)) {
      const copy = replaceBrandTokensDeep(landing);
      const expectation =
        localizedCtaExpectations[
          locale as keyof typeof localizedCtaExpectations
        ];

      expect(copy.cta.id, locale).toBe('cta');
      expect(copy.cta, locale).not.toHaveProperty('label');
      expect(copy.cta.title, locale).toBe(expectation.title);
      expect(copy.cta.description, locale).toBe(expectation.description);
      expect(copy.cta.description, locale).not.toContain(
        'hosted video workspace'
      );
      expect(copy.cta.description, locale).not.toContain('托管视频工作台');
      expect(copy.cta, locale).not.toHaveProperty('items');
      expect(copy.cta.buttons, locale).toHaveLength(1);
      expect(copy.cta.buttons[0]?.title, locale).toBe(
        expectation.primaryButton
      );
      expect(copy.cta.buttons[0]?.url, locale).toBe('/');
      expect(copy.cta.buttons[0]?.target, locale).toBe('_self');
      expect(copy.cta.buttons[0]?.icon, locale).toBe('Zap');
      expect(copy.cta.buttons[1], locale).toBeUndefined();
    }
  });
});
