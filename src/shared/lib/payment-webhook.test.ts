import { describe, expect, it } from 'vitest';

import { PaymentEventType } from '@/extensions/payment/types';

import {
  PAYMENT_WEBHOOK_SOURCE,
  resolvePaymentWebhookEventId,
  resolvePaymentWebhookReferences,
  serializeWebhookPayload,
} from './payment-webhook';

describe('payment webhook helpers', () => {
  it('resolves event id from provider payload', async () => {
    await expect(
      resolvePaymentWebhookEventId('stripe', {
        eventType: PaymentEventType.CHECKOUT_SUCCESS,
        rawEventType: 'checkout.session.completed',
        eventResult: {
          id: 'evt_123',
        },
      })
    ).resolves.toBe('evt_123');
  });

  it('falls back to deterministic hash when event id is missing', async () => {
    const event = {
      eventType: PaymentEventType.SUBSCRIBE_UPDATED,
      rawEventType: 'subscription.updated',
      eventResult: {
        object: {
          id: 'sub_123',
        },
      },
    };

    const left = await resolvePaymentWebhookEventId('creem', event);
    const right = await resolvePaymentWebhookEventId('creem', event);

    expect(left).toBe(right);
    expect(left.startsWith('fallback_')).toBe(true);
  });

  it('resolves order and subscription references from metadata/session', () => {
    expect(
      resolvePaymentWebhookReferences({
        eventType: PaymentEventType.CHECKOUT_SUCCESS,
        eventResult: {
          object: {
            metadata: {
              order_no: 'order_123',
            },
          },
        },
        paymentSession: {
          provider: 'stripe',
          metadata: {
            order_no: 'order_123',
          },
          subscriptionId: 'sub_123',
        },
      })
    ).toEqual({
      orderNo: 'order_123',
      subscriptionId: 'sub_123',
    });
  });

  it('reads stripe event envelope payloads from data.object', () => {
    expect(
      resolvePaymentWebhookReferences({
        eventType: PaymentEventType.PAYMENT_REFUNDED,
        rawEventType: 'charge.refunded',
        eventResult: {
          id: 'evt_123',
          object: 'event',
          data: {
            object: {
              metadata: {
                order_no: 'order_456',
              },
              subscription: {
                id: 'sub_456',
              },
            },
          },
        },
      })
    ).toEqual({
      orderNo: 'order_456',
      subscriptionId: 'sub_456',
    });
  });

  it('serializes payload to valid json', () => {
    expect(PAYMENT_WEBHOOK_SOURCE).toBe('payment');
    expect(serializeWebhookPayload({ ok: true })).toBe('{"ok":true}');
  });
});
