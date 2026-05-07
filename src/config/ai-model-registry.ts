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
  KIE_IMAGE_SCENES,
  KIE_MARKET_PROVIDER,
  KIE_NANO_BANANA_2_MODEL,
  KIE_NANO_BANANA_BASE_CREDITS,
  KIE_NANO_BANANA_DEFAULT_RESOLUTION,
  KIE_NANO_BANANA_EDIT_MODEL,
  KIE_NANO_BANANA_MODEL,
  KIE_NANO_BANANA_PRO_MODEL,
  KIE_QWEN_IMAGE_EDIT_MODEL,
  KIE_QWEN_IMAGE_TO_IMAGE_MODEL,
  KIE_QWEN_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_4_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_4_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_5_LITE_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_5_LITE_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_45_TEXT_TO_IMAGE_MODEL,
  KIE_Z_IMAGE_MODEL,
  type KieImageScene,
} from '@/extensions/ai/kie-market/types';
import {
  SEEDANCE_BASE_CREDITS_PER_SECOND,
  SEEDANCE_DEFAULT_DURATION_SECONDS,
  SEEDANCE_DEFAULT_FAST,
  SEEDANCE_DEFAULT_RESOLUTION,
  SEEDANCE_MAX_DURATION_SECONDS,
  SEEDANCE_MIN_DURATION_SECONDS,
  SEEDANCE_PROVIDER,
  SEEDANCE_REQUESTED_MODEL,
  SEEDANCE_SCENES,
  SEEDANCE_VIDEO_INPUT_CREDIT_SURCHARGE_PER_SECOND,
  SEEDANCE_WEB_SEARCH_CREDIT_SURCHARGE,
  SeedanceResolution,
  SeedanceScene,
} from '@/extensions/ai/seedance/types';
import { AIMediaType } from '@/extensions/ai/types';

export type AIGenerationScene = SeedanceScene | KieImageScene;

type AIModelRule = {
  provider: string;
  mediaType: AIMediaType;
  scenes: readonly AIGenerationScene[];
  exactModel: string;
};

export const SEEDANCE_TEXT_TO_VIDEO_MODEL = SEEDANCE_REQUESTED_MODEL;
export const SEEDANCE_IMAGE_TO_VIDEO_MODEL = SEEDANCE_REQUESTED_MODEL;
export const SEEDANCE_REFERENCE_TO_VIDEO_MODEL = SEEDANCE_REQUESTED_MODEL;
export const KIE_TEXT_TO_IMAGE_MODEL = KIE_NANO_BANANA_2_MODEL;
export const KIE_IMAGE_TO_IMAGE_MODEL = KIE_NANO_BANANA_EDIT_MODEL;

const SEEDANCE_SCENE_MODEL_MAP: Record<SeedanceScene, string> = {
  'text-to-video': SEEDANCE_TEXT_TO_VIDEO_MODEL,
  'image-to-video': SEEDANCE_IMAGE_TO_VIDEO_MODEL,
  'reference-to-video': SEEDANCE_REFERENCE_TO_VIDEO_MODEL,
};

const KIE_IMAGE_SCENE_MODEL_MAP: Record<KieImageScene, string> = {
  'text-to-image': KIE_TEXT_TO_IMAGE_MODEL,
  'image-to-image': KIE_IMAGE_TO_IMAGE_MODEL,
};

const KIE_GUEST_IMAGE_SCENE_MODEL_MAP: Record<KieImageScene, string> = {
  'text-to-image': KIE_GPT_IMAGE_2_TEXT_TO_IMAGE_MODEL,
  'image-to-image': KIE_GPT_IMAGE_2_IMAGE_TO_IMAGE_MODEL,
};

const KIE_GUEST_BLOCKED_IMAGE_MODELS = new Set([
  KIE_TEXT_TO_IMAGE_MODEL,
  KIE_IMAGE_TO_IMAGE_MODEL,
  KIE_NANO_BANANA_MODEL,
  KIE_NANO_BANANA_EDIT_MODEL,
  KIE_NANO_BANANA_PRO_MODEL,
]);

const KIE_IMAGE_MODEL_RULES: AIModelRule[] = [
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_NANO_BANANA_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_NANO_BANANA_PRO_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_GPT_IMAGE_2_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_SEEDREAM_4_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_SEEDREAM_45_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_SEEDREAM_5_LITE_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_IMAGE_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_GPT_IMAGE_2_IMAGE_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_NANO_BANANA_PRO_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_SEEDREAM_4_IMAGE_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_SEEDREAM_5_LITE_IMAGE_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_FLUX_2_PRO_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_FLUX_2_PRO_IMAGE_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_FLUX_2_FLEX_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_FLUX_2_FLEX_IMAGE_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_IDEOGRAM_V3_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_IDEOGRAM_CHARACTER_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_QWEN_TEXT_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_QWEN_IMAGE_TO_IMAGE_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['image-to-image'],
    exactModel: KIE_QWEN_IMAGE_EDIT_MODEL,
  },
  {
    provider: KIE_MARKET_PROVIDER,
    mediaType: AIMediaType.IMAGE,
    scenes: ['text-to-image'],
    exactModel: KIE_Z_IMAGE_MODEL,
  },
];

