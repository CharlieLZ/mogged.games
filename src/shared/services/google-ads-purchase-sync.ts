import 'server-only';

import { uploadClickConversion } from '@/extensions/ads/google-ads-api';
import {
  convertMinorUnitsToGoogleAdsValue,
  formatGoogleAdsConversionDateTime,
  pickGoogleAdsClickIdentifier,
  resolveGoogleAdsConfigs,
} from '@/shared/lib/google-ads';
import { getAllConfigs } from '@/shared/models/config';
import {
  claimGoogleAdsPurchaseUpload,
  markGoogleAdsPurchaseUploadFailed,
  markGoogleAdsPurchaseUploadUploaded,
} from '@/shared/models/google-ads-purchase-upload';
import { Order } from '@/shared/models/order';
import { safeRecordUserContextEvent } from '@/shared/models/user_context_event';

type SyncInput = {
  userId: string;
  order: Order;
  session?: {
    paymentInfo?: {
      paymentAmount?: number | null;
      paymentCurrency?: string | null;
      paidAt?: Date | string | null;
    } | null;
  } | null;
};

type SyncResult =
  | { status: 'uploaded'; jobId?: number }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

const RETRY_DELAYS_MS = [0, 250, 750];

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractOrderAttribution(order: Order) {
  if (!isRecord(order.checkoutInfo)) {
    return null;
  }

  const attribution = order.checkoutInfo.attribution;
  if (!isRecord(attribution)) {
    return null;
  }

  return {
    gclid: trimString(attribution.gclid),
    gbraid: trimString(attribution.gbraid),
    wbraid: trimString(attribution.wbraid),
  };
}

