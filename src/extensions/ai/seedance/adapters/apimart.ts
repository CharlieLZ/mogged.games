import { SeedanceProviderRequestError } from '../errors';
import { SeedanceProviderAdapter, SeedanceRequest } from '../types';
import { buildSeedanceTaskInfo, mapApimartStatus } from '../utils';

type APIMartGenerateResponse = {
  code?: number;
  message?: string;
  data?: Array<{
    status?: string;
    task_id?: string;
  }>;
};

type APIMartStatusResponse = {
  code?: number;
  message?: string;
  data?: {
    id?: string;
    status?: string;
    progress?: number;
    result?: Record<string, unknown>;
    error?: {
      code?: number | string;
      message?: string;
      type?: string;
    };
    created?: number;
    completed?: number;
    estimated_time?: number;
    actual_time?: number;
  };
};

export type APIMartAdapterOptions = {
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'https://api.apimart.ai';

function getModel(request: SeedanceRequest) {
  return request.fast ? 'doubao-seedance-2.0-fast' : 'doubao-seedance-2.0';
}

function buildPayload(request: SeedanceRequest, callbackUrl?: string) {
  const payload: Record<string, unknown> = {
    model: getModel(request),
    prompt: request.prompt,
    resolution: request.resolution,
    size: request.aspectRatio === 'auto' ? 'adaptive' : request.aspectRatio,
    duration: request.duration,
    generate_audio: request.generateAudio,
  };

  if (request.seed !== undefined) {
    payload.seed = request.seed;
  }

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  if (request.returnLastFrame) {
    payload.return_last_frame = true;
  }

  if (request.webSearch) {
    payload.tools = [{ type: 'web_search' }];
  }

  if (request.scene === 'image-to-video') {
    if (request.imageUrls.length === 1) {
      payload.image_urls = request.imageUrls;
    } else {
      payload.image_with_roles = request.imageUrls.map((url, index) => ({
        url,
        role: index === 0 ? 'first_frame' : 'last_frame',
      }));
    }
  }

  if (request.scene === 'reference-to-video') {
    if (request.imageUrls.length > 0) {
      payload.image_urls = request.imageUrls;
    }
    if (request.videoUrls.length > 0) {
      payload.video_urls = request.videoUrls;
    }
    if (request.audioUrls.length > 0) {
      payload.audio_urls = request.audioUrls;
    }
  }

  return payload;
}

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T & Record<string, unknown>;
}

export class APIMartSeedanceAdapter implements SeedanceProviderAdapter {
  readonly provider = 'apimart' as const;

  constructor(private readonly options: APIMartAdapterOptions = {}) {}

  private getBaseUrl() {
    return (this.options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  async generate(input: {
    apiKey: string;
    request: SeedanceRequest;
    callbackUrl?: string;
  }) {
    const response = await fetch(`${this.getBaseUrl()}/v1/videos/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPayload(input.request, input.callbackUrl)),
    });

    const payload = await parseJson<APIMartGenerateResponse>(response);
    if (!response.ok || payload.code !== 200) {
      throw new SeedanceProviderRequestError(
        `APIMart generate failed: ${
          payload.message || response.statusText || 'request failed'
        }`
      );
    }

    const taskId = payload.data?.[0]?.task_id;
    if (!taskId) {
      throw new SeedanceProviderRequestError(
        'APIMart generate failed: task_id missing'
      );
    }

    return {
      provider: this.provider,
      model: getModel(input.request),
      result: {
        taskId,
        taskStatus: mapApimartStatus(payload.data?.[0]?.status),
        taskInfo: {
          status: payload.data?.[0]?.status || 'submitted',
          createTime: new Date(),
        },
        taskResult: payload,
      },
    };
  }

  async query(input: { apiKey: string; taskId: string; model?: string }) {
    const response = await fetch(
      `${this.getBaseUrl()}/v1/tasks/${encodeURIComponent(
        input.taskId
      )}?language=en`,
      {
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
        },
      }
    );

    const payload = await parseJson<APIMartStatusResponse>(response);
    if (!response.ok || payload.code !== 200) {
      throw new SeedanceProviderRequestError(
        `APIMart query failed: ${
          payload.message || response.statusText || 'request failed'
        }`
      );
    }

    const data = payload.data || {};
    const taskStatus = mapApimartStatus(data.status);
    const taskInfo = await buildSeedanceTaskInfo({
      provider: this.provider,
      taskId: input.taskId,
      taskStatus,
      payload: data.result || data,
      status: data.status,
      errorCode:
        data.error?.code !== undefined ? String(data.error.code) : undefined,
      errorMessage: data.error?.message,
      createTime: data.created,
    });

    return {
      taskId: input.taskId,
      taskStatus,
      taskInfo,
      taskResult: payload,
    };
  }
}