const KIE_IMAGE_MODEL_COST_CREDITS: Record<string, Record<string, number>> = {
  [KIE_TEXT_TO_IMAGE_MODEL]: {
    '1K': 5,
    '2K': 10,
    '4K': 15,
  },
  [KIE_NANO_BANANA_MODEL]: {
    '1K': 5,
    '2K': 10,
    '4K': 15,
  },
  [KIE_IMAGE_TO_IMAGE_MODEL]: KIE_NANO_BANANA_BASE_CREDITS,
  [KIE_NANO_BANANA_PRO_MODEL]: {
    '1K': 10,
    '2K': 18,
    '4K': 30,
  },
  [KIE_GPT_IMAGE_2_TEXT_TO_IMAGE_MODEL]: {
    '1K': 8,
    '2K': 8,
    '4K': 8,
  },
  [KIE_GPT_IMAGE_2_IMAGE_TO_IMAGE_MODEL]: {
    '1K': 8,
    '2K': 8,
    '4K': 8,
  },
  [KIE_SEEDREAM_4_TEXT_TO_IMAGE_MODEL]: {
    '1K': 3,
    '2K': 3,
    '4K': 3,
  },
  [KIE_SEEDREAM_4_IMAGE_TO_IMAGE_MODEL]: {
    '1K': 3,
    '2K': 3,
    '4K': 3,
  },
  [KIE_SEEDREAM_45_TEXT_TO_IMAGE_MODEL]: {
    '1K': 4,
    '2K': 4,
    '4K': 4,
  },
  [KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL]: {
    '1K': 4,
    '2K': 4,
    '4K': 4,
  },
  [KIE_SEEDREAM_5_LITE_TEXT_TO_IMAGE_MODEL]: {
    '1K': 4,
    '2K': 4,
    '4K': 4,
  },
  [KIE_SEEDREAM_5_LITE_IMAGE_TO_IMAGE_MODEL]: {
    '1K': 4,
    '2K': 4,
    '4K': 4,
  },
  [KIE_FLUX_2_PRO_TEXT_TO_IMAGE_MODEL]: {
    '1K': 12,
    '2K': 12,
    '4K': 12,
  },
  [KIE_FLUX_2_PRO_IMAGE_TO_IMAGE_MODEL]: {
    '1K': 12,
    '2K': 12,
    '4K': 12,
  },
  [KIE_FLUX_2_FLEX_TEXT_TO_IMAGE_MODEL]: {
    '1K': 6,
    '2K': 6,
    '4K': 6,
  },
  [KIE_FLUX_2_FLEX_IMAGE_TO_IMAGE_MODEL]: {
    '1K': 6,
    '2K': 6,
    '4K': 6,
  },
  [KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL]: {
    '1K': 5,
    '2K': 5,
    '4K': 5,
  },
  [KIE_IDEOGRAM_V3_MODEL]: {
    '1K': 10,
    '2K': 10,
    '4K': 10,
  },
  [KIE_IDEOGRAM_CHARACTER_MODEL]: {
    '1K': 8,
    '2K': 8,
    '4K': 8,
  },
  [KIE_QWEN_TEXT_TO_IMAGE_MODEL]: {
    '1K': 5,
    '2K': 5,
    '4K': 5,
  },
  [KIE_QWEN_IMAGE_TO_IMAGE_MODEL]: {
    '1K': 5,
    '2K': 5,
    '4K': 5,
  },
  [KIE_QWEN_IMAGE_EDIT_MODEL]: {
    '1K': 5,
    '2K': 5,
    '4K': 5,
  },
  [KIE_Z_IMAGE_MODEL]: {
    '1K': 4,
    '2K': 4,
    '4K': 4,
  },
};

const AI_MODEL_RULES: AIModelRule[] = [
  ...(Object.keys(SEEDANCE_SCENE_MODEL_MAP) as SeedanceScene[]).map(
    (scene) => ({
      provider: SEEDANCE_PROVIDER,
      mediaType: AIMediaType.VIDEO,
      scenes: [scene],
      exactModel: SEEDANCE_SCENE_MODEL_MAP[scene],
    })
  ),
  ...KIE_IMAGE_MODEL_RULES,
];

export function isAIGenerationScene(
  value: string | null | undefined
): value is AIGenerationScene {
  return (
    SEEDANCE_SCENES.includes(value as SeedanceScene) ||
    KIE_IMAGE_SCENES.includes(value as KieImageScene)
  );
}

export function getGenerationSceneMediaType(scene: AIGenerationScene) {
  if (scene in SEEDANCE_SCENE_MODEL_MAP) {
    return AIMediaType.VIDEO;
  }

  return AIMediaType.IMAGE;
}

export function getRequestedModelForScene(scene: AIGenerationScene) {
  if (scene in SEEDANCE_SCENE_MODEL_MAP) {
    return SEEDANCE_SCENE_MODEL_MAP[scene as SeedanceScene];
  }

  return KIE_IMAGE_SCENE_MODEL_MAP[scene as KieImageScene];
}

