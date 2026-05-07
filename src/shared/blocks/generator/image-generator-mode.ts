export const IMAGE_GENERATOR_MODES = [
  'text-to-image',
  'image-to-image',
] as const;

export type ImageGeneratorMode = (typeof IMAGE_GENERATOR_MODES)[number];

export const DEFAULT_IMAGE_GENERATOR_MODE: ImageGeneratorMode =
  'text-to-image';

export function isImageGeneratorMode(
  value: string | null | undefined
): value is ImageGeneratorMode {
  return IMAGE_GENERATOR_MODES.includes(value as ImageGeneratorMode);
}

export function parseImageGeneratorMode(
  value: string | null | undefined,
  fallback: ImageGeneratorMode = DEFAULT_IMAGE_GENERATOR_MODE
): ImageGeneratorMode {
  return isImageGeneratorMode(value) ? value : fallback;
}
