import {
  sendErrorNotification,
  sendOrderNotification,
} from '@/extensions/notification';
import {
  PaymentEvent,
  PaymentEventType,
  SubscriptionCycleType,
} from '@/extensions/payment/types';
import {
  getAdminNotificationRecipients,
  toEmailRecipientField,
} from '@/shared/lib/admin-notification';
import { getSupportEmail } from '@/shared/lib/brand';
import { resolvePaymentWebhookReferences } from '@/shared/lib/payment-webhook';
import { revokeUnusedCreditsByOrderNo } from '@/shared/models/credit';
import {
  findOrderByOrderNo,
  findOrderByProviderTransactionId,
  OrderStatus,
  updateOrderByOrderNo,
} from '@/shared/models/order';
import {
  findSubscriptionByProviderSubscriptionId,
  SubscriptionStatus,
  updateSubscriptionBySubscriptionNo,
} from '@/shared/models/subscription';
import { findUserById } from '@/shared/models/user';
import { getEmailService } from '@/shared/services/email';
import { syncGoogleAdsPurchaseConversionForOrder } from '@/shared/services/google-ads-purchase-sync';
import {
  getPaymentService,
  handleCheckoutSuccess,
  handleSubscriptionCanceled,
  handleSubscriptionRenewal,
  handleSubscriptionUpdated,
} from '@/shared/services/payment';

export type PaymentWebhookHandleResult = {
  orderNo: string | null;
  subscriptionId: string | null;
  userId: string | null;
  note?: string | null;
};

export type PaymentWebhookAssociations = PaymentWebhookHandleResult & {
  order: Awaited<ReturnType<typeof findOrderByOrderNo>> | null;
  subscription: Awaited<
    ReturnType<typeof findSubscriptionByProviderSubscriptionId>
  > | null;
};

type PaymentWebhookReviewStatus =
  | 'AUTO_ACTION_TAKEN'
  | 'MANUAL_REVIEW_REQUIRED';

export async function resolvePaymentWebhookAssociations({
  provider,
  event,
}: {
  provider: string;
  event: PaymentEvent;
}): Promise<PaymentWebhookAssociations> {
  const references = resolvePaymentWebhookReferences(event);
  let order = references.orderNo
    ? await findOrderByOrderNo(references.orderNo)
    : null;
  const transactionId =
    event.paymentSession?.paymentInfo?.transactionId?.trim();

  if (!order && transactionId) {
    order = await findOrderByProviderTransactionId({
      provider,
      transactionId,
    });
  }

  const subscription = references.subscriptionId
    ? await findSubscriptionByProviderSubscriptionId({
        provider,
        subscriptionId: references.subscriptionId,
      })
    : null;

  return {
    orderNo: order?.orderNo || references.orderNo,
    subscriptionId:
      subscription?.subscriptionId ||
      order?.subscriptionId ||
      event.paymentSession?.subscriptionId ||
      references.subscriptionId,
    userId: order?.userId || subscription?.userId || null,
    order,
    subscription,
  };
}

