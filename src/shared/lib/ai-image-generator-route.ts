import {
  isImageGeneratorMode,
  parseImageGeneratorMode,
  type ImageGeneratorMode,
} from '@/shared/blocks/generator/image-generator-mode';

export type AiImageGeneratorSearchParams = Record<
  string,
  string | string[] | undefined
> & {
  mode?: string | string[];
};

export function getRawImageGeneratorModeParam(
  searchParams: AiImageGeneratorSearchParams
): string | null {
  const mode = Array.isArray(searchParams.mode)
    ? searchParams.mode[0]
    : searchParams.mode;

  return typeof mode === 'string' && mode.length > 0 ? mode : null;
}

export function getExplicitImageGeneratorMode(
  searchParams: AiImageGeneratorSearchParams
): ImageGeneratorMode | null {
  const rawMode = getRawImageGeneratorModeParam(searchParams);
  return rawMode && isImageGeneratorMode(rawMode) ? rawMode : null;
}

export function getDefaultImageGeneratorMode(
  searchParams: AiImageGeneratorSearchParams,
  fallback?: ImageGeneratorMode
) {
  return parseImageGeneratorMode(
    getRawImageGeneratorModeParam(searchParams),
    fallback
  );
}
