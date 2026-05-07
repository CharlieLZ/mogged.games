import { describe, expect, it, vi } from 'vitest';

import { StripeProvider } from './stripe';
import { PaymentEventType, PaymentType, SubscriptionStatus } from './types';

function buildStripeSubscription(status: string) {
  return {
    id: 'sub_123',
    status,
    cancel_at: null,
    canceled_at: null,
    cancellation_details: null,
    metadata: {},
    items: {
      data: [
        {
          current_period_start: 1_760_000_000,
          current_period_end: 1_762_592_000,
          price: {
            product: 'prod_123',
            id: 'price_123',
            unit_amount: 2900,
            currency: 'usd',
          },
          plan: {
            interval: 'month',
            interval_count: 1,
          },
        },
      ],
    },
  };
}

describe('StripeProvider subscription status mapping', () => {
  it.each([
    ['past_due', SubscriptionStatus.PAUSED],
    ['paused', SubscriptionStatus.PAUSED],
    ['unpaid', SubscriptionStatus.PAUSED],
    ['trialing', SubscriptionStatus.TRIALING],
    ['incomplete', SubscriptionStatus.PENDING],
    ['incomplete_expired', SubscriptionStatus.EXPIRED],
  ] as const)('maps %s subscriptions to %s', async (status, expectedStatus) => {
    const provider = new StripeProvider({
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
    });
    const buildSubscriptionInfo = (
      provider as unknown as {
        buildSubscriptionInfo: (subscription: unknown) => Promise<{
          status?: SubscriptionStatus;
        }>;
      }
    ).buildSubscriptionInfo.bind(provider);

    const subscriptionInfo = await buildSubscriptionInfo(
      buildStripeSubscription(status)
    );

    expect(subscriptionInfo.status).toBe(expectedStatus);
  });
});

describe('StripeProvider webhook event parsing', () => {
  it.each([
    ['radar.early_fraud_warning.created', PaymentEventType.PAYMENT_FAILED],
    ['charge.dispute.created', PaymentEventType.PAYMENT_FAILED],
    ['charge.refunded', PaymentEventType.PAYMENT_REFUNDED],
  ] as const)(
    'maps %s into the normalized payment event contract',
    async (rawEventType, expectedEventType) => {
      const provider = new StripeProvider({
        secretKey: 'sk_test_123',
        publishableKey: 'pk_test_123',
        signingSecret: 'whsec_123',
      });

      const mockedClient = {
        webhooks: {
          constructEvent: vi.fn(() => ({
            id: 'evt_123',
            type: rawEventType,
            data: {
              object:
                rawEventType === 'radar.early_fraud_warning.created'
                  ? {
                      id: 'issfr_123',
                      object: 'radar.early_fraud_warning',
                      actionable: true,
                      charge: 'ch_123',
                      payment_intent: 'pi_123',
                    }
                  : rawEventType === 'charge.dispute.created'
                    ? {
                        id: 'dp_123',
                        object: 'dispute',
                        charge: 'ch_123',
                        payment_intent: 'pi_123',
                        is_charge_refundable: true,
                        metadata: {},
                      }
                    : {
                        id: 'ch_123',
                        object: 'charge',
                        refunded: true,
                        payment_intent: 'pi_123',
                        metadata: {},
                      },
            },
          })),
        },
        checkout: {
          sessions: {
            list: vi.fn(async () => ({
              data: [
                {
                  id: 'cs_test_123',
                  metadata: {
                    order_no: 'order_123',
                  },
                  payment_intent: 'pi_123',
                  status: 'complete',
                  payment_status: 'paid',
                  amount_total: 2900,
                  currency: 'usd',
                  customer_email: 'demo@example.com',
                  customer_details: {
                    email: 'demo@example.com',
                    name: 'Demo',
                  },
                  created: 1_760_000_000,
                  subscription: null,
                },
              ],
            })),
          },
        },
        invoices: {
          list: vi.fn(async () => ({
            data: [],
          })),
        },
      };

      (provider as unknown as { client: typeof mockedClient }).client =
        mockedClient;

      const event = await provider.getPaymentEvent({
        req: new Request('https://example.com/api/payment/notify/stripe', {
          method: 'POST',
          headers: {
            'stripe-signature': 'sig_123',
          },
          body: JSON.stringify({
            id: 'evt_123',
          }),
        }),
      });

      expect(event.eventType).toBe(expectedEventType);
      expect(event.rawEventType).toBe(rawEventType);
      expect(event.paymentSession).toEqual(
        expect.objectContaining({
          provider: 'stripe',
          metadata: {
            order_no: 'order_123',
          },
          paymentInfo: expect.objectContaining({
            transactionId: 'cs_test_123',
          }),
        })
      );
    }
  );
});

describe('StripeProvider embedded checkout session creation', () => {
  it('creates embedded checkout sessions with a return url and client secret', async () => {
    const provider = new StripeProvider({
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
    });

    const mockedClient = {
      customers: {
        list: vi.fn(async () => ({
          data: [],
        })),
        create: vi.fn(async () => ({
          id: 'cus_123',
        })),
      },
      checkout: {
        sessions: {
          create: vi.fn(async () => ({
            id: 'cs_test_123',
            client_secret: 'cs_test_client_secret',
            url: null,
          })),
        },
      },
    };

    (provider as unknown as { client: typeof mockedClient }).client =
      mockedClient;

    const result = await provider.createPayment({
      order: {
        type: PaymentType.ONE_TIME,
        description: 'Starter',
        customer: {
          email: 'demo@example.com',
          name: 'Demo User',
        },
        price: {
          amount: 2900,
          currency: 'usd',
        },
        successUrl: 'https://mogged.games/api/payment/callback?order_no=1',
      },
    });

    expect(mockedClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ui_mode: 'embedded',
        redirect_on_completion: 'if_required',
        return_url: 'https://mogged.games/api/payment/callback?order_no=1',
      })
    );
    expect(result.checkoutInfo).toEqual({
      sessionId: 'cs_test_123',
      checkoutUrl: null,
      clientSecret: 'cs_test_client_secret',
      flow: 'embedded',
    });
    expect(result.checkoutResult).not.toHaveProperty('client_secret');
  });
});

describe('StripeProvider checkout session paid timestamp', () => {
  it('prefers the invoice paid timestamp over the checkout session creation time', async () => {
    const provider = new StripeProvider({
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
    });

    const mockedClient = {
      invoices: {
        retrieve: vi.fn(async () => ({
          id: 'in_123',
          status_transitions: {
            paid_at: 1_760_000_321,
          },
        })),
      },
    };

    (provider as unknown as { client: typeof mockedClient }).client =
      mockedClient;

    const buildPaymentSessionFromCheckoutSession = (
      provider as unknown as {
        buildPaymentSessionFromCheckoutSession: (session: unknown) => Promise<{
          paymentInfo?: {
            paidAt?: Date;
          };
        }>;
      }
    ).buildPaymentSessionFromCheckoutSession.bind(provider);

    const paymentSession = await buildPaymentSessionFromCheckoutSession({
      id: 'cs_test_123',
      status: 'complete',
      payment_status: 'paid',
      amount_total: 2900,
      currency: 'usd',
      customer_email: 'demo@example.com',
      customer_details: {
        email: 'demo@example.com',
        name: 'Demo User',
      },
      created: 1_760_000_000,
      invoice: 'in_123',
      subscription: null,
      discounts: [],
      metadata: {},
    });

    expect(paymentSession.paymentInfo?.paidAt).toEqual(
      new Date(1_760_000_321 * 1000)
    );
  });
});
