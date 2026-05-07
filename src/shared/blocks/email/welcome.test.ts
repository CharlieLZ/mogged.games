import { describe, expect, it } from 'vitest';

import { getInitialCreditsAmount } from '@/shared/lib/brand';

import {
  getWelcomeEmailHtml,
  getWelcomeEmailSubject,
  getWelcomeEmailText,
} from './welcome';

describe('welcome email copy', () => {
  it('keeps signup bonus copy aligned with the configured initial credits amount', () => {
    const initialCreditsAmount = getInitialCreditsAmount();

    expect(getWelcomeEmailSubject('Casey')).toContain(
      `${initialCreditsAmount} free credits are ready`
    );
    expect(getWelcomeEmailHtml('Casey')).toContain(
      `Your account already includes ${initialCreditsAmount} free credits`
    );
    expect(getWelcomeEmailHtml('Casey')).toContain(
      `${initialCreditsAmount} credits are ready now.`
    );
    expect(getWelcomeEmailHtml('Casey')).toContain(
      'mogged runs, browser tools, and task history live in the same flow.'
    );
    expect(getWelcomeEmailHtml('Casey')).not.toContain('Seedance');
    expect(getWelcomeEmailText('Casey')).toContain(
      `Your account already includes ${initialCreditsAmount} free credits`
    );
    expect(getWelcomeEmailText('Casey')).not.toContain('Seedance');
  });

  it('renders localized workflow CTAs for non-default locales', () => {
    const html = getWelcomeEmailHtml('Casey', {
      locale: 'zh-CN',
      recommendedWorkflow: 'image-to-video',
    });

    expect(html).toContain('<html lang="zh-CN" dir="ltr">');
    expect(html).toContain('选择你的第一个工作流');
    expect(html).toContain('推荐给你');
    expect(html).toContain(
      'https://mogged.games/zh/ai-video-generator?mode=text-to-video'
    );
    expect(html).toContain(
      'https://mogged.games/zh/ai-video-generator?mode=image-to-video'
    );
    expect(html).toContain(
      'https://mogged.games/zh/ai-video-generator?mode=reference-to-video'
    );
  });

  it('uses workflow-specific activation copy in the text version', () => {
    const text = getWelcomeEmailText('Casey', {
      recommendedWorkflow: 'reference-to-video',
    });

    expect(text).toContain('Pick your first workflow');
    expect(text).toContain('Recommended for you: reference-to-video');
    expect(text).toContain(
      'https://mogged.games/ai-video-generator?mode=reference-to-video'
    );
    expect(text).toContain(
      'https://mogged.games/ai-video-generator?mode=image-to-video'
    );
    expect(text).toContain(
      'https://mogged.games/ai-video-generator?mode=text-to-video'
    );
  });
});
