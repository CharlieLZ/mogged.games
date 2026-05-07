import { AIMediaType, AITaskResult } from '@/extensions/ai/types';

export const KIE_MARKET_PROVIDER = 'kie-market';
export const KIE_NANO_BANANA_2_MODEL = 'nano-banana-2';
export const KIE_NANO_BANANA_MODEL = 'google/nano-banana';
export const KIE_NANO_BANANA_EDIT_MODEL = 'google/nano-banana-edit';
export const KIE_NANO_BANANA_PRO_MODEL = 'nano-banana-pro';
export const KIE_GPT_IMAGE_2_TEXT_TO_IMAGE_MODEL = 'gpt-image-2-text-to-image';
export const KIE_GPT_IMAGE_2_IMAGE_TO_IMAGE_MODEL =
  'gpt-image-2-image-to-image';
export const KIE_SEEDREAM_4_TEXT_TO_IMAGE_MODEL =
  'bytedance/seedream-v4-text-to-image';
export const KIE_SEEDREAM_4_IMAGE_TO_IMAGE_MODEL = 'bytedance/seedream-v4-edit';
export const KIE_SEEDREAM_45_TEXT_TO_IMAGE_MODEL = 'seedream/4.5-text-to-image';
export const KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL = 'seedream/4.5-edit';
export const KIE_SEEDREAM_4_5_EDIT_MODEL = KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL;
export const KIE_SEEDREAM_5_LITE_TEXT_TO_IMAGE_MODEL =
  'seedream/5-lite-text-to-image';
export const KIE_SEEDREAM_5_LITE_IMAGE_TO_IMAGE_MODEL =
  'seedream/5-lite-image-to-image';

export const KIE_FLUX_2_PRO_TEXT_TO_IMAGE_MODEL = 'flux-2/pro-text-to-image';
export const KIE_FLUX_2_PRO_IMAGE_TO_IMAGE_MODEL = 'flux-2/pro-image-to-image';
export const KIE_FLUX_2_FLEX_TEXT_TO_IMAGE_MODEL = 'flux-2/flex-text-to-image';
export const KIE_FLUX_2_FLEX_IMAGE_TO_IMAGE_MODEL =
  'flux-2/flex-image-to-image';
export const KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL =
  'grok-imagine/text-to-image';
export const KIE_IDEOGRAM_V3_MODEL = 'ideogram/v3-text-to-image';
export const KIE_IDEOGRAM_CHARACTER_MODEL = 'ideogram/character';
export const KIE_QWEN_TEXT_TO_IMAGE_MODEL = 'qwen/text-to-image';
export const KIE_QWEN_IMAGE_TO_IMAGE_MODEL = 'qwen/image-to-image';
export const KIE_QWEN_IMAGE_EDIT_MODEL = 'qwen/image-edit';
export const KIE_Z_IMAGE_MODEL = 'z-image';

export const KIE_IMAGE_SCENES = ['text-to-image', 'image-to-image'] as const;

export type KieImageScene = (typeof KIE_IMAGE_SCENES)[number];

export const KIE_NANO_BANANA_RESOLUTIONS = ['1K', '2K', '4K'] as const;
export type KieNanoBananaResolution =
  (typeof KIE_NANO_BANANA_RESOLUTIONS)[number];
export const KIE_NANO_BANANA_DEFAULT_RESOLUTION: KieNanoBananaResolution = '1K';

export const KIE_NANO_BANANA_OUTPUT_FORMATS = ['jpg', 'png'] as const;
export type KieNanoBananaOutputFormat =
  (typeof KIE_NANO_BANANA_OUTPUT_FORMATS)[number];

export const KIE_NANO_BANANA_BASE_CREDITS: Record<
  KieNanoBananaResolution,
  number
> = {
  '1K': 5,
  '2K': 10,
  '4K': 15,
};

export type KieImageRequest = {
  scene: KieImageScene;
  model?: string;
  prompt: string;
  imageUrl?: string;
  imageUrls?: string[];
  editMode?: string;
  aspectRatio: string;
  resolution: KieNanoBananaResolution;
  outputFormat: KieNanoBananaOutputFormat;
  webSearch: boolean;
  seed?: number;
  negativePrompt?: string;
  guidanceScale?: number;
  numImages?: number;
  numInferenceSteps?: number;
  strength?: number;
  nsfwChecker?: boolean;
};

export interface KieImageGenerateResult {
  provider: typeof KIE_MARKET_PROVIDER;
  model: string;
  result: AITaskResult;
}

export function getKieImageModel(scene: KieImageScene) {
  return scene === 'image-to-image'
    ? KIE_NANO_BANANA_EDIT_MODEL
    : KIE_NANO_BANANA_2_MODEL;
}

export function isKieImageScene(
  value: string | null | undefined
): value is KieImageScene {
  return KIE_IMAGE_SCENES.includes(value as KieImageScene);
}

export function isKieImageProvider(
  value: string | null | undefined
): value is typeof KIE_MARKET_PROVIDER {
  return value === KIE_MARKET_PROVIDER;
}

export function getKieImageMediaType() {
  return AIMediaType.IMAGE;
}
