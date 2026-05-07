import { AIMediaType } from '@/extensions/ai/types';
import { FalProvider } from '@/extensions/ai/fal';

import {
  SeedanceProviderConfigError,
  SeedanceProviderRequestError,
} from '../errors';
import { SeedanceProviderAdapter, SeedanceRequest } from '../types';

type FalModelKey =
  | 'text'
  | 'image'
  | 'reference'
  | 'fastText'
  | 'fastImage'
  | 'fastReference';

export type FalSeedanceAdapterOptions = {
  baseUrl?: string;
  models?: Partial<Record<FalModelKey, string>>;
};

function resolveModel(
  request: SeedanceRequest,
  models: Partial<Record<FalModelKey, string>> | undefined
) {
  const key: FalModelKey = request.fast
    ? request.scene === 'text-to-video'
      ? 'fastText'
      : request.scene === 'image-to-video'
        ? 'fastImage'
        : 'fastReference'
    : request.scene === 'text-to-video'
      ? 'text'
      : request.scene === 'image-to-video'
        ? 'image'
        : 'reference';

  return models?.[key];
}

function buildOptions(request: SeedanceRequest) {
  const options: Record<string, unknown> = {
    duration: request.duration,
    resolution: request.resolution,
    aspect_ratio: request.aspectRatio,
    generate_audio: request.generateAudio,
    web_search: request.webSearch,
  };

  if (request.scene === 'image-to-video') {
    options.image_url = request.imageUrls[0];
    if (request.imageUrls[1]) {
      options.last_frame_url = request.imageUrls[1];
    }
  }

  if (request.scene === 'reference-to-video') {
    if (request.imageUrls.length > 0) {
      options.image_urls = request.imageUrls;
    }
    if (request.videoUrls.length > 0) {
      options.video_urls = request.videoUrls;
    }
    if (request.audioUrls.length > 0) {
      options.audio_urls = request.audioUrls;
    }
  }

  return options;
}

export class FalSeedanceAdapter implements SeedanceProviderAdapter {
  readonly provider = 'fal' as const;

  constructor(private readonly options: FalSeedanceAdapterOptions = {}) {}

  async generate(input: {
    apiKey: string;
    request: SeedanceRequest;
    callbackUrl?: string;
  }) {
    const model = resolveModel(input.request, this.options.models);
    if (!model) {
      throw new SeedanceProviderConfigError(
        'FAL Seedance 2.0 endpoint ids are not configured. Keep this provider disabled until explicit model ids are set.'
      );
    }

    try {
      const provider = new FalProvider({
        apiKey: input.apiKey,
        baseUrl: this.options.baseUrl,
      });

      const result = await provider.generate({
        params: {
          mediaType: AIMediaType.VIDEO,
          model,
          prompt: input.request.prompt,
          options: buildOptions(input.request),
          callbackUrl: input.callbackUrl,
          async: true,
        },
      });

      return {
        provider: this.provider,
        model,
        result,
      };
    } catch (error) {
      throw new SeedanceProviderRequestError(
        error instanceof Error ? error.message : 'FAL generate failed'
      );
    }
  }

  async query(input: { apiKey: string; taskId: string; model?: string }) {
    if (!input.model) {
      throw new SeedanceProviderRequestError('FAL query requires model');
    }

    try {
      const provider = new FalProvider({
        apiKey: input.apiKey,
        baseUrl: this.options.baseUrl,
      });

      return await provider.query({
        taskId: input.taskId,
        model: input.model,
      });
    } catch (error) {
      throw new SeedanceProviderRequestError(
        error instanceof Error ? error.message : 'FAL query failed'
      );
    }
  }
}
