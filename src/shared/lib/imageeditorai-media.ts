export const IMAGEEDITORAI_REMOTE_ASSET_ORIGIN =
  'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev';
export const IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL =
  'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev';
export const IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL =
  IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL;
export const IMAGEEDITORAI_IMAGE_PREVIEW_PLACEHOLDER_BASE_URL =
  IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL;
export const IMAGEEDITORAI_REMOTE_COMPARISON_VIDEO = `${IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL}/use-case-ads.mp4`;

export const IMAGEEDITORAI_MEDIA = {
  hero4k:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/4k-cinematic.jpg',
  imageToVideo:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/image-to-video.jpg',
  nativeAudio:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/native-audio.jpg',
  multiShot:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/multi-shot.jpg',
  styleControl:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/style-control.jpg',
  motionControl:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/motion-control.jpg',
  characterConsistency:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/character-consistency.jpg',
  lipSync:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/lip-sync.jpg',
  marketing:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/usecases/marketing.jpg',
  ecommerce:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/usecases/ecommerce.jpg',
  socialMedia:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/usecases/social-media.jpg',
  storytelling:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/usecases/storytelling.jpg',
  sampleVideo:
    'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/hero/dance.mp4',
  useCaseDrama: `${IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL}/use-case-drama.mp4`,
  useCaseAds: `${IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL}/use-case-ads.mp4`,
  useCaseLifestyle: `${IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL}/use-case-lifestyle.mp4`,
  useCaseSocial: `${IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL}/use-case-social.mp4`,
} as const;

export type ImageEditorAiMediaKey = keyof typeof IMAGEEDITORAI_MEDIA;

export function getImageEditorAiMediaToken(key: ImageEditorAiMediaKey) {
  return `imageeditorai-media:${key}`;
}

export function getImageEditorAiMediaUrl(key: ImageEditorAiMediaKey) {
  return IMAGEEDITORAI_MEDIA[key];
}

export function getImageEditorAiHomeVideoSampleUrl(index: number) {
  const normalizedIndex = Math.min(Math.max(Math.floor(index), 1), 8);
  return `${IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL}/${normalizedIndex}.mp4`;
}

export function getImageEditorAiShowcaseLibraryVideoUrl(index: number) {
  const normalizedIndex = Math.min(Math.max(Math.floor(index), 1), 21);
  return `${IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL}/example${normalizedIndex}.mp4`;
}

export function resolveImageEditorAiMediaUrl(value: string) {
  if (!value.startsWith('imageeditorai-media:')) {
    return value;
  }

  const key = value.slice(
    'imageeditorai-media:'.length
  ) as ImageEditorAiMediaKey;
  const assetPath = IMAGEEDITORAI_MEDIA[key];
  return assetPath ?? value;
}

export function replaceImageEditorAiMediaTokensDeep<T>(input: T): T {
  if (typeof input === 'string') {
    return resolveImageEditorAiMediaUrl(input) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => replaceImageEditorAiMediaTokensDeep(item)) as T;
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        replaceImageEditorAiMediaTokensDeep(value),
      ])
    ) as T;
  }

  return input;
}

export const IMAGEEDITORAI_REMOTE_HERO_IMAGE =
  getImageEditorAiMediaUrl('hero4k');
export const IMAGEEDITORAI_REMOTE_VIDEO_POSTER =
  getImageEditorAiMediaUrl('imageToVideo');
export const IMAGEEDITORAI_REMOTE_SAMPLE_VIDEO =
  getImageEditorAiMediaUrl('sampleVideo');
