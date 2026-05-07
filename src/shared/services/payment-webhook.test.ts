import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentEventType } from '@/extensions/payment/types';
import * as notificationModule from '@/extensions/notification';
import {
  findOrderByOrderNo,
  findOrderByProviderTransactionId,
  updateOrderByOrderNo,
} from '@/shared/models/order';
import {
  findSubscriptionByProviderSubscriptionId,
  updateSubscriptionBySubscriptionNo,
} from '@/shared/models/subscription';

import {
  handlePaymentWebhookEvent,
  resolvePaymentWebhookAssociations,
} from './payment-webhook';

const syncMocks = vi.hoisted(() => ({
  syncGoogleAdsPurchaseConversionForOrder: vi.fn(),
  sendEmail: vi.fn(),
  getPaymentService: vi.fn(),
  refundPayment: vi.fn(),
  cancelSubscription: vi.fn(),
}));
const creditModelMocks = vi.hoisted(() => ({
  revokeUnusedCreditsByOrderNo: vi.fn(),
}));

vi.mock('@/extensions/notification', () => ({
  sendOrderNotification: vi.fn(() => Promise.resolve({ code: 0 })),
  sendErrorNotification: vi.fn(() => Promise.resolve({ code: 0 })),
}));

vi.mock('@/shared/lib/brand', () => ({
  getAppName: vi.fn(() => 'mogged'),
  getSupportEmail: vi.fn(() => 'support@mogged.games'),
}));

vi.mock('@/shared/models/order', () => ({
  findOrderByOrderNo: vi.fn(),
  findOrderByProviderTransactionId: vi.fn(),
  updateOrderByOrderNo: vi.fn(),
  OrderStatus: {
    FAILED: 'failed',
  },
}));

vi.mock('@/shared/models/credit', () => ({
  revokeUnusedCreditsByOrderNo: creditModelMocks.revokeUnusedCreditsByOrderNo,
}));

vi.mock('@/shared/models/subscription', () => ({
  findSubscriptionByProviderSubscriptionId: vi.fn(),
  updateSubscriptionBySubscriptionNo: vi.fn(),
  SubscriptionStatus: {
    CANCELED: 'canceled',
    PAUSED: 'paused',
  },
}));

vi.mock('@/shared/models/user', () => ({
  findUserById: vi.fn(),
}));

vi.mock('@/shared/services/google-ads-purchase-sync', () => ({
  syncGoogleAdsPurchaseConversionForOrder:
    syncMocks.syncGoogleAdsPurchaseConversionForOrder,
}));
vi.mock('@/shared/services/email', () => ({
  getEmailService: vi.fn(async () => ({
    sendEmail: syncMocks.sendEmail,
  })),
}));

vi.mock('@/shared/services/payment', () => ({
  getPaymentService: syncMocks.getPaymentService,
  handleCheckoutSuccess: vi.fn(),
  handleSubscriptionCanceled: vi.fn(),
  handleSubscriptionRenewal: vi.fn(),
  handleSubscriptionUpdated: vi.fn(),
}));

