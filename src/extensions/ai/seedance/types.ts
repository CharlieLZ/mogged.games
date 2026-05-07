import { AITaskResult } from '@/extensions/ai/types';

export const SEEDANCE_PROVIDER = 'seedance';
export const SEEDANCE_REQUESTED_MODEL = 'seedance-2.0';
export const SEEDANCE_MIN_DURATION_SECONDS = 4;
export const SEEDANCE_MAX_DURATION_SECONDS = 15;
export const SEEDANCE_DEFAULT_DURATION_SECONDS = 15;
export const SEEDANCE_MIN_EXECUTION_EXPIRES_AFTER_SECONDS = 3600;
export const SEEDANCE_MAX_EXECUTION_EXPIRES_AFTER_SECONDS = 259200;
export const SEEDANCE_DEFAULT_EXECUTION_EXPIRES_AFTER_SECONDS = 172800;

export const SEEDANCE_SCENES = [
  'text-to-video',
  'image-to-video',
  'reference-to-video',
] as const;

export type SeedanceScene = (typeof SEEDANCE_SCENES)[number];

export const SEEDANCE_PROVIDER_NAMES = [
  'volcengine',
  'apixo',
  'apimart',
  'evolink',
  'fal',
  'kie',
  'replicate',
] as const;

export type SeedanceProviderName = (typeof SEEDANCE_PROVIDER_NAMES)[number];
export const SEEDANCE_RUNTIME_PROVIDERS = [
  'volcengine',
  'kie',
] as const satisfies readonly SeedanceProviderName[];

export type SeedanceRoutingMode = 'single' | 'fallback';

export const SEEDANCE_ASPECT_RATIOS = [
  'auto',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '1:1',
  '21:9',
] as const;

export type SeedanceAspectRatio = (typeof SEEDANCE_ASPECT_RATIOS)[number];

export const SEEDANCE_RESOLUTIONS = ['480p', '720p'] as const;

export type SeedanceResolution = (typeof SEEDANCE_RESOLUTIONS)[number];
export const SEEDANCE_DEFAULT_RESOLUTION: SeedanceResolution = '720p';
export const SEEDANCE_DEFAULT_FAST = true;
export const SEEDANCE_WEB_SEARCH_CREDIT_SURCHARGE = 1;
export const SEEDANCE_VIDEO_INPUT_CREDIT_SURCHARGE_PER_SECOND = 3;
export const SEEDANCE_BASE_CREDITS_PER_SECOND: Record<
  SeedanceResolution,
  {
    fast: number;
    standard: number;
  }
> = {
  '480p': {
    fast: 5,
    standard: 6,
  },
  '720p': {
    fast: 10,
    standard: 12,
  },
};

export interface SeedanceRequest {
  scene: SeedanceScene;
  fast: boolean;
  prompt: string;
  duration: number;
  executionExpiresAfter: number;
  resolution: SeedanceResolution;
  aspectRatio: SeedanceAspectRatio;
  generateAudio: boolean;
  webSearch: boolean;
  seed?: number;
  safetyIdentifier?: string;
  watermark: boolean;
  imageUrls: string[];
  videoUrls: string[];
  audioUrls: string[];
  returnLastFrame: boolean;
}

export interface SeedanceProviderGenerateResult {
  provider: SeedanceProviderName;
  model: string;
  result: AITaskResult;
}

export interface SeedanceProviderAdapter {
  readonly provider: SeedanceProviderName;

  generate(input: {
    apiKey: string;
    request: SeedanceRequest;
    callbackUrl?: string;
  }): Promise<SeedanceProviderGenerateResult>;

  query(input: {
    apiKey: string;
    taskId: string;
    model?: string;
  }): Promise<AITaskResult>;
}

export function isSeedanceScene(
  value: string | null | undefined
): value is SeedanceScene {
  return SEEDANCE_SCENES.includes(value as SeedanceScene);
}