async function sendRefundOrDisputeNotification(params: {
  provider: string;
  eventType: string;
  orderNo: string | null;
  subscriptionId: string | null;
  userId: string | null;
  eventResult: unknown;
  reviewStatus: PaymentWebhookReviewStatus;
  note?: string | null;
}) {
  const recipients = getAdminNotificationRecipients();

  const subject =
    `[${params.provider}] [${params.reviewStatus}] ${params.eventType} ${
      params.orderNo || ''
    }`.trim();
  const text = [
    `处理状态: ${params.reviewStatus}`,
    `事件类型: ${params.eventType}`,
    `订单号: ${params.orderNo || '未知'}`,
    `订阅ID: ${params.subscriptionId || '未知'}`,
    `处理说明: ${params.note || '无'}`,
    JSON.stringify(params.eventResult, null, 2),
  ].join('\n\n');
  const html = `<p>处理状态: ${params.reviewStatus}</p>
<p>事件类型: ${params.eventType}</p>
<p>订单号: ${params.orderNo || '未知'}</p>
<p>订阅ID: ${params.subscriptionId || '未知'}</p>
<p>处理说明: ${params.note || '无'}</p>
<pre>${JSON.stringify(params.eventResult, null, 2)}</pre>`;

  const riskErrorMessage = [
    `review_status=${params.reviewStatus}`,
    `event_type=${params.eventType}`,
    `order_no=${params.orderNo || 'unknown'}`,
    `subscription_id=${params.subscriptionId || 'unknown'}`,
    `note=${params.note || 'none'}`,
    `event_result=${safeJsonStringify(params.eventResult)}`,
  ].join(' | ');

  let user:
    | Awaited<ReturnType<typeof findUserById>>
    | null
    | undefined;

  if (params.userId) {
    try {
      user = await findUserById(params.userId);
    } catch (error) {
      console.warn('[payment-webhook] resolve user for risk notification failed', {
        userId: params.userId,
        eventType: params.eventType,
        error,
      });
    }
  }

  try {
    const notificationResult = await sendErrorNotification({
      email: user?.email || undefined,
      name: user?.name || undefined,
      apiEndpoint: `/api/payment/notify/${params.provider}`,
      apiProvider: params.provider,
      errorCode: 'payment_risk_review_required',
      errorMessage: riskErrorMessage,
      type: 'payment_risk_review_required',
      taskId:
        params.orderNo ||
        params.subscriptionId ||
        params.provider ||
        'payment-risk-review',
    });

    if (notificationResult.code !== 0) {
      console.warn('[payment-webhook] risk feishu notification skipped', {
        provider: params.provider,
        eventType: params.eventType,
        orderNo: params.orderNo,
        subscriptionId: params.subscriptionId,
        result: notificationResult,
      });
    }
  } catch (error) {
    console.warn('[payment-webhook] risk feishu notification failed', {
      provider: params.provider,
      eventType: params.eventType,
      orderNo: params.orderNo,
      subscriptionId: params.subscriptionId,
      error,
    });
  }

  if (recipients.length === 0) {
    return;
  }

  try {
    const emailService = await getEmailService();
    const result = await emailService.sendEmail({
      to: toEmailRecipientField(recipients),
      subject,
      html,
      text,
      replyTo: getSupportEmail(),
      headers: {
        'X-ImageEditorAI-Email': 'payment-webhook-review',
        'X-ImageEditorAI-Provider': params.provider,
      },
    });

    if (!result.success) {
      console.warn('[payment-webhook] send refund/dispute mail failed', {
        provider: params.provider,
        eventType: params.eventType,
        error: result.error || `email send failed via ${result.provider}`,
      });
    }
  } catch (error) {
    console.warn('[payment-webhook] send refund/dispute mail failed', {
      provider: params.provider,
      eventType: params.eventType,
      error,
    });
  }
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function getStripeEventObject(event: PaymentEvent): Record<string, unknown> {
  const eventResult =
    typeof event.eventResult === 'object' && event.eventResult !== null
      ? (event.eventResult as Record<string, unknown>)
      : {};
  const data =
    typeof eventResult.data === 'object' && eventResult.data !== null
      ? (eventResult.data as Record<string, unknown>)
      : null;
  const dataObject =
    data && typeof data.object === 'object' && data.object !== null
      ? (data.object as Record<string, unknown>)
      : null;

  return dataObject || eventResult;
}

function getStripeExpandedId(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'object' && value !== null) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id.trim()) {
      return id.trim();
    }
  }

  return null;
}

function getStripeRiskContext(event: PaymentEvent) {
  const eventObject = getStripeEventObject(event);
  const chargeId =
    getStripeExpandedId(eventObject.charge) ||
    (event.rawEventType === 'charge.refunded'
      ? getStripeExpandedId(eventObject.id)
      : null);
  const paymentIntentId = getStripeExpandedId(eventObject.payment_intent);
  const actionable =
    typeof eventObject.actionable === 'boolean' ? eventObject.actionable : null;
  const isChargeRefundable =
    typeof eventObject.is_charge_refundable === 'boolean'
      ? eventObject.is_charge_refundable
      : null;
  const refunded =
    typeof eventObject.refunded === 'boolean' ? eventObject.refunded : null;
  const amount =
    typeof eventObject.amount === 'number' ? eventObject.amount : null;
  const amountRefunded =
    typeof eventObject.amount_refunded === 'number'
      ? eventObject.amount_refunded
      : null;

  return {
    chargeId,
    paymentIntentId,
    actionable,
    isChargeRefundable,
    refunded,
    amount,
    amountRefunded,
  };
}

function isStripeChargeFullyRefunded(
  riskContext: ReturnType<typeof getStripeRiskContext>
) {
  if (riskContext.refunded === true) {
    return true;
  }

  return (
    riskContext.amount !== null &&
    riskContext.amount > 0 &&
    riskContext.amountRefunded !== null &&
    riskContext.amountRefunded >= riskContext.amount
  );
}

