import {
  createImageItemsFromUrls,
  extractResultUrls,
} from '@/extensions/ai/provider-utils';
import { AITaskInfo, AITaskResult, AITaskStatus } from '@/extensions/ai/types';
import type { Configs } from '@/shared/models/config';

import { buildKieMarketCreateInput } from './model-input';
import {
  getKieImageModel,
  KIE_MARKET_PROVIDER,
  type KieImageGenerateResult,
  type KieImageRequest,
} from './types';

type KieCreateResponse = {
  code?: number;
  msg?: string;
  message?: string;
  data?: {
    taskId?: string;
    status?: string;
  };
};

type KieStatusResponse = {
  code?: number;
  msg?: string;
  message?: string;
  data?: {
    taskId?: string;
    state?: string;
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
    createTime?: number;
    completeTime?: number;
  };
};

const DEFAULT_BASE_URL = 'https://api.kie.ai';
const RETRYABLE_STATUS_CODES = new Set([
  408, 409, 425, 429, 500, 502, 503, 504,
]);
const MAX_ATTEMPTS = 2;

class KieRequestError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = 'KieRequestError';
  }
}

function mapStatus(state?: string | null) {
  switch ((state || '').toLowerCase()) {
    case 'success':
      return AITaskStatus.SUCCESS;
    case 'fail':
    case 'failed':
      return AITaskStatus.FAILED;
    case 'generating':
    case 'running':
    case 'processing':
      return AITaskStatus.PROCESSING;
    case 'waiting':
    case 'queued':
    default:
      return AITaskStatus.PENDING;
  }
}

function isRetryableError(status?: number) {
  return typeof status === 'number' && RETRYABLE_STATUS_CODES.has(status);
}

function isRetryableRequestError(error: unknown) {
  if (error instanceof KieRequestError) {
    return error.retryable;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return error instanceof Error && error.name === 'AbortError';
}

function parseJsonRecord(value: unknown) {
  if (!value || typeof value !== 'string') {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T &
    Record<string, unknown>;
}

async function buildKieTaskInfo(input: {
  taskId: string;
  taskStatus: AITaskStatus;
  payload?: unknown;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  createTime?: number | null;
  responseUrl?: string;
  statusUrl?: string;
}): Promise<AITaskInfo> {
  const urls = extractResultUrls(input.payload);

  return {
    images:
      input.taskStatus === AITaskStatus.SUCCESS && urls.length > 0
        ? await createImageItemsFromUrls({
            providerName: KIE_MARKET_PROVIDER,
            taskId: input.taskId,
            urls,
          })
        : undefined,
    status: input.status,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    createTime:
      typeof input.createTime === 'number'
        ? new Date(
            input.createTime > 1_000_000_000_000
              ? input.createTime
              : input.createTime * 1000
          )
        : undefined,
    responseUrl: input.responseUrl,
    statusUrl: input.statusUrl,
  };
}

export class KieImageService {
  constructor(private readonly configs: Configs) {}

  private getApiKey(tier?: 'free' | 'paid') {
    if (tier === 'free' && this.configs.kie_api_key_free?.trim()) {
      return this.configs.kie_api_key_free.trim();
    }
    if (tier === 'paid' && this.configs.kie_api_key_paid?.trim()) {
      return this.configs.kie_api_key_paid.trim();
    }
    return this.configs.kie_api_key?.trim();
  }

  private getBaseUrl() {
    return (this.configs.kie_api_base_url?.trim() || DEFAULT_BASE_URL).replace(
      /\/+$/,
      ''
    );
  }

  private getCreateUrl() {
    return `${this.getBaseUrl()}/api/v1/jobs/createTask`;
  }

  private getStatusUrl(taskId: string) {
    return `${this.getBaseUrl()}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;
  }

  private assertConfigured(tier?: 'free' | 'paid') {
    if (!this.getApiKey(tier)) {
      throw new Error(
        'KIE provider is not configured. Set KIE_API_KEY_TEST / KIE_API_KEY_FREE / KIE_API_KEY_PAID or save the KIE API Keys in admin settings.'
      );
    }
  }

  private async requestJson<T>(
    url: string,
    init: RequestInit,
    label: string,
    tier?: 'free' | 'paid'
  ): Promise<T & Record<string, unknown>> {
    this.assertConfigured(tier);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, init);
        const payload = await readJson<T>(response);

        if (!response.ok) {
          const message =
            (typeof payload.msg === 'string' ? payload.msg : undefined) ||
            (typeof payload.message === 'string'
              ? payload.message
              : undefined) ||
            response.statusText ||
            `${label} request failed`;
          const error = new KieRequestError(
            message,
            isRetryableError(response.status)
          );
          if (attempt < MAX_ATTEMPTS && error.retryable) {
            lastError = error;
            continue;
          }
          throw error;
        }

        return payload;
      } catch (error) {
        const nextError =
          error instanceof Error ? error : new Error(String(error));
        lastError = nextError;

        if (attempt >= MAX_ATTEMPTS || !isRetryableRequestError(nextError)) {
          throw nextError;
        }
      }
    }

    throw lastError || new Error(`${label} failed`);
  }

  async generate(input: {
    request: KieImageRequest;
    tier?: 'free' | 'paid';
  }): Promise<KieImageGenerateResult> {
    const apiKey = this.getApiKey(input.tier);
    const model =
      input.request.model?.trim() || getKieImageModel(input.request.scene);
    const payload = await this.requestJson<KieCreateResponse>(
      this.getCreateUrl(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: buildKieMarketCreateInput(input.request),
        }),
      },
      'KIE image generate',
      input.tier
    );

    if (payload.code !== 200 || !payload.data?.taskId) {
      throw new Error(
        payload.msg || payload.message || 'KIE image generate failed'
      );
    }

    const taskId = payload.data.taskId;

    return {
      provider: KIE_MARKET_PROVIDER,
      model,
      result: {
        taskId,
        taskStatus: mapStatus(payload.data.status),
        taskInfo: {
          status: payload.data.status || 'waiting',
          createTime: new Date(),
          responseUrl: this.getCreateUrl(),
          statusUrl: this.getStatusUrl(taskId),
        },
        taskResult: payload,
      },
    };
  }

  async query(input: {
    taskId: string;
    tier?: 'free' | 'paid';
  }): Promise<AITaskResult> {
    const apiKey = this.getApiKey(input.tier);
    const statusUrl = this.getStatusUrl(input.taskId);
    const payload = await this.requestJson<KieStatusResponse>(
      statusUrl,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
      'KIE image query',
      input.tier
    );

    if (payload.code !== 200) {
      throw new Error(
        payload.msg || payload.message || 'KIE image query failed'
      );
    }

    const data = payload.data || {};
    const parsedResultJson = parseJsonRecord(data.resultJson);
    const taskStatus = mapStatus(data.state);
    const taskInfo = await buildKieTaskInfo({
      taskId: input.taskId,
      taskStatus,
      payload: parsedResultJson || data,
      status: data.state,
      errorCode: data.failCode,
      errorMessage: data.failMsg,
      createTime: data.createTime,
      responseUrl: statusUrl,
      statusUrl,
    });

    return {
      taskId: input.taskId,
      taskStatus,
      taskInfo,
      taskResult: {
        ...payload,
        data: {
          ...data,
          parsedResultJson,
        },
      },
    };
  }
}
