import { AIMediaType } from '@/extensions/ai/types';
import { ReplicateProvider } from '@/extensions/ai/replicate';

import { SeedanceProviderRequestError } from '../errors';
import { SeedanceProviderAdapter, SeedanceRequest } from '../types';

export type ReplicateSeedanceAdapterOptions = {
  standardModel?: string;
  fastModel?: string;
};

const DEFAULT_STANDARD_MODEL = 'bytedance/seedance-2.0';
const DEFAULT_FAST_MODEL = 'bytedance/seedance-2.0-fast';

function buildOptions(request: SeedanceRequest) {
  const options: Record<string, unknown> = {
    duration: request.duration,
    resolution: request.resolution,
    aspect_ratio: request.aspectRatio,
    generate_audio: request.generateAudio,
  };

  if (request.scene === 'image-to-video') {
    options.first_frame_url = request.imageUrls[0];
    if (request.imageUrls[1]) {
      options.last_frame_url = request.imageUrls[1];
    }
  }

  if (request.scene === 'reference-to-video') {
    if (request.imageUrls.length > 0) {
      options.reference_image_urls = request.imageUrls;
    }
    if (request.videoUrls.length > 0) {
      options.reference_video_urls = request.videoUrls;
    }
    if (request.audioUrls.length > 0) {
      options.reference_audio_urls = request.audioUrls;
    }
  }

  return options;
}

export class ReplicateSeedanceAdapter implements SeedanceProviderAdapter {
  readonly provider = 'replicate' as const;

  constructor(private readonly options: ReplicateSeedanceAdapterOptions = {}) {}

  private getModel(request: SeedanceRequest) {
    if (request.fast) {
      return this.options.fastModel || DEFAULT_FAST_MODEL;
    }

    return this.options.standardModel || DEFAULT_STANDARD_MODEL;
  }

  async generate(input: {
    apiKey: string;
    request: SeedanceRequest;
    callbackUrl?: string;
  }) {
    try {
      const provider = new ReplicateProvider({
        apiToken: input.apiKey,
      });

      const model = this.getModel(input.request);
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
        error instanceof Error ? error.message : 'Replicate generate failed'
      );
    }
  }

  async query(input: { apiKey: string; taskId: string; model?: string }) {
    try {
      const provider = new ReplicateProvider({
        apiToken: input.apiKey,
      });

      return await provider.query({
        taskId: input.taskId,
        model: input.model,
      });
    } catch (error) {
      throw new SeedanceProviderRequestError(
        error instanceof Error ? error.message : 'Replicate query failed'
      );
    }
  }
}