const STRIPE_RISK_EVENT_TYPES = [
  'radar.early_fraud_warning.created',
  'charge.dispute.created',
  'charge.refunded',
] as const;

type StripeRiskEventType = (typeof STRIPE_RISK_EVENT_TYPES)[number];
type StripeRiskReason = 'fraud_warning' | 'dispute' | 'refund';
type StripeRiskPlan = {
  noteParts: string[];
  rawEventType: StripeRiskEventType;
  riskContext: ReturnType<typeof getStripeRiskContext>;
  riskReason: StripeRiskReason;
  subscriptionId: string | null;
};

function resolveStripeRiskReason(
  rawEventType: StripeRiskEventType
): StripeRiskReason {
  switch (rawEventType) {
    case 'radar.early_fraud_warning.created':
      return 'fraud_warning';
    case 'charge.dispute.created':
      return 'dispute';
    case 'charge.refunded':
      return 'refund';
  }
}

function resolveStripeRiskSubscriptionId(params: {
  associations: PaymentWebhookAssociations;
  event: PaymentEvent;
}) {
  const { associations, event } = params;

  return (
    associations.subscriptionId ||
    associations.subscription?.subscriptionId ||
    associations.order?.subscriptionId ||
    event.paymentSession?.subscriptionId ||
    null
  );
}

function buildStripeRiskNoteParts(params: {
  rawEventType: StripeRiskEventType;
  riskContext: ReturnType<typeof getStripeRiskContext>;
}) {
  const { rawEventType, riskContext } = params;
  const noteParts = ['risk_event_received'];

  if (rawEventType === 'radar.early_fraud_warning.created') {
    noteParts.push('risk_type=fraud_warning');
    if (riskContext.actionable !== null) {
      noteParts.push(`actionable=${String(riskContext.actionable)}`);
    }
  } else if (rawEventType === 'charge.dispute.created') {
    noteParts.push('risk_type=dispute');
    if (riskContext.isChargeRefundable !== null) {
      noteParts.push(
        `charge_refundable=${String(riskContext.isChargeRefundable)}`
      );
    }
  } else {
    noteParts.push('risk_type=refund');
    noteParts.push(
      isStripeChargeFullyRefunded(riskContext)
        ? 'refund_scope=full'
        : 'refund_scope=partial'
    );
  }

  if (riskContext.chargeId) {
    noteParts.push(`charge_id=${riskContext.chargeId}`);
  }

  if (riskContext.paymentIntentId) {
    noteParts.push(`payment_intent_id=${riskContext.paymentIntentId}`);
  }

  return noteParts;
}

function resolveStripeRiskPlan(params: {
  associations: PaymentWebhookAssociations;
  event: PaymentEvent;
}): StripeRiskPlan | null {
  const { associations, event } = params;
  const rawEventType = event.rawEventType || '';

  if (
    !STRIPE_RISK_EVENT_TYPES.includes(rawEventType as StripeRiskEventType)
  ) {
    return null;
  }

  const normalizedEventType = rawEventType as StripeRiskEventType;
  const riskContext = getStripeRiskContext(event);

  return {
    rawEventType: normalizedEventType,
    riskReason: resolveStripeRiskReason(normalizedEventType),
    riskContext,
    subscriptionId: resolveStripeRiskSubscriptionId({
      associations,
      event,
    }),
    noteParts: buildStripeRiskNoteParts({
      rawEventType: normalizedEventType,
      riskContext,
    }),
  };
}

function buildStripeRiskPaymentResult(params: {
  eventResult: unknown;
  refundResult: unknown;
}) {
  return params.refundResult === null
    ? params.eventResult ?? null
    : {
        event: params.eventResult,
        refund: params.refundResult,
      };
}

async function cancelLinkedSubscription(params: {
  provider: string;
  subscriptionId: string | null;
  subscriptionNo?: string | null;
  reason: 'fraud_warning' | 'dispute' | 'refund';
}) {
  let providerCanceled = false;

  try {
    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider(params.provider);

    if (paymentProvider?.cancelSubscription && params.subscriptionId) {
      await paymentProvider.cancelSubscription({
        subscriptionId: params.subscriptionId,
      });
      providerCanceled = true;
    }
  } catch (error) {
    console.warn('[payment-webhook] cancel linked subscription failed', {
      provider: params.provider,
      subscriptionId: params.subscriptionId,
      subscriptionNo: params.subscriptionNo,
      reason: params.reason,
      error,
    });
  }

  if (params.subscriptionNo) {
    await updateSubscriptionBySubscriptionNo(params.subscriptionNo, {
      status: SubscriptionStatus.CANCELED,
      canceledAt: new Date(),
      canceledReason: params.reason,
      canceledReasonType: params.reason,
    });
  }

  return providerCanceled;
}

