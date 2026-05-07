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
    title: 'ابدأ الإنشاء باستخدام مولد الصور بالذكاء الاصطناعي المجاني',
    description:
      'جرّبه مجانًا عند توفر رصيد الضيف. لا حاجة لبطاقة ائتمان. أنشئ خلال ثوانٍ باستخدام GPT Image 2 وNano Banana Pro والمزيد من أفضل نماذج الصور بالذكاء الاصطناعي.',
    primaryButton: 'أنشئ صورتي الأولى مجاناً',
  },
  de: {
    title: 'Mit dem kostenlosen KI-Bildgenerator direkt loslegen',
    description:
      'Kostenlos testbar, wenn Gast-Credits verfügbar sind. Keine Kreditkarte. Generiere in Sekunden mit GPT Image 2, Nano Banana Pro und weiteren Top-KI-Bildmodellen.',
    primaryButton: 'Mein erstes Bild kostenlos erstellen',
  },
  en: {
    title: 'Start generating with the free AI image generator',
    description:
      'Free to try when guest credits are available. No credit card. Generate in seconds with GPT Image 2, Nano Banana Pro, and more top AI image models.',
    primaryButton: 'Generate My First Image for Free',
  },
  es: {
    title: 'Empieza a generar con el generador de imágenes IA gratis',
    description:
      'Pruébalo gratis cuando haya créditos de invitado disponibles. Sin tarjeta. Genera en segundos con GPT Image 2, Nano Banana Pro y más modelos top de imágenes con IA.',
    primaryButton: 'Generar mi primera imagen gratis',
  },
  fr: {
    title: 'Commencez avec le générateur d’images IA gratuit',
    description:
      'À essayer gratuitement quand des crédits invité sont disponibles. Sans carte bancaire. Générez en quelques secondes avec GPT Image 2, Nano Banana Pro et d’autres grands modèles d’images IA.',
    primaryButton: 'Générer ma première image gratuitement',
  },
  it: {
    title: 'Inizia a generare con il generatore di immagini AI gratuito',
    description:
      'Provalo gratis quando sono disponibili crediti ospite. Nessuna carta di credito. Genera in pochi secondi con GPT Image 2, Nano Banana Pro e altri top modelli immagini AI.',
    primaryButton: 'Genera la mia prima immagine gratis',
  },
  ja: {
    title: '無料のAI画像生成ツールで生成を始める',
    description:
      'ゲストクレジットが使えるときは無料で試せます。クレジットカード不要。GPT Image 2、Nano Banana Pro など主要なAI画像モデルで数秒生成。',
    primaryButton: '最初の1枚を無料で生成',
  },
  ko: {
    title: '무료 AI 이미지 생성기로 바로 생성 시작',
    description:
      '게스트 크레딧이 있을 때 무료로 체험할 수 있습니다. 카드 필요 없음. GPT Image 2, Nano Banana Pro 등 주요 AI 이미지 모델로 몇 초 안에 생성하세요.',
    primaryButton: '첫 이미지를 무료로 생성',
  },
  zh: {
    title: '开始用免费 AI 图像生成器生成图片',
    description:
      '访客额度可用时可免费试用，无需信用卡。用 GPT Image 2、Nano Banana Pro 等热门 AI 图像模型，几秒内开始生成。',
    primaryButton: '免费生成我的第一张图',
  },
} as const;

describe('landing cta copy', () => {
  it('uses the English image-workflow CTA copy', () => {
    const copy = replaceBrandTokensDeep(enLanding);

    expect(copy.cta).not.toHaveProperty('label');
    expect(copy.cta.title).toBe(
      'Start generating with the free AI image generator'
    );
    expect(copy.cta.description).toBe(
      'Free to try when guest credits are available. No credit card. Generate in seconds with GPT Image 2, Nano Banana Pro, and more top AI image models.'
    );
    expect(copy.cta.description).not.toContain('hosted video workspace');
    expect(copy.cta).not.toHaveProperty('items');
    expect(copy.cta.buttons).toHaveLength(1);
    expect(copy.cta.buttons[0]?.title).toBe('Generate My First Image for Free');
    expect(copy.cta.buttons[0]?.url).toBe('/ai-image-generator');
    expect(copy.cta.buttons[1]).toBeUndefined();
  });

  it('uses the Chinese image-workflow CTA copy', () => {
    const copy = replaceBrandTokensDeep(zhLanding);

    expect(copy.cta).not.toHaveProperty('label');
    expect(copy.cta.title).toBe('开始用免费 AI 图像生成器生成图片');
    expect(copy.cta.description).toBe(
      '访客额度可用时可免费试用，无需信用卡。用 GPT Image 2、Nano Banana Pro 等热门 AI 图像模型，几秒内开始生成。'
    );
    expect(copy.cta.description).not.toContain('托管视频工作台');
    expect(copy.cta).not.toHaveProperty('items');
    expect(copy.cta.buttons).toHaveLength(1);
    expect(copy.cta.buttons[0]?.title).toBe('免费生成我的第一张图');
    expect(copy.cta.buttons[0]?.url).toBe('/ai-image-generator');
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
      expect(copy.cta.buttons[0]?.url, locale).toBe('/ai-image-generator');
      expect(copy.cta.buttons[0]?.target, locale).toBe('_self');
      expect(copy.cta.buttons[0]?.icon, locale).toBe('Zap');
      expect(copy.cta.buttons[1], locale).toBeUndefined();
    }
  });
});
