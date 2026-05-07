import { sendErrorNotification } from '@/extensions/notification';
import { rateLimit } from '@/shared/lib/api/rate-limit';
import {
  PAYMENT_WEBHOOK_SOURCE,
  resolvePaymentWebhookEventId,
  serializeWebhookPayload,
} from '@/shared/lib/payment-webhook';
import { resolveRequestContext } from '@/shared/lib/request-context';
import { findUserById } from '@/shared/models/user';
import {
  claimWebhookEvent,
  markWebhookEventFailed,
  markWebhookEventProcessed,
} from '@/shared/models/webhook_event';
import {
  handlePaymentWebhookEvent,
  resolvePaymentWebhookAssociations,
} from '@/shared/services/payment-webhook';
import { getPaymentService } from '@/shared/services/payment';

const paymentWebhookLimiter = rateLimit({
  uniqueTokenPerInterval: 180,
  interval: 60 * 1000,
});

function getWebhookErrorStatus(error: unknown): number {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error);

  if (
    message.includes('invalid webhook request') ||
    message.includes('invalid webhook payload') ||
    message.includes('missing webhook payload') ||
    message.includes('provider is required')
  ) {
    return 400;
  }

  if (message.includes('invalid webhook signature')) {
    return 401;
  }

  if (message.includes('not configured')) {
    return 500;
  }

  return 500;
}

async function notifyWebhookProcessingError({
  provider,
  apiEndpoint,
  eventId,
  relatedReferences,
  error,
}: {
  provider?: string | null;
  apiEndpoint: string;
  eventId?: string | null;
  relatedReferences?: {
    orderNo: string | null;
    subscriptionId: string | null;
    userId: string | null;
  } | null;
  error: unknown;
}) {
  let user:
    | Awaited<ReturnType<typeof findUserById>>
    | null
    | undefined;

  if (relatedReferences?.userId) {
    try {
      user = await findUserById(relatedReferences.userId);
    } catch (lookupError) {
      console.warn('[payment-webhook] failed to resolve user for error notification', {
        userId: relatedReferences.userId,
        lookupError,
      });
    }
  }

  const errorMessage =
    error instanceof Error ? error.message : 'webhook processing failed';
  const details = [
    errorMessage,
    eventId ? `event_id=${eventId}` : null,
    relatedReferences?.orderNo ? `order_no=${relatedReferences.orderNo}` : null,
    relatedReferences?.subscriptionId
      ? `subscription_id=${relatedReferences.subscriptionId}`
      : null,
  ].filter(Boolean);

  try {
    const notificationResult = await sendErrorNotification({
      email: user?.email || undefined,
      name: user?.name || undefined,
      apiEndpoint,
      apiProvider: provider || undefined,
      errorCode: 'payment_webhook_failed',
      errorMessage: details.join(' | '),
      type: 'payment_webhook_failed',
      taskId:
        relatedReferences?.orderNo ||
        eventId ||
        relatedReferences?.subscriptionId ||
        provider ||
        'payment-webhook',
    });

    if (notificationResult.code !== 0) {
      console.warn('[payment-webhook] error notification skipped', {
        provider,
        eventId,
        relatedReferences,
        result: notificationResult,
      });
    }
  } catch (notifyError) {
    console.error('[payment-webhook] error notification failed', {
      provider,
      eventId,
      relatedReferences,
      notifyError,
    });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  let eventIdentity:
    | {
        provider: string;
        eventId: string;
      }
    | null = null;
  let relatedReferences:
    | {
        orderNo: string | null;
        subscriptionId: string | null;
        userId: string | null;
      }
    | null = null;
  let webhookAttemptId: string | null = null;
  let providerName: string | null = null;
  let requestPath = '/api/payment/notify/[provider]';

  try {
    const { provider } = await params;
    providerName = provider;
    if (!provider) {
      throw new Error('provider is required');
    }

    const requestContext = resolveRequestContext(req.headers, {
      path: `/api/payment/notify/${provider}`,
    });
    requestPath = requestContext.path || requestPath;
    const rate = await paymentWebhookLimiter(
      `payment-webhook:${provider}:${requestContext.ipAddress}`
    );
    if (!rate.success) {
      return Response.json(
        {
          message: 'too many webhook requests',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rate.limit.toString(),
            'X-RateLimit-Remaining': rate.remaining.toString(),
            'X-RateLimit-Reset': new Date(rate.reset).toISOString(),
          },
        }
      );
    }

    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider(provider);
    if (!paymentProvider) {
      throw new Error('payment provider not found');
    }

    const event = await paymentProvider.getPaymentEvent({ req });
    if (!event?.eventType) {
      throw new Error('payment event not found');
    }

    const eventId = await resolvePaymentWebhookEventId(provider, event);
    const associations = await resolvePaymentWebhookAssociations({
      provider,
      event,
    });
    eventIdentity = {
      provider,
      eventId,
    };
    relatedReferences = {
      orderNo: associations.orderNo,
      subscriptionId: associations.subscriptionId,
      userId: associations.userId,
    };

    const claimResult = await claimWebhookEvent({
      source: PAYMENT_WEBHOOK_SOURCE,
      provider,
      eventId,
      eventType: event.eventType,
      rawEventType: event.rawEventType,
      payload: serializeWebhookPayload(event.eventResult),
      requestContext,
      relatedUserId: relatedReferences.userId,
      relatedOrderNo: relatedReferences.orderNo,
      relatedSubscriptionId: relatedReferences.subscriptionId,
    });
    webhookAttemptId = claimResult.attempt?.id || null;

    if (claimResult.status === 'already_processed') {
      return Response.json({
        message: 'success',
        deduped: true,
      });
    }

    if (claimResult.status === 'already_processing') {
      return Response.json(
        {
          message: 'event is already processing',
        },
        {
          status: 409,
        }
      );
    }

    const handled = await handlePaymentWebhookEvent({
      provider,
      event,
      associations,
    });

    await markWebhookEventProcessed({
      source: PAYMENT_WEBHOOK_SOURCE,
      provider,
      eventId,
      attemptId: webhookAttemptId,
      relatedUserId: handled.userId || relatedReferences.userId,
      relatedOrderNo: handled.orderNo || relatedReferences.orderNo,
      relatedSubscriptionId:
        handled.subscriptionId || relatedReferences.subscriptionId,
    });

    return Response.json({
      message: handled.note || 'success',
    });
  } catch (error) {
    console.error('[payment-webhook] handle payment notify failed', error);

    if (eventIdentity) {
      await markWebhookEventFailed({
        source: PAYMENT_WEBHOOK_SOURCE,
        provider: eventIdentity.provider,
        eventId: eventIdentity.eventId,
        attemptId: webhookAttemptId,
        relatedUserId: relatedReferences?.userId,
        relatedOrderNo: relatedReferences?.orderNo,
        relatedSubscriptionId: relatedReferences?.subscriptionId,
        errorMessage:
          error instanceof Error ? error.message : 'webhook processing failed',
        errorStack: error instanceof Error ? error.stack : null,
      }).catch((markError) =>
        console.error('[payment-webhook] failed to mark webhook failed', {
          eventIdentity,
          markError,
        })
      );
    }

    await notifyWebhookProcessingError({
      provider: eventIdentity?.provider || providerName,
      apiEndpoint: requestPath,
      eventId: eventIdentity?.eventId,
      relatedReferences,
      error,
    });

    return Response.json(
      {
        message:
          error instanceof Error
            ? `handle payment notify failed: ${error.message}`
            : 'handle payment notify failed',
      },
      {
        status: getWebhookErrorStatus(error),
      }
    );
  }
}
