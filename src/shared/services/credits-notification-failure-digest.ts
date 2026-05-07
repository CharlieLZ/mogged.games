import 'server-only';

import { sendErrorNotification } from '@/extensions/notification';

export const CREDITS_NOTIFICATION_FAILURE_DIGEST_WINDOW_MS = 5 * 60 * 1000;

const SAMPLE_LIMIT = 5;

type CreditsNotificationFailureDigestInput = {
  channel?: string;
  source?: string;
  subjectType?: 'account' | 'guest' | string;
  scene?: string;
  taskId?: string;
  providerTaskId?: string;
  guestIdHash?: string;
  quotaUnits?: number;
  result?: {
    code?: number;
    msg?: string;
    httpStatus?: number;
  };
  error?: unknown;
};

type CreditsNotificationFailureBucket = {
  key: string;
  channel: string;
  source: string;
  subjectType: string;
  reasonCode: string;
  reasonMessage: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  count: number;
  totalQuotaUnits: number;
  scenes: string[];
  taskIds: string[];
  providerTaskIds: string[];
  guestIdHashes: string[];
  timer: ReturnType<typeof setTimeout>;
};

const failureBuckets = new Map<string, CreditsNotificationFailureBucket>();

export function queueCreditsNotificationFailureDigest(
  input: CreditsNotificationFailureDigestInput
) {
  const channel = normalizeText(input.channel) || 'saas-credits';
  const source = normalizeText(input.source) || 'unknown';
  const subjectType = normalizeText(input.subjectType) || 'unknown';
  const reasonCode = resolveReasonCode(input);
  const reasonMessage = resolveReasonMessage(input);
  const key = [channel, reasonCode, reasonMessage].join('|');
  const now = new Date();
  const existing = failureBuckets.get(key);

  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = now;
    existing.totalQuotaUnits += normalizeQuotaUnits(input.quotaUnits);
    appendUniqueSample(existing.scenes, input.scene);
    appendUniqueSample(existing.taskIds, input.taskId);
    appendUniqueSample(existing.providerTaskIds, input.providerTaskId);
    appendUniqueSample(existing.guestIdHashes, input.guestIdHash);
    return;
  }

  const timer = setTimeout(() => {
    void flushCreditsNotificationFailureDigest(key);
  }, CREDITS_NOTIFICATION_FAILURE_DIGEST_WINDOW_MS);
  timer.unref?.();

  failureBuckets.set(key, {
    key,
    channel,
    source,
    subjectType,
    reasonCode,
    reasonMessage,
    firstSeenAt: now,
    lastSeenAt: now,
    count: 1,
    totalQuotaUnits: normalizeQuotaUnits(input.quotaUnits),
    scenes: collectSample(input.scene),
    taskIds: collectSample(input.taskId),
    providerTaskIds: collectSample(input.providerTaskId),
    guestIdHashes: collectSample(input.guestIdHash),
    timer,
  });
}

async function flushCreditsNotificationFailureDigest(key: string) {
  const bucket = failureBuckets.get(key);
  if (!bucket) {
    return;
  }

  failureBuckets.delete(key);
  clearTimeout(bucket.timer);

  const errorMessage = truncate(
    [
      `suppressed=${bucket.count}`,
      `channel=${bucket.channel}`,
      `source=${bucket.source}`,
      `subject=${bucket.subjectType}`,
      `reason=${bucket.reasonMessage}`,
    ].join(' '),
    600
  );

  const prompt = truncate(
    [
      `window_ms=${CREDITS_NOTIFICATION_FAILURE_DIGEST_WINDOW_MS}`,
      `quota_units=${bucket.totalQuotaUnits}`,
      `first_seen=${bucket.firstSeenAt.toISOString()}`,
      `last_seen=${bucket.lastSeenAt.toISOString()}`,
      `scenes=${formatSample(bucket.scenes)}`,
      `task_ids=${formatSample(bucket.taskIds)}`,
      `provider_task_ids=${formatSample(bucket.providerTaskIds)}`,
      `guest_hashes=${formatSample(bucket.guestIdHashes)}`,
    ].join(' '),
    800
  );

  try {
    const result = await sendErrorNotification({
      apiEndpoint: `feishu.${bucket.channel}`,
      apiProvider: 'feishu',
      errorCode: bucket.reasonCode,
      errorMessage,
      prompt,
      type: 'credits_notification_digest',
      taskId: bucket.taskIds[0] || bucket.providerTaskIds[0] || '-',
    });

    if (result.code !== 0) {
      console.warn(
        '[credits-notification-failure-digest] summary send skipped',
        {
          bucket: serializeBucket(bucket),
          result,
        }
      );
    }
  } catch (error) {
    console.error('[credits-notification-failure-digest] summary send failed', {
      bucket: serializeBucket(bucket),
      error,
    });
  }
}

function resolveReasonCode(
  input: CreditsNotificationFailureDigestInput
): string {
  if (
    typeof input.result?.code === 'number' &&
    Number.isFinite(input.result.code)
  ) {
    return String(input.result.code);
  }

  if (input.result?.httpStatus) {
    return `http_${input.result.httpStatus}`;
  }

  if (input.error instanceof Error && input.error.name.trim()) {
    return input.error.name.trim();
  }

  return 'unknown_failure';
}

function resolveReasonMessage(
  input: CreditsNotificationFailureDigestInput
): string {
  const message =
    normalizeText(input.result?.msg) ||
    (input.error instanceof Error ? normalizeText(input.error.message) : '') ||
    normalizeText(
      input.error !== undefined && input.error !== null
        ? String(input.error)
        : undefined
    ) ||
    'unknown error';

  return truncate(message.replace(/\s+/g, ' '), 160);
}

function normalizeText(value?: string | null): string {
  return value?.trim() || '';
}

function normalizeQuotaUnits(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function collectSample(value?: string | null): string[] {
  const normalized = normalizeText(value);
  return normalized ? [normalized] : [];
}

function appendUniqueSample(target: string[], value?: string | null) {
  const normalized = normalizeText(value);
  if (
    !normalized ||
    target.includes(normalized) ||
    target.length >= SAMPLE_LIMIT
  ) {
    return;
  }

  target.push(normalized);
}

function formatSample(values: string[]): string {
  return values.length > 0 ? values.join(',') : '-';
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function serializeBucket(bucket: CreditsNotificationFailureBucket) {
  return {
    key: bucket.key,
    channel: bucket.channel,
    source: bucket.source,
    subjectType: bucket.subjectType,
    reasonCode: bucket.reasonCode,
    count: bucket.count,
    totalQuotaUnits: bucket.totalQuotaUnits,
    firstSeenAt: bucket.firstSeenAt.toISOString(),
    lastSeenAt: bucket.lastSeenAt.toISOString(),
    scenes: bucket.scenes,
    taskIds: bucket.taskIds,
    providerTaskIds: bucket.providerTaskIds,
    guestIdHashes: bucket.guestIdHashes,
  };
}

export function resetCreditsNotificationFailureDigestForTest() {
  for (const bucket of failureBuckets.values()) {
    clearTimeout(bucket.timer);
  }

  failureBuckets.clear();
}
