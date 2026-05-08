import { describe, expect, it } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

describe('landing features copy', () => {
  it('uses the new English image-editor positioning copy', () => {
    const copy = replaceBrandTokensDeep(enLanding);

    expect(copy.features.title).toBe(
      'Everything You Need to Win Your Mog Battle'
    );
    expect(copy.features.description).toBe(
      'mogged gives you the full competitive face rating experience. AI scoring, ELO ranking, real-time leaderboard, and tier progression from Molecule to Slayer.'
    );
    expect(Object.prototype.hasOwnProperty.call(copy.features, 'tone')).toBe(
      false
    );
    expect(copy.features.className).toContain('bg-muted/20');
    expect(copy.features.className).not.toContain('bg-foreground');
    expect(copy.features.items).toHaveLength(6);
    expect(copy.features.items[0]?.title).toBe('AI Face Rating');
    expect(copy.features.items[1]?.title).toBe('1v1 Mog Battles');
    expect(copy.features.items[2]?.title).toBe('ELO Ranking System');
    expect(copy.features.items[3]?.title).toBe('Leaderboard Tiers');
    expect(copy.features.items[4]?.title).toBe('Live Matchmaking');
    expect(copy.features.items[5]?.title).toBe('Progress Tracking');
    expect(copy.features.items[0]?.description).toBe(
      'Real-time facial analysis scores symmetry, canthal tilt, jawline, and proportions. Every battle uses the same unbiased AI.'
    );
    expect(copy.features.items[1]?.description).toBe(
      'Face a random opponent in a head-to-head battle. The AI compares both faces and crowns the mogger in seconds.'
    );
    expect(copy.features.items[2]?.description).toBe(
      'Every win earns ELO. Beat higher-ranked opponents for bigger gains. Your rank reflects your true mog power.'
    );
    expect(copy.features.items[3]?.description).toBe(
      'Climb from Molecule → Sub3 → LTN → MTN → HTN → Chadlite → Chad → Slayer. Can you reach the top?'
    );
    expect(copy.features.items[4]?.description).toBe(
      'Get paired in seconds. No waiting in long queues. Jump in, face off, and move on to the next battle.'
    );
    expect(copy.features.items[5]?.description).toBe(
      'Monitor your ELO history, win rate, and battle stats. See exactly how close you are to the next tier.'
    );
    expect(copy.features.description).not.toContain('One public surface');
  });

  it('uses the new Chinese image-editor positioning copy', () => {
    const copy = replaceBrandTokensDeep(zhLanding);

    expect(copy.features.title).toBe(
      'Everything You Need to Win Your Mog Battle'
    );
    expect(copy.features.description).toBe(
      'mogged gives you the full competitive face rating experience. AI scoring, ELO ranking, real-time leaderboard, and tier progression from Molecule to Slayer.'
    );
    expect(Object.prototype.hasOwnProperty.call(copy.features, 'tone')).toBe(
      false
    );
    expect(copy.features.className).toContain('bg-muted/20');
    expect(copy.features.className).not.toContain('bg-foreground');
    expect(copy.features.items).toHaveLength(6);
    expect(copy.features.items[0]?.title).toBe('AI Face Rating');
    expect(copy.features.items[1]?.title).toBe('1v1 Mog Battles');
    expect(copy.features.items[2]?.title).toBe('ELO Ranking System');
    expect(copy.features.items[3]?.title).toBe('Leaderboard Tiers');
    expect(copy.features.items[4]?.title).toBe('Live Matchmaking');
    expect(copy.features.items[5]?.title).toBe('Progress Tracking');
    expect(copy.features.items[0]?.description).toBe(
      'Real-time facial analysis scores symmetry, canthal tilt, jawline, and proportions. Every battle uses the same unbiased AI.'
    );
    expect(copy.features.items[1]?.description).toBe(
      'Face a random opponent in a head-to-head battle. The AI compares both faces and crowns the mogger in seconds.'
    );
    expect(copy.features.items[2]?.description).toBe(
      'Every win earns ELO. Beat higher-ranked opponents for bigger gains. Your rank reflects your true mog power.'
    );
    expect(copy.features.items[3]?.description).toBe(
      'Climb from Molecule → Sub3 → LTN → MTN → HTN → Chadlite → Chad → Slayer. Can you reach the top?'
    );
    expect(copy.features.items[4]?.description).toBe(
      'Get paired in seconds. No waiting in long queues. Jump in, face off, and move on to the next battle.'
    );
    expect(copy.features.items[5]?.description).toBe(
      'Monitor your ELO history, win rate, and battle stats. See exactly how close you are to the next tier.'
    );
    expect(copy.features.description).not.toContain('公开能力');
  });
});
