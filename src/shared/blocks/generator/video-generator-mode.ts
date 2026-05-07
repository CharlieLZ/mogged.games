export const VIDEO_GENERATOR_MODES = [
  'text-to-video',
  'image-to-video',
  'reference-to-video',
] as const;

export type VideoGeneratorMode = (typeof VIDEO_GENERATOR_MODES)[number];

export const DEFAULT_VIDEO_GENERATOR_MODE: VideoGeneratorMode =
  'text-to-video';

export function isVideoGeneratorMode(
  value: string | null | undefined
): value is VideoGeneratorMode {
  return VIDEO_GENERATOR_MODES.includes(value as VideoGeneratorMode);
}

export function parseVideoGeneratorMode(
  value: string | null | undefined,
  fallback: VideoGeneratorMode = DEFAULT_VIDEO_GENERATOR_MODE
): VideoGeneratorMode {
  return isVideoGeneratorMode(value) ? value : fallback;
}
