import type { PaymentEvent } from '@/extensions/payment/types';

export const PAYMENT_WEBHOOK_SOURCE = 'payment';

export type PaymentWebhookReferences = {
  orderNo: string | null;
  subscriptionId: string | null;
};

function getEventDataObject(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  const nestedData =
    typeof value.data === 'object' && value.data !== null
      ? (value.data as Record<string, unknown>)
      : null;
  const nestedObject =
    nestedData && typeof nestedData.object === 'object' && nestedData.object
      ? (nestedData.object as Record<string, unknown>)
      : null;

  if (nestedObject) {
    return nestedObject;
  }

  if (typeof value.object === 'object' && value.object !== null) {
    return value.object as Record<string, unknown>;
  }

  if (typeof value.resource === 'object' && value.resource !== null) {
    return value.resource as Record<string, unknown>;
  }

  return {};
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function resolveMetadataValue(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const normalized = normalizeText(metadata[key], 128);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

async function digestToHex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
}

export function serializeWebhookPayload(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({
      fallback: String(value),
    });
  }
}

export async function resolvePaymentWebhookEventId(
  provider: string,
  event: PaymentEvent
): Promise<string> {
  const explicitEventId = normalizeText(event.eventId, 191);
  if (explicitEventId) {
    return explicitEventId;
  }

  const eventResult = event.eventResult as Record<string, unknown> | null;
  const inferredEventId =
    normalizeText(eventResult?.id, 191) ||
    normalizeText(eventResult?.eventId, 191);

  if (inferredEventId) {
    return inferredEventId;
  }

  const payloadHash = await digestToHex(
    `${provider}:${event.rawEventType || event.eventType}:${serializeWebhookPayload(event.eventResult)}`
  );
  return `fallback_${payloadHash}`;
}

export function resolvePaymentWebhookReferences(
  event: PaymentEvent
): PaymentWebhookReferences {
  const eventResult = (event.eventResult || {}) as Record<string, unknown>;
  const eventObject = getEventDataObject(eventResult);
  const sessionMetadata =
    (event.paymentSession?.metadata as Record<string, unknown> | undefined) ||
    undefined;
  const eventMetadata =
    (eventResult.metadata as Record<string, unknown> | undefined) || undefined;
  const objectMetadata =
    (eventObject.metadata as Record<string, unknown> | undefined) || undefined;

  const orderNo =
    resolveMetadataValue(sessionMetadata, 'order_no', 'orderNo') ||
    resolveMetadataValue(objectMetadata, 'order_no', 'orderNo') ||
    resolveMetadataValue(eventMetadata, 'order_no', 'orderNo') ||
    null;

  const objectSubscription =
    (eventObject.subscription as Record<string, unknown> | undefined) ||
    undefined;
  const subscriptionId =
    normalizeText(event.paymentSession?.subscriptionId, 191) ||
    normalizeText(objectSubscription?.id, 191) ||
    normalizeText(eventObject.subscription_id, 191) ||
    normalizeText(eventObject.subscriptionId, 191) ||
    null;

  return {
    orderNo,
    subscriptionId,
  };
}
