import { AITaskStatus } from '@/extensions/ai/types';

import { SeedanceProviderRequestError } from '../errors';
import { SeedanceProviderAdapter, SeedanceRequest } from '../types';
import { buildSeedanceTaskInfo, parseJsonRecord } from '../utils';

type KIEGenerateResponse = {
  code?: number;
  msg?: string;
  message?: string;
  data?: {
    taskId?: string;
    status?: string;
  };
};

type KIEStatusResponse = {
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

export type KIEAdapterOptions = {
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'https://api.kie.ai';

function getModel(request: SeedanceRequest) {
  return request.fast ? 'bytedance/seedance-2-fast' : 'bytedance/seedance-2';
}

function mapStatus(state?: string | null) {
  switch ((state || '').toLowerCase()) {
    case 'success':
      return 'success';
    case 'fail':
    case 'failed':
      return 'failed';
    case 'generating':
    case 'running':
    case 'processing':
      return 'processing';
    case 'waiting':
    case 'queued':
    default:
      return 'pending';
  }
}

function toAITaskStatus(state?: string | null) {
  switch (mapStatus(state)) {
    case 'success':
      return AITaskStatus.SUCCESS;
    case 'failed':
      return AITaskStatus.FAILED;
    case 'processing':
      return AITaskStatus.PROCESSING;
    default:
      return AITaskStatus.PENDING;
  }
}

function buildInput(request: SeedanceRequest) {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    generate_audio: request.generateAudio,
    resolution: request.resolution,
    aspect_ratio: request.aspectRatio,
    duration: request.duration,
    web_search: request.webSearch,
  };

  if (request.returnLastFrame) {
    input.return_last_frame = true;
  }

  if (request.scene === 'image-to-video') {
    input.first_frame_url = request.imageUrls[0];
    if (request.imageUrls[1]) {
      input.last_frame_url = request.imageUrls[1];
    }
  }

  if (request.scene === 'reference-to-video') {
    if (request.imageUrls.length > 0) {
      input.reference_image_urls = request.imageUrls;
    }
    if (request.videoUrls.length > 0) {
      input.reference_video_urls = request.videoUrls;
    }
    if (request.audioUrls.length > 0) {
      input.reference_audio_urls = request.audioUrls;
    }
  }

  return input;
}

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T &
    Record<string, unknown>;
}

export class KIESeedanceAdapter implements SeedanceProviderAdapter {
  readonly provider = 'kie' as const;

  constructor(private readonly options: KIEAdapterOptions = {}) {}

  private getBaseUrl() {
    return (this.options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  private getCreateUrl() {
    return `${this.getBaseUrl()}/api/v1/jobs/createTask`;
  }

  private getStatusUrl(taskId: string) {
    return `${this.getBaseUrl()}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;
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
      body: JSON.stringify({
        model: getModel(input.request),
        callBackUrl: input.callbackUrl,
        input: buildInput(input.request),
      }),
    });

    const payload = await parseJson<KIEGenerateResponse>(response);
    if (!response.ok || payload.code !== 200) {
      throw new SeedanceProviderRequestError(
        `KIE generate failed: ${
          payload.msg ||
          payload.message ||
          response.statusText ||
          'request failed'
        }`,
        {
          httpStatus: response.status,
          apiEndpoint: this.getCreateUrl(),
          provider: this.provider,
          stage: 'generate',
        }
      );
    }

    const taskId = payload.data?.taskId;
    if (!taskId) {
      throw new SeedanceProviderRequestError(
        'KIE generate failed: taskId missing',
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
        taskId,
        taskStatus: toAITaskStatus(payload.data?.status),
        taskInfo: {
          status: payload.data?.status || 'waiting',
          createTime: new Date(),
          responseUrl: this.getCreateUrl(),
          statusUrl: this.getStatusUrl(taskId),
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

    const payload = await parseJson<KIEStatusResponse>(response);
    if (!response.ok || payload.code !== 200) {
      throw new SeedanceProviderRequestError(
        `KIE query failed: ${
          payload.msg ||
          payload.message ||
          response.statusText ||
          'request failed'
        }`,
        {
          httpStatus: response.status,
          apiEndpoint: statusUrl,
          provider: this.provider,
          stage: 'query',
        }
      );
    }

    const data = payload.data || {};
    const taskStatus = toAITaskStatus(data.state);
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
