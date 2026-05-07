import {
  KIE_FLUX_2_FLEX_IMAGE_TO_IMAGE_MODEL,
  KIE_FLUX_2_FLEX_TEXT_TO_IMAGE_MODEL,
  KIE_FLUX_2_PRO_IMAGE_TO_IMAGE_MODEL,
  KIE_FLUX_2_PRO_TEXT_TO_IMAGE_MODEL,
  KIE_GPT_IMAGE_2_IMAGE_TO_IMAGE_MODEL,
  KIE_GPT_IMAGE_2_TEXT_TO_IMAGE_MODEL,
  KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL,
  KIE_IDEOGRAM_CHARACTER_MODEL,
  KIE_IDEOGRAM_V3_MODEL,
  KIE_NANO_BANANA_2_MODEL,
  KIE_NANO_BANANA_EDIT_MODEL,
  KIE_NANO_BANANA_MODEL,
  KIE_NANO_BANANA_PRO_MODEL,
  KIE_QWEN_IMAGE_EDIT_MODEL,
  KIE_QWEN_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_4_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_4_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_5_LITE_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_5_LITE_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_45_TEXT_TO_IMAGE_MODEL,
  KIE_Z_IMAGE_MODEL,
  type KieNanoBananaResolution,
} from '@/extensions/ai/kie-market/types';

import type { ImageGeneratorMode } from './image-generator-mode';

type SelectOption = {
  value: string;
  label: string;
};

export type ImageEditMode = 'single-edit' | 'multi-fusion';
export type ImageModelKey =
  | 'nano-banana'
  | 'nano-banana-2'
  | 'gpt-image-2'
  | 'nano-banana-pro'
  | 'seedream-4'
  | 'seedream-45'
  | 'seedream-5'
  | 'flux-2-pro'
  | 'flux-2-flex'
  | 'grok-imagine'
  | 'ideogram-v3'
  | 'ideogram-character'
  | 'qwen-image'
  | 'z-image';

export type ImageModelBrand =
  | 'google'
  | 'openai'
  | 'bytedance'
  | 'flux'
  | 'xai'
  | 'ideogram'
  | 'alibaba'
  | 'zai';

export type ImageModelOption = {
  key: ImageModelKey;
  translationKey: string;
  brand: ImageModelBrand;
  textModel: string;
  imageModel: string;
  credits: number | Record<KieNanoBananaResolution, number>;
  isNew?: boolean;
  isVip?: boolean;
  quickSelect?: boolean;
  t2iOnly?: boolean;
  i2iOnly?: boolean;
};

export type ImageModelAccessTier = 'guest' | 'free' | 'paid';