export function getGuestRequestedModelForScene(scene: AIGenerationScene) {
  if (scene in SEEDANCE_SCENE_MODEL_MAP) {
    return getRequestedModelForScene(scene);
  }

  return KIE_GUEST_IMAGE_SCENE_MODEL_MAP[scene as KieImageScene];
}

export function isGuestAllowedAIModel(input: {
  provider: string;
  mediaType: AIMediaType;
  model: string | null | undefined;
  scene?: string | null;
}) {
  const model = input.model?.trim();
  const scene = input.scene?.trim();
  if (!model || !scene) {
    return false;
  }

  const rule = findAIModelRule({
    provider: input.provider,
    mediaType: input.mediaType,
    model,
    scene,
  });
  if (!rule) {
    return false;
  }

  if (
    input.provider !== KIE_MARKET_PROVIDER ||
    input.mediaType !== AIMediaType.IMAGE
  ) {
    return true;
  }

  return !KIE_GUEST_BLOCKED_IMAGE_MODELS.has(rule.exactModel);
}

type AIGenerationCostInput = {
  durationSeconds?: number | string | null;
  resolution?: string | null;
  model?: string | null;
  fast?: boolean | string | null;
  webSearch?: boolean | string | null;
  hasVideoInput?: boolean | string | null;
  videoUrls?: string[] | null;
};

function getImageGenerationModelCostCredits(
  scene: KieImageScene,
  model: string | null | undefined
) {
  const normalizedModel = model?.trim();
  const modelKey =
    normalizedModel && KIE_IMAGE_MODEL_COST_CREDITS[normalizedModel]
      ? normalizedModel
      : KIE_IMAGE_SCENE_MODEL_MAP[scene];

  return KIE_IMAGE_MODEL_COST_CREDITS[modelKey] ?? KIE_NANO_BANANA_BASE_CREDITS;
}

function getImageGenerationResolutionCostCredits(
  costCredits: Record<string, number>,
  resolution: string | null | undefined
) {
  const normalizedResolution = resolution?.trim().toUpperCase();

  if (
    normalizedResolution &&
    Object.prototype.hasOwnProperty.call(costCredits, normalizedResolution)
  ) {
    return costCredits[normalizedResolution];
  }

  return (
    costCredits[KIE_NANO_BANANA_DEFAULT_RESOLUTION] ??
    costCredits[Object.keys(costCredits)[0]] ??
    KIE_NANO_BANANA_BASE_CREDITS[KIE_NANO_BANANA_DEFAULT_RESOLUTION]
  );
}

function normalizeAIGenerationDurationSeconds(
  value: number | string | null | undefined
) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return SEEDANCE_DEFAULT_DURATION_SECONDS;
  }

  return Math.min(
    SEEDANCE_MAX_DURATION_SECONDS,
    Math.max(SEEDANCE_MIN_DURATION_SECONDS, Math.round(parsed))
  );
}

function normalizeAIGenerationResolution(
  value: string | null | undefined
): SeedanceResolution {
  return value === '480p' ? '480p' : SEEDANCE_DEFAULT_RESOLUTION;
}

function normalizeAIGenerationBoolean(
  value: boolean | string | null | undefined,
  fallback: boolean
) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return fallback;
}

export function getAIGenerationCostCredits(
  scene: string,
  input?: AIGenerationCostInput
) {
  if (scene === 'text-to-image' || scene === 'image-to-image') {
    const costCredits = getImageGenerationModelCostCredits(scene, input?.model);

    return getImageGenerationResolutionCostCredits(
      costCredits,
      input?.resolution
    );
  }

  const durationSeconds = normalizeAIGenerationDurationSeconds(
    input?.durationSeconds
  );
  const resolution = normalizeAIGenerationResolution(input?.resolution);
  const fast = normalizeAIGenerationBoolean(input?.fast, SEEDANCE_DEFAULT_FAST);
  const webSearch = normalizeAIGenerationBoolean(input?.webSearch, false);
  const hasVideoInput =
    scene === 'reference-to-video' &&
    (normalizeAIGenerationBoolean(input?.hasVideoInput, false) ||
      Boolean(input?.videoUrls?.length));
  const baseRate = fast
    ? SEEDANCE_BASE_CREDITS_PER_SECOND[resolution].fast
    : SEEDANCE_BASE_CREDITS_PER_SECOND[resolution].standard;
  const perSecondRate =
    baseRate +
    (hasVideoInput ? SEEDANCE_VIDEO_INPUT_CREDIT_SURCHARGE_PER_SECOND : 0);

  return (
    durationSeconds * perSecondRate +
    (webSearch ? SEEDANCE_WEB_SEARCH_CREDIT_SURCHARGE : 0)
  );
}

export function findAIModelRule(input: {
  provider: string;
  mediaType: AIMediaType;
  model: string;
  scene: string;
}) {
  const scene = input.scene as AIGenerationScene;

  return AI_MODEL_RULES.find((rule) => {
    if (
      rule.provider !== input.provider ||
      rule.mediaType !== input.mediaType
    ) {
      return false;
    }

    if (!rule.scenes.includes(scene)) {
      return false;
    }

    return rule.exactModel === input.model;
  });
}