async function refundStripeCharge(params: {
  provider: string;
  chargeId: string | null;
  paymentIntentId: string | null;
  orderNo: string | null;
  subscriptionId: string | null;
}) {
  const paymentService = await getPaymentService();
  const paymentProvider = paymentService.getProvider(params.provider);

  if (!paymentProvider?.refundPayment) {
    throw new Error('payment provider refund is not available');
  }

  return paymentProvider.refundPayment({
    input: {
      chargeId: params.chargeId || undefined,
      paymentIntentId: params.paymentIntentId || undefined,
      reason: 'fraudulent',
      metadata: {
        orderNo: params.orderNo || '',
        subscriptionId: params.subscriptionId || '',
        source: 'payment_webhook',
        trigger: 'radar.early_fraud_warning.created',
      },
    },
  });
}

async function executeStripeRiskMitigation(params: {
  associations: PaymentWebhookAssociations;
  event: PaymentEvent;
  plan: StripeRiskPlan;
  provider: string;
}) {
  const { associations, event, plan, provider } = params;
  const noteParts = [...plan.noteParts];
  let refundResult: unknown = null;
  const shouldAutoMitigate =
    plan.rawEventType === 'radar.early_fraud_warning.created' &&
    plan.riskContext.actionable === true;

  if (shouldAutoMitigate) {
    try {
      refundResult = await refundStripeCharge({
        provider,
        chargeId: plan.riskContext.chargeId,
        paymentIntentId: plan.riskContext.paymentIntentId,
        orderNo: associations.orderNo,
        subscriptionId: plan.subscriptionId,
      });
      noteParts.push('auto_refund_succeeded');
    } catch (error) {
      noteParts.push('auto_refund_failed');
      console.warn('[payment-webhook] stripe auto refund failed', {
        provider,
        rawEventType: plan.rawEventType,
        orderNo: associations.orderNo,
        subscriptionId: plan.subscriptionId,
        error,
      });
    }
  } else {
    noteParts.push('manual_review_required');
  }

  if (associations.orderNo) {
    await updateOrderByOrderNo(associations.orderNo, {
      ...(shouldAutoMitigate ? { status: OrderStatus.FAILED } : null),
      paymentResult: buildStripeRiskPaymentResult({
        eventResult: event.eventResult,
        refundResult,
      }),
    });
  }

  if (shouldAutoMitigate) {
    const providerCanceled = await cancelLinkedSubscription({
      provider,
      subscriptionId: plan.subscriptionId,
      subscriptionNo: associations.subscription?.subscriptionNo || null,
      reason: plan.riskReason,
    });
    if (providerCanceled || associations.subscription?.subscriptionNo) {
      noteParts.push('subscription_canceled');
    }
  } else if (plan.rawEventType === 'charge.refunded') {
    noteParts.push('manual_subscription_review_required');
  }

  if (shouldAutoMitigate) {
    const revokedCredits = associations.orderNo
      ? await revokeUnusedCreditsByOrderNo({
          orderNo: associations.orderNo,
          reason: plan.riskReason,
        })
      : 0;
    noteParts.push(`unused_credits_revoked=${revokedCredits}`);
  } else if (plan.rawEventType === 'charge.refunded') {
    noteParts.push('manual_credit_review_required');
  }

  if (plan.rawEventType === 'charge.refunded') {
    noteParts.push('refund_recorded');
  }

  return {
    noteParts,
    reviewStatus: shouldAutoMitigate
      ? ('AUTO_ACTION_TAKEN' as const)
      : ('MANUAL_REVIEW_REQUIRED' as const),
    subscriptionId: plan.subscriptionId,
  };
}