export const DEFAULT_IMAGE_RESOLUTION = '1K';
export const DEFAULT_IMAGE_ASPECT_RATIO = '1:1';
export const DEFAULT_IMAGE_OUTPUT_FORMAT = 'jpg';
export const DEFAULT_IMAGE_EDIT_MODE: ImageEditMode = 'single-edit';
export const DEFAULT_IMAGE_MODEL_KEY: ImageModelKey = 'nano-banana-2';
export const DEFAULT_NON_VIP_IMAGE_MODEL_KEY: ImageModelKey = 'gpt-image-2';
export const DEFAULT_GUEST_IMAGE_MODEL_KEY = DEFAULT_NON_VIP_IMAGE_MODEL_KEY;
export const MAX_SINGLE_EDIT_IMAGE_COUNT = 1;
export const MAX_MULTI_FUSION_IMAGE_COUNT = 10;

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  {
    key: 'nano-banana',
    translationKey: 'nano_banana',
    brand: 'google',
    textModel: KIE_NANO_BANANA_MODEL,
    imageModel: KIE_NANO_BANANA_EDIT_MODEL,
    credits: {
      '1K': 5,
      '2K': 10,
      '4K': 15,
    },
    quickSelect: true,
    isVip: true,
  },
  {
    key: 'nano-banana-2',
    translationKey: 'nano_banana_2',
    brand: 'google',
    textModel: KIE_NANO_BANANA_2_MODEL,
    imageModel: KIE_NANO_BANANA_2_MODEL,
    credits: {
      '1K': 5,
      '2K': 10,
      '4K': 15,
    },
    isNew: true,
    isVip: true,
  },
  {
    key: 'gpt-image-2',
    translationKey: 'gpt_image_2',
    brand: 'openai',
    textModel: KIE_GPT_IMAGE_2_TEXT_TO_IMAGE_MODEL,
    imageModel: KIE_GPT_IMAGE_2_IMAGE_TO_IMAGE_MODEL,
    credits: 8,
    quickSelect: true,
    isNew: true,
  },
  {
    key: 'nano-banana-pro',
    translationKey: 'nano_banana_pro',
    brand: 'google',
    textModel: KIE_NANO_BANANA_PRO_MODEL,
    imageModel: KIE_NANO_BANANA_PRO_MODEL,
    credits: {
      '1K': 10,
      '2K': 18,
      '4K': 30,
    },
    isVip: true,
  },
  {
    key: 'seedream-4',
    translationKey: 'seedream_4',
    brand: 'bytedance',
    textModel: KIE_SEEDREAM_4_TEXT_TO_IMAGE_MODEL,
    imageModel: KIE_SEEDREAM_4_IMAGE_TO_IMAGE_MODEL,
    credits: 3,
  },
  {
    key: 'seedream-45',
    translationKey: 'seedream_45',
    brand: 'bytedance',
    textModel: KIE_SEEDREAM_45_TEXT_TO_IMAGE_MODEL,
    imageModel: KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL,
    credits: 4,
  },
  {
    key: 'seedream-5',
    translationKey: 'seedream_5',
    brand: 'bytedance',
    textModel: KIE_SEEDREAM_5_LITE_TEXT_TO_IMAGE_MODEL,
    imageModel: KIE_SEEDREAM_5_LITE_IMAGE_TO_IMAGE_MODEL,
    credits: 4,
    quickSelect: true,
    isNew: true,
  },
  {
    key: 'flux-2-pro',
    translationKey: 'flux_2_pro',
    brand: 'flux',
    textModel: KIE_FLUX_2_PRO_TEXT_TO_IMAGE_MODEL,
    imageModel: KIE_FLUX_2_PRO_IMAGE_TO_IMAGE_MODEL,
    credits: 12,
    isNew: true,
  },
  {
    key: 'flux-2-flex',
    translationKey: 'flux_2_flex',
    brand: 'flux',
    textModel: KIE_FLUX_2_FLEX_TEXT_TO_IMAGE_MODEL,
    imageModel: KIE_FLUX_2_FLEX_IMAGE_TO_IMAGE_MODEL,
    credits: 6,
  },
  {
    key: 'grok-imagine',
    translationKey: 'grok_imagine',
    brand: 'xai',
    textModel: KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL,
    imageModel: KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL,
    credits: 5,
    isNew: true,
    t2iOnly: true,
  },
  {
    key: 'ideogram-v3',
    translationKey: 'ideogram_v3',
    brand: 'ideogram',
    textModel: KIE_IDEOGRAM_V3_MODEL,
    imageModel: KIE_IDEOGRAM_V3_MODEL,
    credits: 10,
    isNew: true,
    t2iOnly: true,
  },
  {
    key: 'ideogram-character',
    translationKey: 'ideogram_character',
    brand: 'ideogram',
    textModel: KIE_IDEOGRAM_CHARACTER_MODEL,
    imageModel: KIE_IDEOGRAM_CHARACTER_MODEL,
    credits: 8,
    isNew: true,
    i2iOnly: true,
  },
  {
    key: 'qwen-image',
    translationKey: 'qwen_image',
    brand: 'alibaba',
    textModel: KIE_QWEN_TEXT_TO_IMAGE_MODEL,
    imageModel: KIE_QWEN_IMAGE_EDIT_MODEL,
    credits: 5,
    quickSelect: true,
  },
  {
    key: 'z-image',
    translationKey: 'z_image',
    brand: 'zai',
    textModel: KIE_Z_IMAGE_MODEL,
    imageModel: KIE_Z_IMAGE_MODEL,
    credits: 4,
    t2iOnly: true,
  },
];

