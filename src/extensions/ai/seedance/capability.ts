import {
  SeedanceProviderName,
  SeedanceRequest,
} from './types';
import { SeedanceValidationError } from './errors';
import { getReferenceMediaUrlExtension } from '@/shared/lib/reference-media-url';

export type SeedanceProviderCapability = {
  supportsFast: boolean;
  supportsScenes: SeedanceRequest['scene'][];
  supportsWebSearch: boolean;
  supportsReturnLastFrame: boolean;
  maxImages: number;
  maxVideos: number;
  maxAudios: number;
  supportedReferenceVideoExtensions?: readonly string[];
};

export const SEEDANCE_PROVIDER_CAPABILITIES: Record<
  SeedanceProviderName,
  SeedanceProviderCapability
> = {
  volcengine: {
    supportsFast: true,
    supportsScenes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    supportsWebSearch: true,
    supportsReturnLastFrame: true,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
    supportedReferenceVideoExtensions: ['.mp4', '.mov', '.m4v'],
  },
  apixo: {
    supportsFast: true,
    supportsScenes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    supportsWebSearch: true,
    supportsReturnLastFrame: false,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
    supportedReferenceVideoExtensions: ['.mp4', '.mov', '.m4v'],
  },
  apimart: {
    supportsFast: true,
    supportsScenes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    supportsWebSearch: true,
    supportsReturnLastFrame: true,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
    supportedReferenceVideoExtensions: ['.mp4', '.mov', '.m4v'],
  },
  evolink: {
    supportsFast: true,
    supportsScenes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    supportsWebSearch: true,
    supportsReturnLastFrame: false,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
  fal: {
    supportsFast: true,
    supportsScenes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    supportsWebSearch: false,
    supportsReturnLastFrame: false,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
  kie: {
    supportsFast: true,
    supportsScenes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    supportsWebSearch: true,
    supportsReturnLastFrame: true,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
  replicate: {
    supportsFast: true,
    supportsScenes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    supportsWebSearch: false,
    supportsReturnLastFrame: false,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
};

export function isSeedanceProviderName(
  value: string | null | undefined
): value is SeedanceProviderName {
  return (Object.keys(SEEDANCE_PROVIDER_CAPABILITIES) as SeedanceProviderName[]).includes(
    value as SeedanceProviderName
  );
}

export function assertSeedanceProviderSupportsRequest(
  provider: SeedanceProviderName,
  request: SeedanceRequest
) {
  const capability = SEEDANCE_PROVIDER_CAPABILITIES[provider];

  if (!capability.supportsScenes.includes(request.scene)) {
    throw new SeedanceValidationError(
      `${provider} does not support ${request.scene}.`
    );
  }

  if (request.fast && !capability.supportsFast) {
    throw new SeedanceValidationError(`${provider} does not support fast mode.`);
  }

  if (request.webSearch && !capability.supportsWebSearch) {
    throw new SeedanceValidationError(`${provider} does not support web search.`);
  }

  if (
    provider === 'evolink' &&
    request.webSearch &&
    request.scene !== 'text-to-video'
  ) {
    throw new SeedanceValidationError(
      'evolink supports web search only for text-to-video requests.'
    );
  }

  if (request.returnLastFrame && !capability.supportsReturnLastFrame) {
    throw new SeedanceValidationError(
      `${provider} does not support return_last_frame.`
    );
  }

  if (request.imageUrls.length > capability.maxImages) {
    throw new SeedanceValidationError(
      `${provider} supports at most ${capability.maxImages} reference images.`
    );
  }

  if (request.videoUrls.length > capability.maxVideos) {
    throw new SeedanceValidationError(
      `${provider} supports at most ${capability.maxVideos} reference videos.`
    );
  }

  if (capability.supportedReferenceVideoExtensions) {
    for (const url of request.videoUrls) {
      const extension = getReferenceMediaUrlExtension(url);
      if (
        extension &&
        !capability.supportedReferenceVideoExtensions.includes(extension)
      ) {
        throw new SeedanceValidationError(
          `${provider} reference videos must use ${capability.supportedReferenceVideoExtensions
            .map((item) => item.slice(1).toUpperCase())
            .join('/')} URLs.`
        );
      }
    }
  }

  if (request.audioUrls.length > capability.maxAudios) {
    throw new SeedanceValidationError(
      `${provider} supports at most ${capability.maxAudios} reference audios.`
    );
  }
}
