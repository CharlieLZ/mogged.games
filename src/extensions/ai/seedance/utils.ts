import { AITaskInfo, AITaskStatus } from '@/extensions/ai/types';
import {
  createImageItemsFromUrls,
  createVideoItemsFromUrls,
  detectMediaTypeFromUrl,
  extractResultUrls,
} from '@/extensions/ai/provider-utils';

import { SeedanceProviderName } from './types';

export function parseJsonRecord(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function mapApixoStatus(state?: string | null) {
  switch ((state || '').toLowerCase()) {
    case 'success':
      return AITaskStatus.SUCCESS;
    case 'failed':
      return AITaskStatus.FAILED;
    case 'processing':
    case 'processing_r2':
      return AITaskStatus.PROCESSING;
    case 'pending':
    default:
      return AITaskStatus.PENDING;
  }
}

export function mapApimartStatus(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return AITaskStatus.SUCCESS;
    case 'failed':
      return AITaskStatus.FAILED;
    case 'cancelled':
    case 'canceled':
      return AITaskStatus.CANCELED;
    case 'processing':
      return AITaskStatus.PROCESSING;
    case 'pending':
    case 'submitted':
    default:
      return AITaskStatus.PENDING;
  }
}

export function mapEvoLinkStatus(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return AITaskStatus.SUCCESS;
    case 'failed':
      return AITaskStatus.FAILED;
    case 'cancelled':
    case 'canceled':
      return AITaskStatus.CANCELED;
    case 'processing':
      return AITaskStatus.PROCESSING;
    case 'pending':
    default:
      return AITaskStatus.PENDING;
  }
}

export function mapVolcengineStatus(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'succeeded':
      return AITaskStatus.SUCCESS;
    case 'failed':
    case 'expired':
      return AITaskStatus.FAILED;
    case 'cancelled':
    case 'canceled':
      return AITaskStatus.CANCELED;
    case 'running':
      return AITaskStatus.PROCESSING;
    case 'queued':
    default:
      return AITaskStatus.PENDING;
  }
}

export async function buildSeedanceTaskInfo(input: {
  provider: SeedanceProviderName;
  taskId: string;
  taskStatus: AITaskStatus;
  payload?: unknown;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  createTime?: number | string | Date | null;
  responseUrl?: string;
  statusUrl?: string;
}) {
  const urls = extractResultUrls(input.payload);
  const imageUrls = urls.filter(
    (url) => detectMediaTypeFromUrl(url) === 'image'
  );
  const videoUrls = urls.filter(
    (url) => detectMediaTypeFromUrl(url) === 'video'
  );

  const taskInfo: AITaskInfo = {
    images:
      input.taskStatus === AITaskStatus.SUCCESS && imageUrls.length > 0
        ? await createImageItemsFromUrls({
            providerName: input.provider,
            taskId: input.taskId,
            urls: imageUrls,
          })
        : undefined,
    videos:
      input.taskStatus === AITaskStatus.SUCCESS && videoUrls.length > 0
        ? await createVideoItemsFromUrls({
            providerName: input.provider,
            taskId: input.taskId,
            urls: videoUrls,
          })
        : undefined,
    status: input.status,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    responseUrl: input.responseUrl,
    statusUrl: input.statusUrl,
  };

  if (input.createTime instanceof Date) {
    taskInfo.createTime = input.createTime;
  } else if (typeof input.createTime === 'number') {
    taskInfo.createTime = new Date(
      input.createTime > 1_000_000_000_000
        ? input.createTime
        : input.createTime * 1000
    );
  } else if (typeof input.createTime === 'string' && input.createTime.trim()) {
    taskInfo.createTime = new Date(input.createTime);
  }

  return taskInfo;
}