export const QUICK_IMAGE_MODEL_OPTIONS = IMAGE_MODEL_OPTIONS.filter(
  (option) => option.quickSelect
);

const PAID_ONLY_IMAGE_MODELS = new Set(
  IMAGE_MODEL_OPTIONS.flatMap((option) =>
    option.isVip ? [option.textModel, option.imageModel] : []
  )
);

export const IMAGE_RESOLUTION_OPTIONS: SelectOption[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

export const IMAGE_ASPECT_RATIO_OPTIONS: SelectOption[] = [
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '5:4', label: '5:4' },
  { value: '4:5', label: '4:5' },
  { value: '21:9', label: '21:9' },
];

export const IMAGE_OUTPUT_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
];

const IMAGE_RESOLUTION_VALUES = new Set(
  IMAGE_RESOLUTION_OPTIONS.map((option) => option.value)
);
const IMAGE_ASPECT_RATIO_VALUES = new Set(
  IMAGE_ASPECT_RATIO_OPTIONS.map((option) => option.value)
);
const IMAGE_OUTPUT_FORMAT_VALUES = new Set(
  IMAGE_OUTPUT_FORMAT_OPTIONS.map((option) => option.value)
);

function normalizeSelectValue(
  value: string | null | undefined,
  fallback: string,
  allowedValues: ReadonlySet<string>
) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || !allowedValues.has(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function parseBoolean(value: boolean | string | null | undefined) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return false;
}

export function normalizeImageResolution(value?: string | null) {
  return normalizeSelectValue(
    value,
    DEFAULT_IMAGE_RESOLUTION,
    IMAGE_RESOLUTION_VALUES
  );
}

export function normalizeImageAspectRatio(value?: string | null) {
  return normalizeSelectValue(
    value,
    DEFAULT_IMAGE_ASPECT_RATIO,
    IMAGE_ASPECT_RATIO_VALUES
  );
}

export function normalizeImageOutputFormat(value?: string | null) {
  return normalizeSelectValue(
    value,
    DEFAULT_IMAGE_OUTPUT_FORMAT,
    IMAGE_OUTPUT_FORMAT_VALUES
  );
}

export function getImageModelOption(key: ImageModelKey | string) {
  return (
    IMAGE_MODEL_OPTIONS.find((option) => option.key === key) ||
    IMAGE_MODEL_OPTIONS.find(
      (option) => option.key === DEFAULT_IMAGE_MODEL_KEY
    ) ||
    IMAGE_MODEL_OPTIONS[0]
  );
}

export function getImageModelForMode(
  modelKey: ImageModelKey | string,
  mode: ImageGeneratorMode
) {
  const option = getImageModelOption(modelKey);
  return mode === 'image-to-image' ? option.imageModel : option.textModel;
}

export function canUseImageModel(
  model: string | null | undefined,
  accessTier: ImageModelAccessTier | null | undefined
) {
  const normalizedModel = typeof model === 'string' ? model.trim() : '';
  if (!normalizedModel) {
    return false;
  }

  if (!accessTier) {
    return true;
  }

  return accessTier === 'paid' || !PAID_ONLY_IMAGE_MODELS.has(normalizedModel);
}

export function canUseImageModelKey(
  modelKey: ImageModelKey | string,
  accessTier: ImageModelAccessTier | null | undefined
) {
  const option = getImageModelOption(modelKey);

  return (
    canUseImageModel(option.textModel, accessTier) &&
    canUseImageModel(option.imageModel, accessTier)
  );
}

