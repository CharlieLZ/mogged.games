import { SeedanceProviderRequestError } from '../errors';
import { SeedanceProviderAdapter, SeedanceRequest } from '../types';
import { buildSeedanceTaskInfo, mapEvoLinkStatus } from '../utils';

type EvoLinkGenerateResponse = {
  created?: number;
  id?: string;
  model?: string;
  object?: string;
  progress?: number;
  status?: string;
  task_info?: {
    can_cancel?: boolean;
    estimated_time?: number;
    video_duration?: number;
  };
  type?: string;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

type EvoLinkStatusResponse = EvoLinkGenerateResponse & {
  results?: string[];
};

export type EvoLinkAdapterOptions = {
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'https://api.evolink.ai';

function getModel(request: SeedanceRequest) {
  const prefix = request.fast ? 'seedance-2.0-fast' : 'seedance-2.0';
  switch (request.scene) {
    case 'text-to-video':
      return `${prefix}-text-to-video`;
    case 'image-to-video':
      return `${prefix}-image-to-video`;
    case 'reference-to-video':
      return `${prefix}-reference-to-video`;
  }
}

function buildPayload(request: SeedanceRequest, callbackUrl?: string) {
  const payload: Record<string, unknown> = {
    model: getModel(request),
    prompt: request.prompt,
    duration: request.duration,
    quality: request.resolution,
    aspect_ratio: request.aspectRatio === 'auto' ? 'adaptive' : request.aspectRatio,
    generate_audio: request.generateAudio,
    web_search: request.webSearch,
  };

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  if (request.scene === 'image-to-video') {
    payload.image_urls = request.imageUrls;
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

export class EvoLinkSeedanceAdapter implements SeedanceProviderAdapter {
  readonly provider = 'evolink' as const;

  constructor(private readonly options: EvoLinkAdapterOptions = {}) {}

  private getBaseUrl() {
    return (this.options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  async generate(input: {
    apiKey: string;
    request: SeedanceRequest;
    callbackUrl?: string;
  }) {
    const model = getModel(input.request);
    const response = await fetch(`${this.getBaseUrl()}/v1/videos/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPayload(input.request, input.callbackUrl)),
    });

    const payload = await parseJson<EvoLinkGenerateResponse>(response);
    if (!response.ok || !payload.id) {
      throw new SeedanceProviderRequestError(
        `EvoLink generate failed: ${
          payload.error?.message || response.statusText || 'request failed'
        }`
      );
    }

    return {
      provider: this.provider,
      model,
      result: {
        taskId: payload.id,
        taskStatus: mapEvoLinkStatus(payload.status),
        taskInfo: {
          status: payload.status || 'pending',
          createTime: payload.created
            ? new Date(payload.created * 1000)
            : new Date(),
        },
        taskResult: payload,
      },
    };
  }

  async query(input: { apiKey: string; taskId: string; model?: string }) {
    const response = await fetch(
      `${this.getBaseUrl()}/v1/tasks/${encodeURIComponent(input.taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
        },
      }
    );

    const payload = await parseJson<EvoLinkStatusResponse>(response);
    if (!response.ok || !payload.id) {
      throw new SeedanceProviderRequestError(
        `EvoLink query failed: ${
          payload.error?.message || response.statusText || 'request failed'
        }`
      );
    }

    const taskStatus = mapEvoLinkStatus(payload.status);
    const taskInfo = await buildSeedanceTaskInfo({
      provider: this.provider,
      taskId: input.taskId,
      taskStatus,
      payload: payload.results || payload,
      status: payload.status,
      errorCode: payload.error?.code,
      errorMessage: payload.error?.message,
      createTime: payload.created,
    });

    return {
      taskId: input.taskId,
      taskStatus,
      taskInfo,
      taskResult: payload,
    };
  }
}
