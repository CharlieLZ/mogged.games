export const IMAGE_GENERATOR_WORKSPACE_ID = 'image-generator-workspace';
export const IMAGE_GENERATOR_APPLY_PROMPT_EVENT =
  'imageeditorai:apply-image-generator-prompt';

export type ImageGeneratorApplyPromptMode = 'text-to-image' | 'image-to-image';

export type ImageGeneratorApplyPromptDetail = {
  prompt: string;
  mode?: ImageGeneratorApplyPromptMode;
  sourceImageUrl?: string;
};

function isApplyPromptMode(
  value: unknown
): value is ImageGeneratorApplyPromptMode {
  return value === 'text-to-image' || value === 'image-to-image';
}

export function normalizeImageGeneratorApplyPromptDetail(
  value: unknown
): ImageGeneratorApplyPromptDetail | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const detail = value as Record<string, unknown>;
  const prompt = typeof detail.prompt === 'string' ? detail.prompt.trim() : '';

  if (!prompt) {
    return null;
  }

  const mode = isApplyPromptMode(detail.mode) ? detail.mode : undefined;
  const sourceImageUrl =
    typeof detail.sourceImageUrl === 'string'
      ? detail.sourceImageUrl.trim()
      : '';

  return {
    prompt,
    ...(mode ? { mode } : {}),
    ...(sourceImageUrl ? { sourceImageUrl } : {}),
  };
}

export function dispatchImageGeneratorApplyPrompt(
  detail: ImageGeneratorApplyPromptDetail
) {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalized = normalizeImageGeneratorApplyPromptDetail(detail);

  if (!normalized) {
    return false;
  }

  window.dispatchEvent(
    new CustomEvent(IMAGE_GENERATOR_APPLY_PROMPT_EVENT, {
      detail: normalized,
    })
  );

  return true;
}