async function handleStripeRiskWebhookEvent({
  provider,
  event,
  associations,
}: {
  provider: string;
  event: PaymentEvent;
  associations: PaymentWebhookAssociations;
}): Promise<PaymentWebhookHandleResult | null> {
  const plan = resolveStripeRiskPlan({
    associations,
    event,
  });

  if (!plan) {
    return null;
  }

  const { noteParts, reviewStatus, subscriptionId } =
    await executeStripeRiskMitigation({
      associations,
      event,
      plan,
      provider,
    });

  const note = noteParts.join(' | ');

  console.warn('[payment-webhook] stripe risk event handled', {
    provider,
    rawEventType: plan.rawEventType,
    orderNo: associations.orderNo,
    subscriptionId,
    note,
  });

  await sendRefundOrDisputeNotification({
    provider,
    eventType: plan.rawEventType,
    orderNo: associations.orderNo,
    subscriptionId,
    userId: associations.userId,
    eventResult: event.eventResult,
    reviewStatus,
    note,
  });

  return {
    ...associations,
    subscriptionId,
    note,
  };
}

async function notifyOrderChannel(params: {
  provider: string;
  eventType: string;
  email?: string | null;
  name?: string | null;
  amount?: number | null;
  currency?: string | null;
  type: string;
  orderNo?: string | null;
}) {
  try {
    const notificationResult = await sendOrderNotification({
      email: params.email || undefined,
      name: params.name || undefined,
      amount: params.amount || undefined,
      currency: params.currency || undefined,
      type: params.type,
      orderNo: params.orderNo || undefined,
      provider: params.provider,
      eventType: params.eventType,
    });

    if (notificationResult.code !== 0) {
      console.warn('[payment-webhook] order notification skipped', {
        provider: params.provider,
        eventType: params.eventType,
        orderNo: params.orderNo,
        result: notificationResult,
      });
    }
  } catch (error) {
    console.error('[payment-webhook] notification failed', {
      provider: params.provider,
      eventType: params.eventType,
      orderNo: params.orderNo,
      error,
    });
  }
}

