import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { publicSiteLocales } from '@/config/locale';

import { parseContentFrontmatter } from './content-frontmatter';

const pagesDir = join(process.cwd(), 'content/pages');
const publicPageSlugs = [
  'mission',
  'privacy-policy',
  'terms-of-service',
  'refund-policy',
  'acceptable-use-policy',
  'content-moderation-policy',
  'ai-wrapper-disclaimer',
] as const;

function getPublicPages() {
  return publicSiteLocales.flatMap((locale) =>
    publicPageSlugs.map((slug) =>
      locale === 'en' ? `${slug}.mdx` : `${slug}.${locale}.mdx`
    )
  );
}

describe('public page seo frontmatter', () => {
  it('keeps every live public page frontmatter aligned with the mogged brand', () => {
    for (const file of getPublicPages()) {
      const source = readFileSync(join(pagesDir, file), 'utf8');
      const frontmatter = parseContentFrontmatter(source);
      const serialized = JSON.stringify(frontmatter);
      const searchTitle = frontmatter.seo_title || frontmatter.title || '';

      expect(searchTitle).toContain('mogged');
      expect(frontmatter.description).toContain('mogged.games');
      expect(frontmatter.keywords).toContain('mogged.games');
      expect(serialized).not.toMatch(/killer|world's #1|排名第一|杀手/i);
    }
  });

  it('keeps mission copy explicitly search-oriented in every live public locale', () => {
    const expectedMissionSignals = {
      en: ['Mission', /1v1 mog battles, face rating, and competitive looksmaxxing/i],
      zh: ['使命', /AI 图片编辑产品方向/],
      de: ['Mission', /KI-Bildeditor-Produktstrategie/i],
      fr: ['Mission', /orientation produit d'éditeur d'image IA/i],
      es: ['Misión', /dirección de producto del editor de imagen IA/i],
      ja: ['ミッション', /AI画像編集プロダクト方針/],
    } as const;

    const missionLocales = publicSiteLocales.filter(
      (locale): locale is keyof typeof expectedMissionSignals =>
        locale in expectedMissionSignals
    );

    for (const locale of missionLocales) {
      const missionFile =
        locale === 'en' ? 'mission.mdx' : `mission.${locale}.mdx`;
      const mission = parseContentFrontmatter(
        readFileSync(join(pagesDir, missionFile), 'utf8')
      );
      const [expectedTitle, expectedDescription] =
        expectedMissionSignals[locale];

      expect(mission.title).toContain('mogged');
      expect(mission.title).toContain(expectedTitle);
      expect(mission.seo_title || mission.title).toContain(expectedTitle);
      expect(mission.description).toMatch(expectedDescription);
    }
  });
});
