import { AITaskResult } from '@/extensions/ai/types';

import { SeedanceProviderRequestError } from '../errors';
import { SeedanceProviderAdapter, SeedanceRequest } from '../types';
import { buildSeedanceTaskInfo, mapApixoStatus, parseJsonRecord } from '../utils';

type APIXOGenerateResponse = {
  code?: number;
  message?: string;
  data?: {
    taskId?: string;
  };
};

type APIXOStatusResponse = {
  code?: number;
  message?: string;
  data?: {
    taskId?: string;
    state?: string;
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
    createTime?: number;
    completeTime?: number;
    costTime?: number;
  };
};

export type APIXOAdapterOptions = {
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'https://api.apixo.ai';

function getModel(request: SeedanceRequest) {
  return request.fast ? 'seedance-2-0-fast' : 'seedance-2-0';
}

function getMode(scene: SeedanceRequest['scene']) {
  switch (scene) {
    case 'text-to-video':
      return 'text-to-video';
    case 'image-to-video':
      return 'first_and_last_frames';
    case 'reference-to-video':
      return 'omni_reference';
  }
}

function buildInput(request: SeedanceRequest) {
  const input: Record<string, unknown> = {
    mode: getMode(request.scene),
    prompt: request.prompt,
    resolution: request.resolution,
    duration: request.duration,
    aspect_ratio: request.aspectRatio,
    sound: request.generateAudio,
    web_search: request.webSearch,
  };

  if (request.scene === 'image-to-video') {
    input.image_urls = request.imageUrls;
  }

  if (request.scene === 'reference-to-video') {
    if (request.imageUrls.length > 0) {
      input.image_urls = request.imageUrls;
    }
    if (request.videoUrls.length > 0) {
      input.video_urls = request.videoUrls;
    }
    if (request.audioUrls.length > 0) {
      input.audio_urls = request.audioUrls;
    }
  }

  return input;
}

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T & Record<string, unknown>;
}

function getErrorMessage(payload: Record<string, unknown>, fallback: string) {
  return (
    (typeof payload.message === 'string' && payload.message) ||
    (typeof payload.error === 'string' && payload.error) ||
    fallback
  );
}

export class APIXOSeedanceAdapter implements SeedanceProviderAdapter {
  readonly provider = 'apixo' as const;

  constructor(private readonly options: APIXOAdapterOptions = {}) {}

  private getBaseUrl() {
    return (this.options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  async generate(input: {
    apiKey: string;
    request: SeedanceRequest;
    callbackUrl?: string;
  }) {
    const model = getModel(input.request);
    const response = await fetch(
      `${this.getBaseUrl()}/api/v1/generateTask/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_type: input.callbackUrl ? 'callback' : 'async',
          callback_url: input.callbackUrl,
          provider: 'official',
          input: buildInput(input.request),
        }),
      }
    );

    const payload = await parseJson<APIXOGenerateResponse>(response);
    if (!response.ok || payload.code !== 200) {
      throw new SeedanceProviderRequestError(
        `APIXO generate failed: ${getErrorMessage(
          payload,
          response.statusText || 'request failed'
        )}`
      );
    }

    const taskId = payload.data?.taskId;
    if (!taskId) {
      throw new SeedanceProviderRequestError(
        'APIXO generate failed: taskId missing'
      );
    }

    const result: AITaskResult = {
      taskId,
      taskStatus: mapApixoStatus('pending'),
      taskInfo: {
        status: 'pending',
        createTime: new Date(),
      },
      taskResult: payload,
    };

    return {
      provider: this.provider,
      model,
      result,
    };
  }

  async query(input: { apiKey: string; taskId: string; model?: string }) {
    const model = input.model?.trim();
    if (!model) {
      throw new SeedanceProviderRequestError('APIXO query requires model');
    }

    const response = await fetch(
      `${this.getBaseUrl()}/api/v1/statusTask/${model}?taskId=${encodeURIComponent(
        input.taskId
      )}`,
      {
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
        },
      }
    );

    const payload = await parseJson<APIXOStatusResponse>(response);
    if (!response.ok || payload.code !== 200) {
      throw new SeedanceProviderRequestError(
        `APIXO query failed: ${getErrorMessage(
          payload,
          response.statusText || 'request failed'
        )}`
      );
    }

    const data = payload.data || {};
    const taskStatus = mapApixoStatus(data.state);
    const parsedResultJson = parseJsonRecord(data.resultJson);
    const taskInfo = await buildSeedanceTaskInfo({
      provider: this.provider,
      taskId: input.taskId,
      taskStatus,
      payload: parsedResultJson || data,
      status: data.state,
      errorCode: data.failCode,
      errorMessage: data.failMsg,
      createTime: data.createTime,
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