describe('payment webhook associations', () => {
  beforeEach(() => {
    vi.mocked(findOrderByOrderNo).mockReset();
    vi.mocked(findOrderByProviderTransactionId).mockReset();
    vi.mocked(updateOrderByOrderNo).mockReset();
    vi.mocked(findSubscriptionByProviderSubscriptionId).mockReset();
    vi.mocked(updateSubscriptionBySubscriptionNo).mockReset();
    creditModelMocks.revokeUnusedCreditsByOrderNo.mockReset();
  });

  it('resolves related user from order metadata', async () => {
    vi.mocked(findOrderByOrderNo).mockResolvedValue({
      orderNo: 'order_123',
      userId: 'user_order',
    } as never);

    const result = await resolvePaymentWebhookAssociations({
      provider: 'stripe',
      event: {
        eventType: PaymentEventType.CHECKOUT_SUCCESS,
        eventResult: {
          object: {
            metadata: {
              order_no: 'order_123',
            },
          },
        },
      },
    });

    expect(findOrderByOrderNo).toHaveBeenCalledWith('order_123');
    expect(result.orderNo).toBe('order_123');
    expect(result.userId).toBe('user_order');
    expect(result.subscriptionId).toBeNull();
  });

  it('falls back to subscription ownership when order is absent', async () => {
    vi.mocked(findSubscriptionByProviderSubscriptionId).mockResolvedValue({
      subscriptionId: 'sub_123',
      userId: 'user_subscription',
    } as never);

    const result = await resolvePaymentWebhookAssociations({
      provider: 'paypal',
      event: {
        eventType: PaymentEventType.PAYMENT_SUCCESS,
        paymentSession: {
          provider: 'paypal',
          subscriptionId: 'sub_123',
        },
        eventResult: {},
      },
    });

    expect(findSubscriptionByProviderSubscriptionId).toHaveBeenCalledWith({
      provider: 'paypal',
      subscriptionId: 'sub_123',
    });
    expect(result.orderNo).toBeNull();
    expect(result.subscriptionId).toBe('sub_123');
    expect(result.userId).toBe('user_subscription');
  });

  it('falls back to provider transaction id when order metadata is absent', async () => {
    vi.mocked(findOrderByProviderTransactionId).mockResolvedValue({
      orderNo: 'order_txn_123',
      userId: 'user_order',
    } as never);

    const result = await resolvePaymentWebhookAssociations({
      provider: 'stripe',
      event: {
        eventType: PaymentEventType.PAYMENT_REFUNDED,
        paymentSession: {
          provider: 'stripe',
          paymentInfo: {
            paymentAmount: 2900,
            paymentCurrency: 'usd',
            transactionId: 'cs_test_123',
          },
        },
        eventResult: {},
      },
    });

    expect(findOrderByProviderTransactionId).toHaveBeenCalledWith({
      provider: 'stripe',
      transactionId: 'cs_test_123',
    });
    expect(result.orderNo).toBe('order_txn_123');
    expect(result.userId).toBe('user_order');
  });
});

describe('payment webhook purchase sync', () => {
  beforeEach(() => {
    syncMocks.syncGoogleAdsPurchaseConversionForOrder.mockReset();
    syncMocks.syncGoogleAdsPurchaseConversionForOrder.mockResolvedValue({
      status: 'uploaded',
    });
  });

  it('uploads a server-side purchase conversion after checkout success is fulfilled', async () => {
    vi.mocked(findOrderByOrderNo).mockResolvedValue({
      orderNo: 'order_123',
      userId: 'user_order',
      paymentType: 'one_time',
      paymentProvider: 'stripe',
    } as never);

    const paymentService = await import('@/shared/services/payment');
    vi.mocked(paymentService.handleCheckoutSuccess).mockResolvedValue(
      {} as never
    );

    await handlePaymentWebhookEvent({
      provider: 'stripe',
      event: {
        eventType: PaymentEventType.CHECKOUT_SUCCESS,
        paymentSession: {
          provider: 'stripe',
          paymentStatus: 'success',
          paymentInfo: {
            paymentAmount: 2900,
            paymentCurrency: 'usd',
          },
        },
        eventResult: {
          object: {
            metadata: {
              order_no: 'order_123',
            },
          },
        },
      } as never,
    });

    expect(
      syncMocks.syncGoogleAdsPurchaseConversionForOrder
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_order',
        order: expect.objectContaining({
          orderNo: 'order_123',
        }),
        session: expect.objectContaining({
          provider: 'stripe',
        }),
      })
    );
  });
});

