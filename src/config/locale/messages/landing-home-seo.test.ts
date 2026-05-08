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
      "mogged | 1v1 Face Rating Battles - Get Mogged or Get Moggin'"
    );
    expect(copy.metadata.description).toBe(
      `mogged is the ultimate 1v1 face rating arena. Jump into live mog battles, get AI-rated on facial symmetry and biometrics, climb the leaderboard from Molecule to Slayer.`
    );
    expect(copy.metadata.description).not.toContain('text-to-image');
    expect(copy.metadata.description).not.toContain('image-to-image');
    expect(copy.hero.title).toBe(
      'Mogged — The Ultimate 1v1 Face Rating Arena'
    );
    expect(copy.hero.description).toBe(
      'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?'
    );
    expect(copy.hero.tip).toBe(
      `Use mogged on ${appDomain} to jump into 1v1 face rating battles, earn ELO, and climb the competitive leaderboard.`
    );
    expect(`${copy.hero.description} ${copy.hero.tip}`).not.toMatch(
      /killer|world's #1/i
    );
    expect(copy.metadata.description).not.toMatch(/video generator/i);
    expect(
      copy.metadata.keywords.split(',').map((keyword) => keyword.trim())[0]
    ).toBe('mogged');
    expect(copy.metadata.keywords).toContain('mog battle');
    expect(copy.metadata.keywords).toContain('face rating');
    expect(
      copy.header.nav.items.map((item) => [item.title, item.url || ''])
    ).toEqual([
      ['Home', '/'],
      ['Leaderboard', '/leaderboard'],
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
      "mogged | 1v1 Face Rating Battles - Get Mogged or Get Moggin'"
    );
    expect(copy.metadata.description).toBe(
      `mogged is the ultimate 1v1 face rating arena. Jump into live mog battles, get AI-rated on facial symmetry and biometrics, climb the leaderboard from Molecule to Slayer.`
    );
    expect(copy.metadata.description).not.toContain(appDomain);
    expect(copy.metadata.description).not.toContain('文生图');
    expect(copy.metadata.description).not.toContain('图生图');
    expect(copy.hero.title).toBe(
      'Mogged — The Ultimate 1v1 Face Rating Arena'
    );
    expect(copy.hero.description).toBe(
      'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?'
    );
    expect(copy.hero.tip).toBe(
      `Use mogged on ${appDomain} to jump into 1v1 face rating battles, earn ELO, and climb the competitive leaderboard.`
    );
    expect(`${copy.hero.description} ${copy.hero.tip}`).not.toMatch(
      /杀手|排名第一/
    );
    expect(copy.metadata.description).not.toMatch(/视频生成器/);
    expect(
      copy.metadata.keywords.split(',').map((keyword) => keyword.trim())[0]
    ).toBe('mogged');
    expect(copy.metadata.keywords).toContain('mog battle');
    expect(copy.metadata.keywords).toContain('face rating');
    expect(
      copy.header.nav.items.map((item) => [item.title, item.url || ''])
    ).toEqual([
      ['Home', '/'],
      ['Leaderboard', '/leaderboard'],
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
});
