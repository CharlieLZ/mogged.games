import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  limiter: vi.fn(),
  getPaymentService: vi.fn(),
  getPaymentEvent: vi.fn(),
  resolvePaymentWebhookEventId: vi.fn(),
  serializeWebhookPayload: vi.fn(),
  resolveRequestContext: vi.fn(),
  claimWebhookEvent: vi.fn(),
  markWebhookEventFailed: vi.fn(),
  markWebhookEventProcessed: vi.fn(),
  handlePaymentWebhookEvent: vi.fn(),
  resolvePaymentWebhookAssociations: vi.fn(),
  sendErrorNotification: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock('@/shared/lib/api/rate-limit', () => ({
  rateLimit: vi.fn(() => mocks.limiter),
}));

vi.mock('@/shared/lib/payment-webhook', () => ({
  PAYMENT_WEBHOOK_SOURCE: 'payment_webhook',
  resolvePaymentWebhookEventId: mocks.resolvePaymentWebhookEventId,
  serializeWebhookPayload: mocks.serializeWebhookPayload,
}));

vi.mock('@/shared/lib/request-context', () => ({
  resolveRequestContext: mocks.resolveRequestContext,
}));

vi.mock('@/shared/models/webhook_event', () => ({
  claimWebhookEvent: mocks.claimWebhookEvent,
  markWebhookEventFailed: mocks.markWebhookEventFailed,
  markWebhookEventProcessed: mocks.markWebhookEventProcessed,
}));

vi.mock('@/shared/services/payment-webhook', () => ({
  handlePaymentWebhookEvent: mocks.handlePaymentWebhookEvent,
  resolvePaymentWebhookAssociations: mocks.resolvePaymentWebhookAssociations,
}));

vi.mock('@/shared/services/payment', () => ({
  getPaymentService: mocks.getPaymentService,
}));

vi.mock('@/extensions/notification', () => ({
  sendErrorNotification: mocks.sendErrorNotification,
}));

vi.mock('@/shared/models/user', () => ({
  findUserById: mocks.findUserById,
}));

import { POST } from './route';

describe('/api/payment/notify/[provider]', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.limiter.mockResolvedValue({
      success: true,
      limit: 180,
      remaining: 179,
      reset: Date.now() + 60_000,
    });
    mocks.getPaymentService.mockResolvedValue({
      getProvider: vi.fn(() => ({
        getPaymentEvent: mocks.getPaymentEvent,
      })),
    });
    mocks.getPaymentEvent.mockResolvedValue({
      eventType: 'checkout.success',
      rawEventType: 'checkout.success',
      eventResult: {
        id: 'evt_123',
      },
    });
    mocks.resolvePaymentWebhookEventId.mockResolvedValue('evt_123');
    mocks.serializeWebhookPayload.mockReturnValue('{"id":"evt_123"}');
    mocks.resolveRequestContext.mockReturnValue({
      ipAddress: '1.1.1.1',
      userAgent: 'Mozilla/5.0',
      deviceType: 'desktop',
      locale: 'en',
      countryCode: 'US',
      regionCode: 'CA',
      path: '/api/payment/notify/stripe',
      referer: 'https://mogged.games',
    });
    mocks.resolvePaymentWebhookAssociations.mockResolvedValue({
      orderNo: 'ord_123',
      subscriptionId: 'sub_123',
      userId: 'user_123',
      order: null,
      subscription: null,
    });
    mocks.claimWebhookEvent.mockResolvedValue({
      status: 'claimed',
      attempt: {
        id: 'attempt_123',
      },
    });
    mocks.markWebhookEventFailed.mockResolvedValue(null);
    mocks.markWebhookEventProcessed.mockResolvedValue(null);
    mocks.handlePaymentWebhookEvent.mockRejectedValue(new Error('boom'));
    mocks.sendErrorNotification.mockResolvedValue({
      code: 0,
      msg: 'ok',
    });
    mocks.findUserById.mockResolvedValue({
      email: 'alice@example.com',
      name: 'Alice',
    });
  });

  it('sends a feishu error notification when webhook handling throws', async () => {
    const response = await POST(
      new Request('https://example.com/api/payment/notify/stripe', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({
          provider: 'stripe',
        }),
      }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      message: 'handle payment notify failed: boom',
    });
    expect(mocks.markWebhookEventFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'stripe',
        eventId: 'evt_123',
        relatedUserId: 'user_123',
        relatedOrderNo: 'ord_123',
        relatedSubscriptionId: 'sub_123',
        errorMessage: 'boom',
      })
    );
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        name: 'Alice',
        apiEndpoint: '/api/payment/notify/stripe',
        apiProvider: 'stripe',
        errorCode: 'payment_webhook_failed',
        taskId: 'ord_123',
        type: 'payment_webhook_failed',
      })
    );
  });
});
