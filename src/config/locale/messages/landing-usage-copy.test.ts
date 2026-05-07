import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

describe('landing usage copy', () => {
  it('uses the new English four-step image editing copy', () => {
    const copy = replaceBrandTokensDeep(enLanding);

    expect(copy.usage.title).toBe(
      'How to Use the mogged Online Image Editor'
    );
    expect(copy.usage.description).toContain(
      'Edit your first image in four clear steps'
    );
    expect(copy.usage.className).toContain('bg-muted/20');
    expect(copy.usage.className).not.toContain('bg-foreground');
    expect(copy.usage.items).toHaveLength(4);
    expect(copy.usage.items[0]?.title).toBe('Start with a Prompt or Image');
    expect(copy.usage.items[1]?.title).toBe('Choose the Edit Direction');
    expect(copy.usage.items[2]?.title).toBe('Generate with mogged');
    expect(copy.usage.items[3]?.title).toBe('Download and Reuse');
  });

  it('uses the new Chinese four-step image editing copy', () => {
    const copy = replaceBrandTokensDeep(zhLanding);

    expect(copy.usage.title).toBe('如何使用 mogged 在线图片编辑器');
    expect(copy.usage.description).toContain('四个清晰步骤');
    expect(copy.usage.className).toContain('bg-muted/20');
    expect(copy.usage.className).not.toContain('bg-foreground');
    expect(copy.usage.items).toHaveLength(4);
    expect(copy.usage.items[0]?.title).toBe('输入提示词或上传原图');
    expect(copy.usage.items[1]?.title).toBe('选择编辑方向');
    expect(copy.usage.items[2]?.title).toBe('使用 mogged 生成');
    expect(copy.usage.items[3]?.title).toBe('下载并继续使用');
  });
});
