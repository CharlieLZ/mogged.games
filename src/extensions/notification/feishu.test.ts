import { describe, expect, it } from 'vitest';

import { buildCreditsText, buildSignupText } from './feishu';

describe('feishu notification builders', () => {
  it('builds signup notifications with English copy outside zh', () => {
    const text = buildSignupText({
      domain: 'https://mogged.games',
      email: 'charlie@example.com',
      name: 'Charlie',
      userId: 'user_123',
      source: 'auth_signup',
      authSource: 'better-auth',
      referrer: 'https://mogged.games/ai-video-generator/image-to-video',
      locale: 'en',
      countryCode: 'US',
      regionCode: 'US-CA',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      emailVerified: true,
      initialCredits: 100,
      createdAt: '2026-03-24T15:24:35.562Z',
    });

    expect(text).toContain('🆕 [New signup]');
    expect(text).toContain('Domain: mogged.games');
    expect(text).toContain('Email: charlie@example.com');
    expect(text).toContain('Source: auth_signup');
    expect(text).toContain('Auth source: better-auth');
    expect(text).toContain('Site locale: en');
    expect(text).toContain('Language: en');
    expect(text).toContain('Device: Desktop · Windows · Chrome');
    expect(text).toContain('Email verified: yes');
    expect(text).toContain('Granted credits: +100');
    expect(text).toMatch(/Country: .+\(US\)/);
    expect(text).not.toContain('[saas-signups]');
  });

  it('builds credits notifications with English copy outside zh', () => {
    const text = buildCreditsText({
      domain: 'https://mogged.games',
      email: 'charlie@example.com',
      name: 'Charlie',
      userId: 'user_123',
      amount: -12,
      balanceAfter: 88,
      transactionType: 'USAGE',
      scene: 'generation',
      description: 'Image to video generation',
      orderNo: 'order_123',
      subscriptionNo: '',
      transactionNo: 'txn_123',
      creditId: 'credit_123',
      relatedTaskId: 'task_456',
      metadataType: 'ai-task',
      metadataKeys: ['type', 'taskId', 'mediaType'],
      expiresAt: '2026-04-23T15:24:35.531Z',
      source: 'consumeCredits',
      locale: 'en',
      countryCode: 'IT',
      regionCode: 'IT-25',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      occurredAt: '2026-03-24T13:54:40.384Z',
    });

    expect(text).toContain('🪙 Credits change');
    expect(text).toContain('Direction: decrease');
    expect(text).toContain('Change amount: -12');
    expect(text).toContain('Balance: 88');
    expect(text).toContain('Transaction type: USAGE');
    expect(text).toContain('Scene: generation');
    expect(text).toContain('Source: consumeCredits');
    expect(text).toContain('Order no: order_123');
    expect(text).toContain('Record ID: credit_123');
    expect(text).toContain('Related task ID: task_456');
    expect(text).toContain('Metadata type: ai-task');
    expect(text).toContain('Metadata keys: type, taskId, mediaType');
    expect(text).toContain('Device: Desktop · Windows · Chrome');
    expect(text).toMatch(/Country: .+\(IT\)/);
    expect(text).not.toContain('[saas-credits]');
  });

  it('keeps Chinese copy when the site locale is zh', () => {
    const text = buildCreditsText({
      domain: 'https://mogged.games',
      email: 'charlie@example.com',
      name: 'Charlie',
      userId: 'user_123',
      amount: 30,
      balanceAfter: 30,
      transactionType: 'grant',
      scene: 'gift',
      description: 'initial credits for free trial',
      transactionNo: 'txn_123',
      creditId: 'credit_123',
      source: 'signup_bonus',
      locale: 'zh',
      countryCode: 'US',
      regionCode: 'CA',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      occurredAt: '2026-03-24T13:54:40.384Z',
    });

    expect(text).toContain('🪙 Credits 变动通知');
    expect(text).toContain('方向: 增加');
    expect(text).toContain('设备标识: 桌面端 · macOS · Chrome');
  });

  it('renders guest quota cost details when the notification comes from an anonymous task', () => {
    const text = buildCreditsText({
      domain: 'https://mogged.games',
      name: 'Guest Viewer',
      userId: 'guest-viewer-1',
      amount: -12,
      transactionType: 'guest_consume',
      scene: 'text-to-image',
      description: 'Guest image generation',
      transactionNo: 'provider-task-1',
      creditId: 'guest-task-1',
      relatedTaskId: 'guest-task-1',
      metadataType: 'guest-ai-task',
      metadataKeys: ['quotaUnits', 'quotaStatus', 'providerTaskId'],
      source: 'guest_ai_generate',
      locale: 'en',
      countryCode: 'US',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/136.0.0.0 Mobile/15E148 Safari/604.1',
      occurredAt: '2026-05-06T03:20:00.000Z',
      subjectType: 'guest',
      guestIdHash: 'guest-hash-1',
      providerTaskId: 'provider-task-1',
      quotaLimit: 100,
      quotaUsed: 12,
      quotaRemaining: 88,
    });

    expect(text).toContain('Subject type: guest');
    expect(text).toContain('Guest ID hash: guest-hash-1');
    expect(text).toContain('Provider task ID: provider-task-1');
    expect(text).toContain('Guest quota used: 12/100');
    expect(text).toContain('Guest quota remaining: 88');
    expect(text).toContain('Direction: decrease');
    expect(text).toContain('Device: Mobile · iPhone · Chrome iOS');
  });
});
