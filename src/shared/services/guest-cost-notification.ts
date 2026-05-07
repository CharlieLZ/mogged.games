import 'server-only';

import { sendCreditsNotification } from '@/extensions/notification';
import type { GuestAITask } from '@/shared/models/guest_ai_task';

import { queueCreditsNotificationFailureDigest } from './credits-notification-failure-digest';
import type { GuestViewer } from './guest-viewer';

type GuestQuotaSnapshot = {
  limit?: number;
  used?: number;
  remaining?: number;
} | null;

function getPreferredLocaleFromAcceptLanguage(value?: string | null) {
  const firstToken = value?.split(',')[0]?.trim();
  return firstToken || undefined;
}

export async function notifyGuestCreditsConsumed({
  task,
  viewer,
  quotaAfter,
  request,
  domain,
}: {
  task: Pick<
    GuestAITask,
    | 'id'
    | 'createdAt'
    | 'scene'
    | 'mediaType'
    | 'provider'
    | 'model'
    | 'providerTaskId'
    | 'quotaUnits'
    | 'quotaStatus'
  >;
  viewer: Pick<GuestViewer, 'id' | 'name' | 'guestIdHash' | 'countryCode'>;
  quotaAfter?: GuestQuotaSnapshot;
  request?: Request;
  domain?: string;
}) {
  try {
    const userAgent = request?.headers.get('user-agent') || undefined;
    const locale = getPreferredLocaleFromAcceptLanguage(
      request?.headers.get('accept-language')
    );
    const notificationResult = await sendCreditsNotification({
      domain,
      name: viewer.name,
      userId: viewer.id,
      amount: -Math.max(0, task.quotaUnits || 0),
      transactionType: 'guest_consume',
      scene: task.scene,
      description: `Guest ${task.mediaType} generation`,
      transactionNo: task.providerTaskId || task.id,
      creditId: task.id,
      relatedTaskId: task.id,
      metadataType: 'guest-ai-task',
      metadataKeys: [
        'quotaUnits',
        'quotaStatus',
        'provider',
        'model',
        'providerTaskId',
      ],
      source: 'guest_ai_generate',
      locale,
      countryCode: viewer.countryCode || undefined,
      userAgent,
      occurredAt: task.createdAt || new Date(),
      subjectType: 'guest',
      guestIdHash: viewer.guestIdHash,
      providerTaskId: task.providerTaskId || undefined,
      quotaLimit: quotaAfter?.limit,
      quotaUsed: quotaAfter?.used,
      quotaRemaining: quotaAfter?.remaining,
    });

    if (notificationResult.code !== 0) {
      queueCreditsNotificationFailureDigest({
        channel: 'saas-credits',
        source: 'guest_ai_generate',
        subjectType: 'guest',
        scene: task.scene,
        taskId: task.id,
        providerTaskId: task.providerTaskId || undefined,
        guestIdHash: viewer.guestIdHash,
        quotaUnits: task.quotaUnits,
        result: {
          code: notificationResult.code,
          msg: notificationResult.msg,
          httpStatus: notificationResult.httpStatus,
        },
      });
      console.warn('[guest-cost-notification] credits notification skipped', {
        guestIdHash: viewer.guestIdHash,
        taskId: task.id,
        providerTaskId: task.providerTaskId,
        result: notificationResult,
      });
    }
  } catch (error) {
    queueCreditsNotificationFailureDigest({
      channel: 'saas-credits',
      source: 'guest_ai_generate',
      subjectType: 'guest',
      scene: task.scene,
      taskId: task.id,
      providerTaskId: task.providerTaskId || undefined,
      guestIdHash: viewer.guestIdHash,
      quotaUnits: task.quotaUnits,
      error,
    });
    console.error('[guest-cost-notification] send failed', {
      guestIdHash: viewer.guestIdHash,
      taskId: task.id,
      providerTaskId: task.providerTaskId,
      error,
    });
  }
}
