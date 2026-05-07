import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { getAppDomain, replaceBrandTokensDeep } from '@/shared/lib/brand';
import { replaceImageEditorAiMediaTokensDeep } from '@/shared/lib/imageeditorai-media';

describe('landing homepage seo copy', () => {
  it('keeps the English homepage centered on the mogged keyword owner', () => {
    const appDomain = getAppDomain();
    const rawSerialized = JSON.stringify(enLanding);
    const copy = replaceImageEditorAiMediaTokensDeep(
      replaceBrandTokensDeep(enLanding)
    );
    const serialized = JSON.stringify(copy);

    expect(copy.metadata.title).toContain('mogged');
    expect(copy.metadata.title).toBe(
      'mogged | Free AI Image Editor & Photo Editor'
    );
    expect(copy.metadata.description).toBe(
      `mogged is a free online image editor for AI image editing, photo editing, text-to-image, image-to-image, and browser image tools on ${appDomain}.`
    );
    expect(copy.metadata.description).toContain(appDomain);
    expect(copy.metadata.description).toContain('text-to-image');
    expect(copy.metadata.description).toContain('image-to-image');
    expect(copy.hero.title).toBe('Free AI Image Editor Online');
    expect(copy.hero.description).toBe(
      'Edit images, refine photos, create text-to-image concepts, and run image-to-image changes with mogged in one online image editor.'
    );
    expect(copy.hero.tip).toBe(
      `Use mogged on ${appDomain} when you need a free online image editor, AI photo editor, picture cleanup workflow, or text-to-image ideation without extra setup.`
    );
    expect(`${copy.hero.description} ${copy.hero.tip}`).not.toMatch(
      /killer|world's #1|rank/i
    );
    expect(copy.metadata.description).not.toMatch(/video generator/i);
    expect(
      copy.metadata.keywords.split(',').map((keyword) => keyword.trim())[0]
    ).toBe('image');
    expect(copy.metadata.keywords).toContain('ai image editor');
    expect(copy.metadata.keywords).toContain('image editor ai');
    expect(
      copy.header.nav.items.map((item) => [item.title, item.url || ''])
    ).toEqual([
      ['AI Image Editor', '/'],
      ['AI Image Generator', '/ai-image-generator'],
      ['Pricing', '/pricing'],
    ]);
    expect(rawSerialized).not.toContain('https://mogged.games/');
    expect(rawSerialized).toContain('imageeditorai-media:');
    expect(rawSerialized).not.toContain('/imgs/');
    expect(serialized).not.toContain('imageeditorai-media:');
    expect(copy.footer.disclaimer).toContain(
      `independent product operated on ${appDomain}`
    );
    expect(copy.footer.agreement.items.map((item) => item.url)).toEqual([
      '/privacy-policy',
      '/terms-of-service',
      '/refund-policy',
      '/acceptable-use-policy',
      '/content-moderation-policy',
      '/ai-wrapper-disclaimer',
    ]);
  });

  it('keeps the Chinese homepage centered on mogged with localized image-first copy', () => {
    const appDomain = getAppDomain();
    const rawSerialized = JSON.stringify(zhLanding);
    const copy = replaceImageEditorAiMediaTokensDeep(
      replaceBrandTokensDeep(zhLanding)
    );
    const serialized = JSON.stringify(copy);

    expect(copy.metadata.title).toContain('mogged');
    expect(copy.metadata.title).toBe(
      'mogged｜免费在线 AI 图片编辑器与修图工具'
    );
    expect(copy.metadata.description).toBe(
      `mogged 是 ${appDomain} 上的免费在线 AI 图片编辑器，支持 AI 图片编辑、文生图、图生图、AI 修图和浏览器端图片工具。`
    );
    expect(copy.metadata.description).toContain(appDomain);
    expect(copy.metadata.description).toContain('文生图');
    expect(copy.metadata.description).toContain('图生图');
    expect(copy.hero.title).toBe('免费在线 AI 图片编辑器');
    expect(copy.hero.description).toBe(
      '在一个在线图片编辑器里完成 AI 图片编辑、AI 修图、文生图和图生图，这就是 mogged。'
    );
    expect(copy.hero.tip).toBe(
      `在 ${appDomain} 使用 mogged：想要免费在线图片编辑、AI 修图、图生图细修，或从文本直接生成新图片，都可以在同一个工作台里完成。`
    );
    expect(`${copy.hero.description} ${copy.hero.tip}`).not.toMatch(
      /杀手|排名第一/
    );
    expect(copy.metadata.description).not.toMatch(/视频生成器/);
    expect(
      copy.metadata.keywords.split(',').map((keyword) => keyword.trim())[0]
    ).toBe('image');
    expect(copy.metadata.keywords).toContain('ai image editor');
    expect(copy.metadata.keywords).toContain('AI 图片编辑器');
    expect(
      copy.header.nav.items.map((item) => [item.title, item.url || ''])
    ).toEqual([
      ['AI Image Editor', '/'],
      ['AI Image Generator', '/ai-image-generator'],
      ['定价', '/pricing'],
    ]);
    expect(rawSerialized).not.toContain('https://mogged.games/');
    expect(rawSerialized).toContain('imageeditorai-media:');
    expect(rawSerialized).not.toContain('/imgs/');
    expect(serialized).not.toContain('imageeditorai-media:');
    expect(copy.footer.disclaimer).toContain(`${appDomain} 上的独立产品`);
    expect(copy.footer.agreement.items.map((item) => item.url)).toEqual([
      '/privacy-policy',
      '/terms-of-service',
      '/refund-policy',
      '/acceptable-use-policy',
      '/content-moderation-policy',
      '/ai-wrapper-disclaimer',
    ]);
  });
});