export async function handlePaymentWebhookEvent({
  provider,
  event,
  associations: preloadedAssociations,
}: {
  provider: string;
  event: PaymentEvent;
  associations?: PaymentWebhookAssociations;
}): Promise<PaymentWebhookHandleResult> {
  const associations =
    preloadedAssociations ||
    (await resolvePaymentWebhookAssociations({
      provider,
      event,
    }));
  const { order, subscription } = associations;
  const eventType = event.eventType;

  const stripeRiskResult = await handleStripeRiskWebhookEvent({
    provider,
    event,
    associations,
  });
  if (stripeRiskResult) {
    return stripeRiskResult;
  }

  const isRefundLike =
    eventType === PaymentEventType.PAYMENT_REFUNDED ||
    eventType === PaymentEventType.PAYMENT_FAILED;

  if (isRefundLike) {
    if (order?.orderNo) {
      await updateOrderByOrderNo(order.orderNo, {
        status: OrderStatus.FAILED,
        paymentResult: event.eventResult ?? null,
      });
    }

    if (subscription && provider !== 'paypal') {
      const updatePayload =
        eventType === PaymentEventType.PAYMENT_REFUNDED
          ? {
              status: SubscriptionStatus.CANCELED,
              canceledAt: new Date(),
              canceledReasonType: 'refund',
            }
          : {
              status: SubscriptionStatus.PAUSED,
              canceledReasonType: 'dispute',
            };

      await updateSubscriptionBySubscriptionNo(
        subscription.subscriptionNo,
        updatePayload
      );
    }

    await sendRefundOrDisputeNotification({
      provider,
      eventType,
      orderNo: associations.orderNo,
      subscriptionId: associations.subscriptionId,
      userId: associations.userId,
      eventResult: event.eventResult,
      reviewStatus: 'MANUAL_REVIEW_REQUIRED',
      note: null,
    });

    return associations;
  }

  const session = event.paymentSession;
  if (!session) {
    throw new Error('payment session not found');
  }

  if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
    const orderNo = associations.orderNo;
    if (!orderNo) {
      throw new Error('order no not found');
    }

    const existingOrder = order || (await findOrderByOrderNo(orderNo));
    if (!existingOrder) {
      throw new Error('order not found');
    }

    const result = await handleCheckoutSuccess({
      order: existingOrder,
      session,
    });

    const targetUser = await findUserById(existingOrder.userId);
    const typeParts = [
      existingOrder.paymentType,
      session.paymentInfo?.subscriptionCycleType,
    ].filter(Boolean);

    await notifyOrderChannel({
      provider,
      eventType,
      email:
        session.paymentInfo?.paymentEmail ||
        existingOrder.paymentEmail ||
        existingOrder.userEmail ||
        targetUser?.email,
      name:
        session.paymentInfo?.paymentUserName ||
        existingOrder.paymentUserName ||
        targetUser?.name,
      amount:
        session.paymentInfo?.paymentAmount ||
        existingOrder.paymentAmount ||
        existingOrder.amount,
      currency:
        session.paymentInfo?.paymentCurrency ||
        existingOrder.paymentCurrency ||
        existingOrder.currency,
      type: typeParts.join(' | ') || existingOrder.paymentType || 'order',
      orderNo: existingOrder.orderNo,
    });

    await syncGoogleAdsPurchaseConversionForOrder({
      userId: existingOrder.userId,
      order: existingOrder,
      session,
    });

    return {
      orderNo: existingOrder.orderNo,
      subscriptionId:
        result?.subscription?.subscriptionId ||
        existingOrder.subscriptionId ||
        session.subscriptionId ||
        null,
      userId: existingOrder.userId,
    };
  }

  if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
    if (
      session.subscriptionId &&
      session.subscriptionInfo &&
      session.paymentInfo?.subscriptionCycleType ===
        SubscriptionCycleType.RENEWAL
    ) {
      const existingSubscription =
        subscription ||
        (await findSubscriptionByProviderSubscriptionId({
          provider,
          subscriptionId: session.subscriptionId,
        }));

      if (!existingSubscription) {
        return {
          ...associations,
          subscriptionId: session.subscriptionId,
          note: 'subscription not found, skipped (may belong to a different site)',
        };
      }

      const result = await handleSubscriptionRenewal({
        subscription: existingSubscription,
        session,
      });

      const targetUser = await findUserById(existingSubscription.userId);
      const typeParts = [
        'subscription',
        existingSubscription.interval,
        session.paymentInfo?.subscriptionCycleType,
      ].filter(Boolean);

      await notifyOrderChannel({
        provider,
        eventType,
        email:
          session.paymentInfo?.paymentEmail ||
          existingSubscription.userEmail ||
          targetUser?.email,
        name: session.paymentInfo?.paymentUserName || targetUser?.name,
        amount:
          session.paymentInfo?.paymentAmount ||
          existingSubscription.amount ||
          undefined,
        currency:
          session.paymentInfo?.paymentCurrency ||
          existingSubscription.currency ||
          undefined,
        type: typeParts.join(' | ') || 'subscription',
        orderNo:
          (result as { order?: { orderNo?: string | null } } | null)?.order
            ?.orderNo || existingSubscription.subscriptionNo,
      });

      return {
        orderNo:
          (result as { order?: { orderNo?: string | null } } | null)?.order
            ?.orderNo || null,
        subscriptionId: existingSubscription.subscriptionId,
        userId: existingSubscription.userId,
      };
    }

    return {
      ...associations,
      note: 'payment success event skipped because it is not a renewal',
    };
  }

  if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
    if (!session.subscriptionId || !session.subscriptionInfo) {
      throw new Error('subscription id or subscription info not found');
    }

    const existingSubscription =
      subscription ||
      (await findSubscriptionByProviderSubscriptionId({
        provider,
        subscriptionId: session.subscriptionId,
      }));

    if (!existingSubscription) {
      return {
        ...associations,
        subscriptionId: session.subscriptionId,
        note: 'subscription not ready, skipped',
      };
    }

    await handleSubscriptionUpdated({
      subscription: existingSubscription,
      session,
    });

    return {
      ...associations,
      subscriptionId: existingSubscription.subscriptionId,
      userId: existingSubscription.userId,
    };
  }

  if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
    if (!session.subscriptionId || !session.subscriptionInfo) {
      throw new Error('subscription id or subscription info not found');
    }

    const existingSubscription =
      subscription ||
      (await findSubscriptionByProviderSubscriptionId({
        provider,
        subscriptionId: session.subscriptionId,
      }));

    if (!existingSubscription) {
      return {
        ...associations,
        subscriptionId: session.subscriptionId,
        note: 'subscription not ready, skipped',
      };
    }

    await handleSubscriptionCanceled({
      subscription: existingSubscription,
      session,
    });

    return {
      ...associations,
      subscriptionId: existingSubscription.subscriptionId,
      userId: existingSubscription.userId,
    };
  }

  return {
    ...associations,
    note: `event type ignored: ${eventType}`,
  };
}