describe('payment webhook fraud and refund handling', () => {
  beforeEach(() => {
    vi.mocked(findOrderByOrderNo).mockReset();
    vi.mocked(findSubscriptionByProviderSubscriptionId).mockReset();
    vi.mocked(updateOrderByOrderNo).mockReset();
    vi.mocked(updateSubscriptionBySubscriptionNo).mockReset();
    creditModelMocks.revokeUnusedCreditsByOrderNo.mockReset();
    syncMocks.sendEmail.mockReset();
    syncMocks.getPaymentService.mockReset();
    syncMocks.refundPayment.mockReset();
    syncMocks.cancelSubscription.mockReset();
    vi.mocked(notificationModule.sendErrorNotification).mockReset();
    syncMocks.sendEmail.mockResolvedValue({
      success: true,
      provider: 'zeptomail',
      messageId: 'mail_123',
    });
    vi.mocked(notificationModule.sendErrorNotification).mockResolvedValue({
      code: 0,
      msg: 'ok',
    });
    syncMocks.getPaymentService.mockResolvedValue({
      getProvider: vi.fn(() => ({
        refundPayment: syncMocks.refundPayment,
        cancelSubscription: syncMocks.cancelSubscription,
      })),
    });
    syncMocks.refundPayment.mockResolvedValue({
      refundId: 're_123',
      status: 'succeeded',
      amount: 2900,
      currency: 'usd',
    });
    syncMocks.cancelSubscription.mockResolvedValue({
      provider: 'stripe',
      subscriptionId: 'sub_canceled',
      subscriptionInfo: {
        subscriptionId: 'sub_canceled',
        status: 'canceled',
        currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
        canceledAt: new Date('2026-01-15T00:00:00.000Z'),
        canceledReasonType: 'fraud_warning',
      },
    });
    process.env.ADMIN_NOTIFICATION_EMAIL = 'ops@example.com';
  });

  it('auto refunds actionable early fraud warnings, cancels subscriptions, revokes unused credits, and notifies admins', async () => {
    const result = await handlePaymentWebhookEvent({
      provider: 'stripe',
      associations: {
        orderNo: 'order_123',
        subscriptionId: 'sub_123',
        userId: 'user_123',
        order: {
          orderNo: 'order_123',
        } as never,
        subscription: {
          subscriptionNo: 'subscription_no_123',
          subscriptionId: 'sub_123',
          userId: 'user_123',
        } as never,
      },
      event: {
        eventType: PaymentEventType.PAYMENT_FAILED,
        rawEventType: 'radar.early_fraud_warning.created',
        paymentSession: {
          provider: 'stripe',
          metadata: {
            order_no: 'order_123',
          },
          subscriptionId: 'sub_123',
        },
        eventResult: {
          data: {
            object: {
              id: 'issfr_123',
              actionable: true,
              charge: 'ch_123',
              payment_intent: 'pi_123',
            },
          },
        },
      },
    });

    expect(syncMocks.refundPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          chargeId: 'ch_123',
          paymentIntentId: 'pi_123',
          reason: 'fraudulent',
        }),
      })
    );
    expect(syncMocks.cancelSubscription).toHaveBeenCalledWith({
      subscriptionId: 'sub_123',
    });
    expect(updateOrderByOrderNo).toHaveBeenCalledWith(
      'order_123',
      expect.objectContaining({
        status: 'failed',
      })
    );
    expect(updateSubscriptionBySubscriptionNo).toHaveBeenCalledWith(
      'subscription_no_123',
      expect.objectContaining({
        status: 'canceled',
        canceledReasonType: 'fraud_warning',
      })
    );
    expect(creditModelMocks.revokeUnusedCreditsByOrderNo).toHaveBeenCalledWith({
      orderNo: 'order_123',
      reason: 'fraud_warning',
    });
    expect(syncMocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        replyTo: 'support@mogged.games',
        subject: expect.stringContaining('radar.early_fraud_warning.created'),
        text: expect.stringContaining('处理状态: AUTO_ACTION_TAKEN'),
        html: expect.stringContaining('处理状态: AUTO_ACTION_TAKEN'),
      })
    );
    expect(notificationModule.sendErrorNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        apiProvider: 'stripe',
        errorCode: 'payment_risk_review_required',
        type: 'payment_risk_review_required',
        taskId: 'order_123',
        errorMessage: expect.stringContaining('review_status=AUTO_ACTION_TAKEN'),
      })
    );
    expect(result.note).toContain('auto_refund_succeeded');
    expect(result.note).toContain('risk_type=fraud_warning');
  });

  it('records non-actionable early fraud warnings for manual review without auto canceling subscriptions or revoking credits', async () => {
    const result = await handlePaymentWebhookEvent({
      provider: 'stripe',
      associations: {
        orderNo: 'order_non_actionable_123',
        subscriptionId: 'sub_non_actionable_123',
        userId: 'user_non_actionable_123',
        order: {
          orderNo: 'order_non_actionable_123',
        } as never,
        subscription: {
          subscriptionNo: 'subscription_no_non_actionable_123',
          subscriptionId: 'sub_non_actionable_123',
          userId: 'user_non_actionable_123',
        } as never,
      },
      event: {
        eventType: PaymentEventType.PAYMENT_FAILED,
        rawEventType: 'radar.early_fraud_warning.created',
        paymentSession: {
          provider: 'stripe',
          subscriptionId: 'sub_non_actionable_123',
        },
        eventResult: {
          data: {
            object: {
              id: 'issfr_456',
              actionable: false,
              charge: 'ch_non_actionable_123',
              payment_intent: 'pi_non_actionable_123',
            },
          },
        },
      },
    });

    expect(syncMocks.refundPayment).not.toHaveBeenCalled();
    expect(syncMocks.cancelSubscription).not.toHaveBeenCalled();
    expect(updateSubscriptionBySubscriptionNo).not.toHaveBeenCalled();
    expect(creditModelMocks.revokeUnusedCreditsByOrderNo).not.toHaveBeenCalled();
    expect(updateOrderByOrderNo).toHaveBeenCalledWith(
      'order_non_actionable_123',
      expect.not.objectContaining({
        status: 'failed',
      })
    );
    expect(syncMocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        replyTo: 'support@mogged.games',
        subject: expect.stringContaining('radar.early_fraud_warning.created'),
        text: expect.stringContaining('manual_review_required'),
        html: expect.stringContaining('manual_review_required'),
      })
    );
    expect(result.note).toContain('risk_type=fraud_warning');
    expect(result.note).toContain('actionable=false');
    expect(result.note).toContain('manual_review_required');
  });

  it('records disputes for manual review without auto canceling subscriptions or revoking unused credits', async () => {
    const result = await handlePaymentWebhookEvent({
      provider: 'stripe',
      associations: {
        orderNo: 'order_456',
        subscriptionId: 'sub_456',
        userId: 'user_456',
        order: {
          orderNo: 'order_456',
        } as never,
        subscription: {
          subscriptionNo: 'subscription_no_456',
          subscriptionId: 'sub_456',
          userId: 'user_456',
        } as never,
      },
      event: {
        eventType: PaymentEventType.PAYMENT_FAILED,
        rawEventType: 'charge.dispute.created',
        paymentSession: {
          provider: 'stripe',
          subscriptionId: 'sub_456',
        },
        eventResult: {
          data: {
            object: {
              id: 'dp_123',
              charge: 'ch_456',
              payment_intent: 'pi_456',
              is_charge_refundable: true,
            },
          },
        },
      },
    });

    expect(syncMocks.refundPayment).not.toHaveBeenCalled();
    expect(syncMocks.cancelSubscription).not.toHaveBeenCalled();
    expect(updateOrderByOrderNo).toHaveBeenCalledWith(
      'order_456',
      expect.not.objectContaining({
        status: 'failed',
      })
    );
    expect(updateSubscriptionBySubscriptionNo).not.toHaveBeenCalled();
    expect(creditModelMocks.revokeUnusedCreditsByOrderNo).not.toHaveBeenCalled();
    expect(syncMocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        replyTo: 'support@mogged.games',
        subject: expect.stringContaining('charge.dispute.created'),
        text: expect.stringContaining('manual_review_required'),
        html: expect.stringContaining('manual_review_required'),
      })
    );
    expect(notificationModule.sendErrorNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        apiProvider: 'stripe',
        errorCode: 'payment_risk_review_required',
        type: 'payment_risk_review_required',
        taskId: 'order_456',
        errorMessage: expect.stringContaining('event_type=charge.dispute.created'),
      })
    );
    expect(result.note).toContain('risk_type=dispute');
    expect(result.note).toContain('manual_review_required');
  });

  it('records fully refunded charges for manual review without auto canceling subscriptions or revoking credits', async () => {
    const result = await handlePaymentWebhookEvent({
      provider: 'stripe',
      associations: {
        orderNo: 'order_789',
        subscriptionId: 'sub_789',
        userId: 'user_789',
        order: {
          orderNo: 'order_789',
        } as never,
        subscription: {
          subscriptionNo: 'subscription_no_789',
          subscriptionId: 'sub_789',
          userId: 'user_789',
        } as never,
      },
      event: {
        eventType: PaymentEventType.PAYMENT_REFUNDED,
        rawEventType: 'charge.refunded',
        paymentSession: {
          provider: 'stripe',
          subscriptionId: 'sub_789',
        },
        eventResult: {
          data: {
            object: {
              id: 'ch_789',
              refunded: true,
              amount: 2900,
              amount_refunded: 2900,
              payment_intent: 'pi_789',
            },
          },
        },
      },
    });

    expect(syncMocks.refundPayment).not.toHaveBeenCalled();
    expect(syncMocks.cancelSubscription).not.toHaveBeenCalled();
    expect(updateOrderByOrderNo).toHaveBeenCalledWith(
      'order_789',
      expect.not.objectContaining({
        status: 'failed',
      })
    );
    expect(updateSubscriptionBySubscriptionNo).not.toHaveBeenCalled();
    expect(creditModelMocks.revokeUnusedCreditsByOrderNo).not.toHaveBeenCalled();
    expect(syncMocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        replyTo: 'support@mogged.games',
        subject: expect.stringContaining('charge.refunded'),
        text: expect.stringContaining('manual_credit_review_required'),
        html: expect.stringContaining('manual_credit_review_required'),
      })
    );
    expect(notificationModule.sendErrorNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        apiProvider: 'stripe',
        errorCode: 'payment_risk_review_required',
        type: 'payment_risk_review_required',
        taskId: 'order_789',
        errorMessage: expect.stringContaining('event_type=charge.refunded'),
      })
    );
    expect(result.note).toContain('refund_recorded');
    expect(result.note).toContain('risk_type=refund');
    expect(result.note).toContain('manual_review_required');
    expect(result.note).toContain('manual_credit_review_required');
  });

  it('records partial charge.refunded events without auto canceling subscriptions or revoking unused credits', async () => {
    const result = await handlePaymentWebhookEvent({
      provider: 'stripe',
      associations: {
        orderNo: 'order_partial_789',
        subscriptionId: 'sub_partial_789',
        userId: 'user_partial_789',
        order: {
          orderNo: 'order_partial_789',
        } as never,
        subscription: {
          subscriptionNo: 'subscription_no_partial_789',
          subscriptionId: 'sub_partial_789',
          userId: 'user_partial_789',
        } as never,
      },
      event: {
        eventType: PaymentEventType.PAYMENT_REFUNDED,
        rawEventType: 'charge.refunded',
        paymentSession: {
          provider: 'stripe',
          subscriptionId: 'sub_partial_789',
        },
        eventResult: {
          data: {
            object: {
              id: 'ch_partial_789',
              refunded: false,
              amount: 2900,
              amount_refunded: 900,
              payment_intent: 'pi_partial_789',
            },
          },
        },
      },
    });

    expect(syncMocks.refundPayment).not.toHaveBeenCalled();
    expect(syncMocks.cancelSubscription).not.toHaveBeenCalled();
    expect(updateOrderByOrderNo).toHaveBeenCalledWith(
      'order_partial_789',
      expect.not.objectContaining({
        status: 'failed',
      })
    );
    expect(updateSubscriptionBySubscriptionNo).not.toHaveBeenCalled();
    expect(creditModelMocks.revokeUnusedCreditsByOrderNo).not.toHaveBeenCalled();
    expect(syncMocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        replyTo: 'support@mogged.games',
        subject: expect.stringContaining('charge.refunded'),
        text: expect.stringContaining('manual_credit_review_required'),
        html: expect.stringContaining('manual_credit_review_required'),
      })
    );
    expect(result.note).toContain('refund_recorded');
    expect(result.note).toContain('risk_type=refund');
    expect(result.note).toContain('manual_review_required');
    expect(result.note).toContain('manual_credit_review_required');
  });
});
