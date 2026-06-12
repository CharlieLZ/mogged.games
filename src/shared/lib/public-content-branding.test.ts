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
const MISSION_BATTLE_SIGNALS = [
  /Camera Check/i,
  /Face Scan/i,
  /Mog Battle/i,
  /ELO/i,
  /leaderboard/i,
  /1v1/i,
] as const;

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

  it('keeps every mission page aligned with the mog battle arena', () => {
    for (const locale of publicSiteLocales) {
      const file = locale === 'en' ? 'mission.mdx' : `mission.${locale}.mdx`;
      const filePath = join(process.cwd(), 'content/pages', file);
      const content = readFileSync(filePath, 'utf8');

      expect(content, file).toContain('mogged');
      expect(content, file).toContain('mogged.games');

      if (locale === 'en') {
        for (const signal of MISSION_BATTLE_SIGNALS) {
          expect(content, `${file}:${signal}`).toMatch(signal);
        }
      }

      if (locale === 'zh') {
        expect(content, file).toContain('1v1 颜值评分');
        expect(content, file).toContain('ELO 排行榜');
        expect(content, file).not.toMatch(
          /AI 图片编辑产品方向|文生图|图生图|reference-to-video|免费浏览器游戏工具/
        );
      }
    }
  });

  it('has real content pages for leaderboard routes exposed in navigation and metadata', () => {
    for (const file of ['leaderboard.mdx', 'leaderboard.zh.mdx'] as const) {
      const filePath = join(process.cwd(), 'content/pages', file);

      expect(existsSync(filePath), file).toBe(true);

      const content = readFileSync(filePath, 'utf8');
      expect(content, file).toContain('mogged');
      expect(content, file).toContain('mogged.games');
      expect(content, file).toMatch(/leaderboard|排行榜/i);
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

    expect(enPolicy).toContain('face rating game battles');
    expect(enPolicy).toContain('mog comparison features');
    expect(zhPolicy).toContain('托管图片和视频对战');
    expect(zhPolicy).toContain('对战对战');
  });
});
