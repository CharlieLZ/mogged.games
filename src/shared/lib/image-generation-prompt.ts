export type ImageGenerationPromptScene = 'text-to-image' | 'image-to-image';

export const IMAGE_TO_IMAGE_DEFAULT_PROVIDER_PROMPT = 'Edit the source image.';

export function normalizeImageGenerationPrompt({
  scene,
  prompt,
}: {
  scene: ImageGenerationPromptScene;
  prompt: string;
}) {
  const normalizedPrompt = prompt.trim();

  if (normalizedPrompt) {
    return {
      normalizedPrompt,
      providerPrompt: normalizedPrompt,
    };
  }

  if (scene === 'image-to-image') {
    return {
      normalizedPrompt: '',
      providerPrompt: IMAGE_TO_IMAGE_DEFAULT_PROVIDER_PROMPT,
    };
  }

  return null;
}
