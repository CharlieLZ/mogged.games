import { SeedanceProviderRequestError } from '../errors';
import {
  SEEDANCE_DEFAULT_EXECUTION_EXPIRES_AFTER_SECONDS,
  SeedanceProviderAdapter,
  SeedanceRequest,
} from '../types';
import { buildSeedanceTaskInfo, mapVolcengineStatus } from '../utils';

type VolcengineCreateResponse = {
  id?: string;
  error?: {
    code?: number | string;
    message?: string;
    type?: string;
  } | null;
};

type VolcengineQueryResponse = {
  id?: string;
  model?: string;
  status?: string;
  content?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  error?: {
    code?: number | string;
    message?: string;
    type?: string;
  } | null;
  created_at?: number;
  updated_at?: number;
  seed?: number;
  resolution?: string;
  ratio?: string;
  duration?: number;
  framespersecond?: number;
  service_tier?: string;
  execution_expires_after?: number;
  generate_audio?: boolean;
  draft?: boolean;
};

export type VolcengineSeedanceAdapterOptions = {
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
function getModel(request: SeedanceRequest) {
  return request.fast
    ? 'doubao-seedance-2-0-fast-260128'
    : 'doubao-seedance-2-0-260128';
}

function buildContent(request: SeedanceRequest) {
  const content: Array<Record<string, unknown>> = [];

  if (request.prompt.trim()) {
    content.push({
      type: 'text',
      text: request.prompt,
    });
  }

  if (request.scene === 'image-to-video') {
    if (request.imageUrls[0]) {
      content.push({
        type: 'image_url',
        image_url: {
          url: request.imageUrls[0],
        },
        role: 'first_frame',
      });
    }

    if (request.imageUrls[1]) {
      content.push({
        type: 'image_url',
        image_url: {
          url: request.imageUrls[1],
        },
        role: 'last_frame',
      });
    }

    return content;
  }

  if (request.scene === 'reference-to-video') {
    for (const url of request.imageUrls) {
      content.push({
        type: 'image_url',
        image_url: {
          url,
        },
        role: 'reference_image',
      });
    }

    for (const url of request.videoUrls) {
      content.push({
        type: 'video_url',
        video_url: {
          url,
        },
        role: 'reference_video',
      });
    }

    for (const url of request.audioUrls) {
      content.push({
        type: 'audio_url',
        audio_url: {
          url,
        },
        role: 'reference_audio',
      });
    }
  }

  return content;
}

function buildPayload(request: SeedanceRequest, callbackUrl?: string) {
  const payload: Record<string, unknown> = {
    model: getModel(request),
    content: buildContent(request),
    execution_expires_after:
      request.executionExpiresAfter ??
      SEEDANCE_DEFAULT_EXECUTION_EXPIRES_AFTER_SECONDS,
    generate_audio: request.generateAudio,
    ratio: request.aspectRatio === 'auto' ? 'adaptive' : request.aspectRatio,
    resolution: request.resolution,
    duration: request.duration,
    watermark: request.watermark ?? false,
  };

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  if (request.returnLastFrame) {
    payload.return_last_frame = true;
  }

  if (request.webSearch) {
    payload.tools = [{ type: 'web_search' }];
  }

  if (request.seed !== undefined) {
    payload.seed = request.seed;
  }

  if (request.safetyIdentifier) {
    payload.safety_identifier = request.safetyIdentifier;
  }

  return payload;
}

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T & Record<
    string,
    unknown
  >;
}

function toRequestErrorMessage(
  prefix: string,
  response: Response,
  payload: {
    error?: {
      code?: number | string;
      message?: string;
    } | null;
    message?: unknown;
  }
) {
  return `${prefix}: ${
    payload.error?.message ||
    (typeof payload.message === 'string' ? payload.message : undefined) ||
    response.statusText ||
    'request failed'
  }`;
}

export class VolcengineSeedanceAdapter implements SeedanceProviderAdapter {
  readonly provider = 'volcengine' as const;

  constructor(private readonly options: VolcengineSeedanceAdapterOptions = {}) {}

  private getBaseUrl() {
    return (this.options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  private getCreateUrl() {
    return `${this.getBaseUrl()}/contents/generations/tasks`;
  }

  private getStatusUrl(taskId: string) {
    return `${this.getCreateUrl()}/${encodeURIComponent(taskId)}`;
  }

  async generate(input: {
    apiKey: string;
    request: SeedanceRequest;
    callbackUrl?: string;
  }) {
    const response = await fetch(this.getCreateUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPayload(input.request, input.callbackUrl)),
    });

    const payload = await parseJson<VolcengineCreateResponse>(response);
    if (!response.ok || !payload.id) {
      throw new SeedanceProviderRequestError(
        toRequestErrorMessage('Volcengine generate failed', response, payload),
        {
          httpStatus: response.status,
          apiEndpoint: this.getCreateUrl(),
          provider: this.provider,
          stage: 'generate',
        }
      );
    }

    return {
      provider: this.provider,
      model: getModel(input.request),
      result: {
        taskId: payload.id,
        taskStatus: mapVolcengineStatus('queued'),
        taskInfo: {
          status: 'queued',
          createTime: new Date(),
          responseUrl: this.getCreateUrl(),
          statusUrl: this.getStatusUrl(payload.id),
        },
        taskResult: payload,
      },
    };
  }

  async query(input: { apiKey: string; taskId: string; model?: string }) {
    const statusUrl = this.getStatusUrl(input.taskId);
    const response = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
      },
    });

    const payload = await parseJson<VolcengineQueryResponse>(response);
    if (!response.ok || !payload.id) {
      throw new SeedanceProviderRequestError(
        toRequestErrorMessage('Volcengine query failed', response, payload),
        {
          httpStatus: response.status,
          apiEndpoint: statusUrl,
          provider: this.provider,
          stage: 'query',
        }
      );
    }

    const taskStatus = mapVolcengineStatus(payload.status);
    const taskInfo = await buildSeedanceTaskInfo({
      provider: this.provider,
      taskId: input.taskId,
      taskStatus,
      payload: payload.content || payload,
      status: payload.status,
      errorCode:
        payload.error?.code !== undefined
          ? String(payload.error.code)
          : undefined,
      errorMessage: payload.error?.message,
      createTime: payload.created_at,
      responseUrl: statusUrl,
      statusUrl,
    });

    return {
      taskId: input.taskId,
      taskStatus,
      taskInfo,
      taskResult: payload,
    };
  }
}