export function normalizeImageModelKeyForAccess(
  modelKey: ImageModelKey | string,
  accessTier: ImageModelAccessTier | null | undefined
) {
  return canUseImageModelKey(modelKey, accessTier)
    ? getImageModelOption(modelKey).key
    : DEFAULT_NON_VIP_IMAGE_MODEL_KEY;
}

export function isImageModelT2iOnly(modelKey: ImageModelKey | string) {
  return getImageModelOption(modelKey).t2iOnly === true;
}

export function isImageModelI2iOnly(modelKey: ImageModelKey | string) {
  return getImageModelOption(modelKey).i2iOnly === true;
}

export function getCompatibleImageModelKey(
  modelKey: ImageModelKey | string,
  mode: ImageGeneratorMode
) {
  const option = getImageModelOption(modelKey);

  if (
    (mode === 'image-to-image' && option.t2iOnly === true) ||
    (mode === 'text-to-image' && option.i2iOnly === true)
  ) {
    return DEFAULT_IMAGE_MODEL_KEY;
  }

  return option.key;
}

export function findImageModelKeyForModel(
  model: string | null | undefined,
  mode: ImageGeneratorMode
) {
  const normalizedModel = typeof model === 'string' ? model.trim() : '';
  if (!normalizedModel) {
    return undefined;
  }

  return IMAGE_MODEL_OPTIONS.find((option) =>
    mode === 'image-to-image'
      ? option.imageModel === normalizedModel
      : option.textModel === normalizedModel
  )?.key;
}

export function getImageModelCredits(
  modelKey: ImageModelKey | string,
  resolution: string
) {
  const option = getImageModelOption(modelKey);
  if (typeof option.credits === 'number') {
    return option.credits;
  }

  const normalizedResolution = normalizeImageResolution(
    resolution
  ) as KieNanoBananaResolution;

  return option.credits[normalizedResolution] ?? option.credits['1K'];
}

export function getImageModelCreditValues(modelKey: ImageModelKey | string) {
  const option = getImageModelOption(modelKey);
  const credits = option.credits;
  if (typeof credits === 'number') {
    return [credits];
  }

  return IMAGE_RESOLUTION_OPTIONS.map(
    (resolution) => credits[resolution.value as KieNanoBananaResolution]
  ).filter((value): value is number => typeof value === 'number');
}

type EstimateImageGenerationInput = {
  mode: ImageGeneratorMode;
  resolution: string;
};

export function estimateImageGenerationSeconds({
  mode,
  resolution,
}: EstimateImageGenerationInput) {
  const normalizedResolution = normalizeImageResolution(resolution);
  const baseSeconds =
    normalizedResolution === '4K'
      ? 100
      : normalizedResolution === '2K'
        ? 70
        : 45;
  const imageEditPenaltySeconds = mode === 'image-to-image' ? 10 : 0;

  return baseSeconds + imageEditPenaltySeconds;
}

type BuildImageGenerationOptionsInput = {
  mode: ImageGeneratorMode;
  imageEditMode?: string;
  aspectRatio: string;
  resolution: string;
  outputFormat: string;
  webSearch: boolean;
  imageUrls?: string[];
};

export function buildImageGenerationOptions({
  mode,
  imageEditMode,
  aspectRatio,
  resolution,
  outputFormat,
  webSearch,
  imageUrls,
}: BuildImageGenerationOptionsInput) {
  const options: Record<string, unknown> = {
    aspect_ratio: normalizeImageAspectRatio(aspectRatio),
    resolution: normalizeImageResolution(resolution),
    output_format: normalizeImageOutputFormat(outputFormat),
    web_search: parseBoolean(webSearch),
  };

  if (mode === 'image-to-image' && imageUrls?.[0]) {
    options.image_url = imageUrls[0];

    if (imageUrls.length > 1) {
      options.image_urls = imageUrls;
    }

    if (imageEditMode) {
      options.edit_mode = imageEditMode;
    }
  }

  return options;
}
