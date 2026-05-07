import { describe, expect, it } from 'vitest';

import { getAppUrl, getSupportEmail } from '@/shared/lib/brand';

import {
  DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS,
  getActivationSurveyEmailHtml,
  getActivationSurveyEmailSubject,
  getActivationSurveyEmailText,
} from './activation-survey';

describe('activation survey email copy', () => {
  it('keeps the friendly survey reward copy aligned with the configured credits', () => {
    expect(getActivationSurveyEmailSubject('Casey')).toContain(
      'what are you trying to make'
    );
    expect(getActivationSurveyEmailHtml('Casey')).toContain(
      `we will add ${DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS} credits to your account`
    );
    expect(getActivationSurveyEmailHtml('Casey')).toContain(
      'Messy answers count. We are not grading homework.'
    );
    expect(getActivationSurveyEmailText('Casey')).toContain(
      'Reply and get 100 credits'
    );
  });

  it('renders localized zh copy with a reply mailto and workspace link', () => {
    const html = getActivationSurveyEmailHtml('Casey', {
      locale: 'zh-CN',
    });

    expect(html).toContain('<html lang="zh-CN" dir="ltr">');
    expect(html).toContain('我们先别瞎猜你要做什么');
    expect(html).toContain('回信领 100 积分');
    expect(html).toContain(`mailto:${getSupportEmail()}?`);
    expect(html).toContain(`${getAppUrl()}/zh/ai-video-generator`);
  });

  it('includes the survey questions in the text version', () => {
    const text = getActivationSurveyEmailText('Casey');

    expect(text).toContain('1. What do you want to create?');
    expect(text).toContain('4. What matters most right now?');
    expect(text).toContain(`${getAppUrl()}/ai-video-generator`);
  });
});
