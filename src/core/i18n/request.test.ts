import { beforeEach, describe, expect, it, vi } from 'vitest';

import requestConfig, {
  getLocaleMessagePathsForPathname,
  loadMessages,
} from './request';

const mocks = vi.hoisted(() => ({
  getPublicConfigs: vi.fn(),
  getPathname: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getRequestConfig: (factory: unknown) => factory,
}));

vi.mock('@/shared/lib/browser', () => ({
  getPathname: mocks.getPathname,
}));

vi.mock('@/shared/models/config', () => ({
  getPublicConfigs: mocks.getPublicConfigs,
}));

describe('loadMessages', () => {
  beforeEach(() => {
    mocks.getPublicConfigs.mockReset();
    mocks.getPublicConfigs.mockResolvedValue({});
    mocks.getPathname.mockReset();
    mocks.getPathname.mockResolvedValue('/ai-video-generator');
  });

  it('applies public runtime config overrides to locale message brand tokens', async () => {
    mocks.getPublicConfigs.mockResolvedValue({
      initial_credits_amount: '45',
    });

    const pricingMessages = (await loadMessages('pricing', 'en')) as {
      pricing: {
        description: string;
      };
    };

    expect(pricingMessages.pricing.description).toContain('45 credits');
  });

  it('keeps public routes scoped to public-facing message namespaces', async () => {
    expect(getLocaleMessagePathsForPathname('/')).toEqual(
      expect.arrayContaining(['common', 'landing', 'ai/image'])
    );
    expect(getLocaleMessagePathsForPathname('/')).not.toEqual(
      expect.arrayContaining([
        'pricing',
        'admin/settings',
        'activity/aitasks',
        'ai/video',
      ])
    );
    expect(getLocaleMessagePathsForPathname('/ai-video-generator')).toEqual(
      expect.arrayContaining(['common', 'landing'])
    );
    expect(getLocaleMessagePathsForPathname('/ai-video-generator')).not.toEqual(
      expect.arrayContaining([
        'pricing',
        'admin/settings',
        'activity/aitasks',
        'ai/image',
        'ai/video',
      ])
    );
    expect(getLocaleMessagePathsForPathname('/ai-image-generator')).toEqual(
      expect.arrayContaining(['common', 'landing'])
    );
    expect(getLocaleMessagePathsForPathname('/ai-image-generator')).not.toEqual(
      expect.arrayContaining([
        'pricing',
        'admin/settings',
        'activity/aitasks',
        'ai/video',
        'ai/image',
      ])
    );
    expect(getLocaleMessagePathsForPathname('/pricing')).toEqual(
      expect.arrayContaining(['common', 'landing', 'pricing'])
    );
    expect(getLocaleMessagePathsForPathname('/pricing')).not.toEqual(
      expect.arrayContaining(['ai/video'])
    );
    expect(getLocaleMessagePathsForPathname('/certificate')).toContain(
      'settings/sidebar'
    );
  });

  it('does not serialize admin or seedance branding into public route messages', async () => {
    const config = await requestConfig({
      requestLocale: Promise.resolve('en'),
    });

    expect(config.messages).not.toHaveProperty('admin');
    expect(config.messages).not.toHaveProperty('activity');
    expect(config.messages).not.toHaveProperty('settings.apikeys');
    expect(JSON.stringify(config.messages)).not.toMatch(/seedance/i);
  });

  it('keeps admin namespaces available on admin routes', async () => {
    mocks.getPathname.mockResolvedValue('/admin/settings');

    const config = await requestConfig({
      requestLocale: Promise.resolve('en'),
    });

    expect(config.messages).toHaveProperty('admin.settings');
    expect(config.messages).toHaveProperty('landing.header');
  });

  it('keeps shared settings credits messages available on admin routes', () => {
    expect(getLocaleMessagePathsForPathname('/admin/users')).toContain(
      'settings/credits'
    );
  });

  it('treats forgot-password and reset-password routes as auth pages', () => {
    expect(getLocaleMessagePathsForPathname('/forgot-password')).toEqual(
      expect.arrayContaining(['common'])
    );
    expect(getLocaleMessagePathsForPathname('/forgot-password')).not.toEqual(
      expect.arrayContaining(['landing'])
    );
    expect(
      getLocaleMessagePathsForPathname('/reset-password/example-token')
    ).toEqual(expect.arrayContaining(['common']));
    expect(
      getLocaleMessagePathsForPathname('/reset-password/example-token')
    ).not.toEqual(expect.arrayContaining(['landing']));
  });

  it('keeps shared header widget messages available on public routes', async () => {
    mocks.getPathname.mockResolvedValue('/');

    const config = await requestConfig({
      requestLocale: Promise.resolve('en'),
    });

    expect(config.messages).toHaveProperty('common.daily_claim.title');
    expect(config.messages).toHaveProperty('common.notifications.bell');
    expect(config.messages).toHaveProperty(
      'ai.image.generator.form.panel_title'
    );
    expect(config.messages).not.toHaveProperty(
      'ai.video.generator.form.panel_title'
    );
  });

  it('keeps activity notifications messages available on notification routes', async () => {
    mocks.getPathname.mockResolvedValue('/activity/notifications');

    const config = await requestConfig({
      requestLocale: Promise.resolve('en'),
    });

    expect(config.messages).toHaveProperty('activity.sidebar.title');
    expect(config.messages).toHaveProperty('activity.notifications.title');
    expect(config.messages).toHaveProperty(
      'activity.notifications.items.ai_task_completed.title'
    );
  });

  it('keeps public core namespaces available on nested ai-video-generator routes', async () => {
    mocks.getPathname.mockResolvedValue(
      '/ai-video-generator/reference-to-video?mode=reference-to-video'
    );

    const config = await requestConfig({
      requestLocale: Promise.resolve('en'),
    });

    expect(config.messages).toHaveProperty('common.daily_claim.title');
    expect(config.messages).toHaveProperty('landing.header');
    expect(config.messages).not.toHaveProperty(
      'ai.video.generator.form.panel_title'
    );
    expect(config.messages).not.toHaveProperty(
      'ai.video.generator.sample_preview_title'
    );
  });

  it('keeps public core namespaces available on ai-image-generator routes', async () => {
    mocks.getPathname.mockResolvedValue(
      '/ai-image-generator?mode=image-to-image'
    );

    const config = await requestConfig({
      requestLocale: Promise.resolve('en'),
    });

    expect(config.messages).toHaveProperty('common.daily_claim.title');
    expect(config.messages).toHaveProperty('landing.header');
    expect(config.messages).not.toHaveProperty(
      'ai.image.generator.form.panel_title'
    );
    expect(config.messages).not.toHaveProperty('ai.video.generator.form.panel_title');
  });

  it('falls back to a safe namespace superset when request headers do not expose a pathname', async () => {
    mocks.getPathname.mockResolvedValue(null);

    const config = await requestConfig({
      requestLocale: Promise.resolve('ko'),
    });

    expect(config.messages).toHaveProperty('settings.payments.list.title');
    expect(config.messages).toHaveProperty('common.empty_state.no_permission');
    expect(config.messages).toHaveProperty('admin.settings.groups.email_auth');
    expect(config.messages).toHaveProperty('admin.sidebar.header.brand.title');
    expect(config.messages).toHaveProperty('admin.subscriptions.list.title');
    expect(config.messages).toHaveProperty('activity.notifications.title');
    expect(config.messages).toHaveProperty(
      'ai.image.generator.form.panel_title'
    );
  });

  it('keeps admin no-permission route namespaces available for shared app chrome', async () => {
    mocks.getPathname.mockResolvedValue('/admin/no-permission');

    const config = await requestConfig({
      requestLocale: Promise.resolve('en'),
    });

    expect(config.messages).toHaveProperty('landing.header.brand.title');
    expect(config.messages).toHaveProperty('admin.sidebar.header.brand.title');
    expect(config.messages).toHaveProperty('common.locale_detector.tip_label');
    expect(config.messages).toHaveProperty('common.notifications.bell');
    expect(config.messages).toHaveProperty('common.daily_claim.title');
    expect(config.messages).toHaveProperty('common.sign.sign_in_title');
  });

  it('keeps shared header widget messages available on admin routes', async () => {
    mocks.getPathname.mockResolvedValue('/admin');

    const config = await requestConfig({
      requestLocale: Promise.resolve('en'),
    });

    expect(config.messages).toHaveProperty('common.daily_claim.title');
    expect(config.messages).toHaveProperty('common.notifications.bell');
  });
});