function countGoogleClickIdentifiers(
  attribution: ReturnType<typeof extractOrderAttribution>
) {
  if (!attribution) {
    return 0;
  }

  return [
    attribution.gclid,
    attribution.gbraid,
    attribution.wbraid,
  ].filter(Boolean).length;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function shouldRetry(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return status === 429 || (typeof status === 'number' && status >= 500);
}

function sleep(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordUploadEvent(params: {
  userId: string;
  eventType: string;
  orderNo: string;
  metadata?: Record<string, unknown>;
}) {
  await safeRecordUserContextEvent({
    userId: params.userId,
    eventType: params.eventType,
    metadata: {
      orderNo: params.orderNo,
      ...(params.metadata || {}),
    },
  });
}

export async function syncGoogleAdsPurchaseConversionForOrder(
  input: SyncInput
): Promise<SyncResult> {
  const configs = await getAllConfigs();
  const googleAdsConfigs = resolveGoogleAdsConfigs(configs);
  if (!googleAdsConfigs.enabled) {
    const result = { status: 'skipped' as const, reason: 'ads_tracking_disabled' };
    await recordUploadEvent({
      userId: input.userId,
      orderNo: input.order.orderNo,
      eventType: 'google_ads_purchase_upload_skipped',
      metadata: result,
    });
    return result;
  }

  if (googleAdsConfigs.purchaseTrackingMode !== 'server') {
    return {
      status: 'skipped',
      reason: 'browser_purchase_tracking',
    };
  }

  const conversionActionId = trimString(
    configs.google_ads_purchase_upload_conversion_action_id
  );
  if (!conversionActionId) {
    const result = {
      status: 'skipped' as const,
      reason: 'purchase_upload_action_missing',
    };
    await recordUploadEvent({
      userId: input.userId,
      orderNo: input.order.orderNo,
      eventType: 'google_ads_purchase_upload_skipped',
      metadata: result,
    });
    return result;
  }

  const attribution = extractOrderAttribution(input.order);
  const clickIdentifierCount = countGoogleClickIdentifiers(attribution);
  const clickIdentifier = pickGoogleAdsClickIdentifier({
    gclid: attribution?.gclid,
    gbraid: attribution?.gbraid,
    wbraid: attribution?.wbraid,
  });

  if (!clickIdentifier) {
    const result = {
      status: 'skipped' as const,
      reason:
        clickIdentifierCount > 1
          ? 'ambiguous_click_identifier'
          : 'missing_click_identifier',
    };
    await recordUploadEvent({
      userId: input.userId,
      orderNo: input.order.orderNo,
      eventType: 'google_ads_purchase_upload_skipped',
      metadata: result,
    });
    return result;
  }

  const value = convertMinorUnitsToGoogleAdsValue(
    input.session?.paymentInfo?.paymentAmount ??
      input.order.paymentAmount ??
      input.order.amount,
    input.session?.paymentInfo?.paymentCurrency ??
      input.order.paymentCurrency ??
      input.order.currency
  );
  const currencyCode = trimString(
    input.session?.paymentInfo?.paymentCurrency ??
      input.order.paymentCurrency ??
      input.order.currency
  ).toUpperCase();

  if (value === undefined || !currencyCode) {
    const result = {
      status: 'skipped' as const,
      reason: 'missing_conversion_value',
    };
    await recordUploadEvent({
      userId: input.userId,
      orderNo: input.order.orderNo,
      eventType: 'google_ads_purchase_upload_skipped',
      metadata: result,
    });
    return result;
  }

  const paidAt =
    parseDate(input.session?.paymentInfo?.paidAt) ||
    parseDate(input.order.paidAt) ||
    new Date();
  const claim = await claimGoogleAdsPurchaseUpload({
    userId: input.userId,
    orderNo: input.order.orderNo,
    conversionActionId,
    clickIdentifierType: clickIdentifier.type,
  });

  if (claim.status === 'already_uploaded') {
    const result = {
      status: 'skipped' as const,
      reason: 'already_uploaded',
    };
    await recordUploadEvent({
      userId: input.userId,
      orderNo: input.order.orderNo,
      eventType: 'google_ads_purchase_upload_skipped',
      metadata: result,
    });
    return result;
  }

  if (claim.status === 'already_processing') {
    const result = {
      status: 'skipped' as const,
      reason: 'upload_in_progress',
    };
    await recordUploadEvent({
      userId: input.userId,
      orderNo: input.order.orderNo,
      eventType: 'google_ads_purchase_upload_skipped',
      metadata: result,
    });
    return result;
  }

  let lastError: unknown = null;
  for (const delayMs of RETRY_DELAYS_MS) {
    await sleep(delayMs);

    try {
      const response = await uploadClickConversion({
        customerId: trimString(configs.google_ads_customer_id),
        loginCustomerId: trimString(configs.google_ads_login_customer_id),
        developerToken: trimString(configs.google_ads_developer_token),
        clientId: trimString(configs.google_ads_client_id),
        clientSecret: trimString(configs.google_ads_client_secret),
        refreshToken: trimString(configs.google_ads_refresh_token),
        conversionActionId,
        conversionValue: value,
        currencyCode,
        conversionDateTime: formatGoogleAdsConversionDateTime(paidAt),
        orderId: input.order.orderNo,
        [clickIdentifier.type]: clickIdentifier.value,
      });

      await recordUploadEvent({
        userId: input.userId,
        orderNo: input.order.orderNo,
        eventType: 'google_ads_purchase_upload_uploaded',
        metadata: {
          clickIdentifierType: clickIdentifier.type,
          conversionActionId,
          jobId: response.jobId,
        },
      });
      await markGoogleAdsPurchaseUploadUploaded({
        orderNo: input.order.orderNo,
        jobId: response.jobId,
      });

      return {
        status: 'uploaded',
        jobId: response.jobId,
      };
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error)) {
        break;
      }
    }
  }

  const result = {
    status: 'failed' as const,
    reason:
      lastError instanceof Error && trimString(lastError.message)
        ? lastError.message
        : 'google_ads_upload_failed',
  };
  await markGoogleAdsPurchaseUploadFailed({
    orderNo: input.order.orderNo,
    errorMessage: result.reason,
  });
  await recordUploadEvent({
    userId: input.userId,
    orderNo: input.order.orderNo,
    eventType: 'google_ads_purchase_upload_failed',
    metadata: {
      ...result,
      clickIdentifierType: clickIdentifier.type,
      conversionActionId,
    },
  });

  console.error('[google-ads] purchase upload failed', {
    orderNo: input.order.orderNo,
    userId: input.userId,
    clickIdentifierType: clickIdentifier.type,
    conversionActionId,
    error: lastError,
  });

  return result;
}
