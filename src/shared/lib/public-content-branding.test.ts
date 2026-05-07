import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { publicSiteLocales } from '@/config/locale';

const PUBLIC_PAGE_SLUGS = [
  'mission',
  'privacy-policy',
  'terms-of-service',
  'refund-policy',
  'acceptable-use-policy',
  'content-moderation-policy',
  'ai-wrapper-disclaimer',
] as const;
const MISSION_WORKFLOW_TERMS = [
  'text-to-image',
  'image-to-image',
  'text-to-video',
  'image-to-video',
  'reference-to-video',
] as const;
const MISSION_ACCESS_SIGNALS: Record<string, RegExp[]> = {
  en: [
    /ordinary people/i,
    /more model choice/i,
    /more chances to generate useful images/i,
    /more free ways/i,
  ],
  zh: [/普通人/, /更多模型选择/, /更多生成好图的机会/, /更多免费的方式/],
  de: [
    /normale Menschen/i,
    /mehr Modellauswahl/i,
    /mehr Chancen, gute Bilder zu erzeugen/i,
    /mehr kostenlose Wege/i,
  ],
  fr: [
    /personnes ordinaires/i,
    /plus de choix de modèles/i,
    /plus de chances de générer de bonnes images/i,
    /plus de moyens gratuits/i,
  ],
  es: [
    /personas comunes/i,
    /más opciones de modelos/i,
    /más oportunidades de generar buenas imágenes/i,
    /más formas gratis/i,
  ],
  ja: [
    /ふつうの人/,
    /モデルの選択肢を増やし/,
    /良い画像を生み出す機会を増やし/,
    /無料で使える手段/,
  ],
  it: [
    /persone comuni/i,
    /più scelta di modelli/i,
    /più occasioni per generare buone immagini/i,
    /più modi gratuiti/i,
  ],
  ko: [
    /보통 사람들/,
    /더 많은 모델 선택지/,
    /좋은 이미지를 만들 기회/,
    /더 많은 무료 방법/,
  ],
  ar: [
    /الناس العاديون/,
    /خيارات نماذج أكثر/,
    /فرص أكثر لتوليد صور جيدة/,
    /طرق مجانية أكثر/,
  ],
};

function getPublicPageFiles() {
  return publicSiteLocales.flatMap((locale) =>
    PUBLIC_PAGE_SLUGS.map((slug) =>
      locale === 'en' ? `${slug}.mdx` : `${slug}.${locale}.mdx`
    )
  );
}

describe('public content branding', () => {
  it('keeps every live public trust page on the current mogged.games domain', () => {
    for (const file of getPublicPageFiles()) {
      const filePath = join(process.cwd(), 'content/pages', file);

      expect(existsSync(filePath), file).toBe(true);

      const content = readFileSync(filePath, 'utf8');
      const titleLine =
        content.split('\n').find((line) => line.startsWith('title: ')) || '';
      const titleValue = titleLine.match(/title: ['"](.+?)['"]/)?.[1] || '';

      expect(content).toContain('mogged');
      expect(content).toContain('mogged.games');
      expect(content).not.toContain('uni1ai.pro');
      expect(content).not.toContain('lumalabs.ai');
      expect(content).not.toContain('LumaLabsAI');
      expect(content).not.toContain('blog posts');
      expect(content).not.toContain('博客文章');

      if (!file.includes('.zh.')) {
        expect(titleValue.length).toBeLessThanOrEqual(65);
      }
    }
  });

  it('keeps every mission page aligned with the two public generator entries', () => {
    for (const locale of publicSiteLocales) {
      const file = locale === 'en' ? 'mission.mdx' : `mission.${locale}.mdx`;
      const filePath = join(process.cwd(), 'content/pages', file);
      const content = readFileSync(filePath, 'utf8');

      expect(content, file).toContain('/ai-image-generator');
      expect(content, file).toContain('/ai-video-generator');

      for (const workflow of MISSION_WORKFLOW_TERMS) {
        expect(content, `${file}:${workflow}`).toContain(workflow);
      }
    }
  });

  it('keeps every mission page centered on broader model access and free entry points', () => {
    for (const locale of publicSiteLocales) {
      const file = locale === 'en' ? 'mission.mdx' : `mission.${locale}.mdx`;
      const content = readFileSync(
        join(process.cwd(), 'content/pages', file),
        'utf8'
      );

      for (const signal of MISSION_ACCESS_SIGNALS[locale]) {
        expect(content, `${file}:${signal}`).toMatch(signal);
      }
    }
  });

  it('keeps acceptable-use scope broad enough for both hosted generator surfaces', () => {
    const enPolicy = readFileSync(
      join(process.cwd(), 'content/pages/acceptable-use-policy.mdx'),
      'utf8'
    );
    const zhPolicy = readFileSync(
      join(process.cwd(), 'content/pages/acceptable-use-policy.zh.mdx'),
      'utf8'
    );

    expect(enPolicy).toContain('hosted image and video workflows');
    expect(enPolicy).not.toContain('hosted video workflows');
    expect(zhPolicy).toContain('托管图片和视频工作流');
    expect(zhPolicy).not.toContain('托管视频工作流');
  });
});
