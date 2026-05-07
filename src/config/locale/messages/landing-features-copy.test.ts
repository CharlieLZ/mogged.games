import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

describe('landing features copy', () => {
  it('uses the new English image-editor positioning copy', () => {
    const copy = replaceBrandTokensDeep(enLanding);

    expect(copy.features.title).toBe(
      'A free online image editor built for fast, usable image changes'
    );
    expect(copy.features.description).toBe(
      'mogged keeps the homepage centered on the image editor jobs people search for most: AI image editing, image-to-image changes, picture cleanup, fast variations, and browser image tools.'
    );
    expect(Object.prototype.hasOwnProperty.call(copy.features, 'tone')).toBe(
      false
    );
    expect(copy.features.className).toContain('bg-muted/20');
    expect(copy.features.className).not.toContain('bg-foreground');
    expect(copy.features.items).toHaveLength(6);
    expect(copy.features.items[0]?.title).toBe('AI Image Editor');
    expect(copy.features.items[1]?.title).toBe('Image to Image Editor');
    expect(copy.features.items[2]?.title).toBe('Text to Image Creator');
    expect(copy.features.items[3]?.title).toBe('Photo Cleanup');
    expect(copy.features.items[4]?.title).toBe('Browser Image Tools');
    expect(copy.features.items[5]?.title).toBe('Visual Consistency');
    expect(copy.features.items[0]?.description).toBe(
      'Guide lighting, layout, texture, and style with short prompts inside a practical online image editor.'
    );
    expect(copy.features.items[1]?.description).toBe(
      'Upload a source image and push targeted image changes without starting over.'
    );
    expect(copy.features.items[2]?.description).toBe(
      'Start fresh when you need a new image concept, scene, or product visual.'
    );
    expect(copy.features.items[3]?.description).toBe(
      'Refine photo backgrounds, lighting, and picture details before you commit to a final image.'
    );
    expect(copy.features.items[4]?.description).toBe(
      'Handle image compression, conversion, and quick picture cleanup locally before or after hosted generation.'
    );
    expect(copy.features.items[5]?.description).toBe(
      'Keep subject cues, layout intent, and campaign style closer together.'
    );
    expect(copy.features.description).not.toContain('One public surface');
  });

  it('uses the new Chinese image-editor positioning copy', () => {
    const copy = replaceBrandTokensDeep(zhLanding);

    expect(copy.features.title).toContain('AI 图片编辑器');
    expect(copy.features.description).toBe(
      'mogged 把首页核心放在大家最常搜的图片编辑任务上：AI 图片编辑、图生图细修、图片修图、快速出变体，以及浏览器端图片工具。'
    );
    expect(Object.prototype.hasOwnProperty.call(copy.features, 'tone')).toBe(
      false
    );
    expect(copy.features.className).toContain('bg-muted/20');
    expect(copy.features.className).not.toContain('bg-foreground');
    expect(copy.features.items).toHaveLength(6);
    expect(copy.features.items[0]?.title).toContain('AI 图片编辑器');
    expect(copy.features.items[1]?.title).toContain('图生图编辑');
    expect(copy.features.items[2]?.title).toContain('文生图创作');
    expect(copy.features.items[3]?.title).toContain('图片修图');
    expect(copy.features.items[4]?.title).toContain('浏览器图片工具');
    expect(copy.features.items[5]?.title).toContain('视觉一致性');
    expect(copy.features.items[0]?.description).toBe(
      '用短提示词就能在同一个在线图片编辑器里推动光线、构图、材质和风格变化。'
    );
    expect(copy.features.items[1]?.description).toBe(
      '上传原图后做定向图片修改，不用每次都从零重来。'
    );
    expect(copy.features.items[2]?.description).toBe(
      '需要全新概念图、场景图或产品图时，直接从文本起稿生成新图片。'
    );
    expect(copy.features.items[3]?.description).toBe(
      '先清理背景、修正光线和图片细节，再决定最后要保留哪一版。'
    );
    expect(copy.features.items[4]?.description).toBe(
      '只想轻量压缩、转格式或清理图片文件时，直接本地处理。'
    );
    expect(copy.features.items[5]?.description).toBe(
      '尽量把主体特征、版式意图和 campaign 风格拉得更稳。'
    );
    expect(copy.features.description).not.toContain('公开能力');
  });
});
