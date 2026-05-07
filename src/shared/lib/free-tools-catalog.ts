import type {
  LocalImageToolMode,
  ImageColorExtractorCopy,
  ImageCompressorCopy,
  ImageConverterCopy,
  LocalImageToolCopy,
  VideoConverterCopy,
  VideoThumbnailCopy,
  VideoToGifCopy,
  VideoTrimmerCopy,
} from '@/shared/blocks/tools';

export const FREE_TOOLS_ROOT_PATH = '/free-tools';
const FREE_TOOLS_LAST_MODIFIED_ISO = '2026-05-06T00:00:00.000Z';

export type FreeToolSectionKey = 'image' | 'video';

export type FreeToolCopyKey =
  | 'image_converter'
  | 'image_color_extractor'
  | 'image_compressor'
  | 'image_cropper'
  | 'image_resizer'
  | 'image_upscaler'
  | 'image_rotator'
  | 'image_metadata_remover'
  | 'video_converter'
  | 'video_trimmer'
  | 'video_to_gif'
  | 'video_thumbnail';

export type StandaloneToolCopyKey =
  | 'image_converter'
  | 'image_color_extractor'
  | 'image_compressor'
  | 'video_converter'
  | 'video_trimmer'
  | 'video_to_gif'
  | 'video_thumbnail';

export type StandaloneToolPageCopy =
  | ImageConverterCopy
  | ImageColorExtractorCopy
  | ImageCompressorCopy
  | VideoConverterCopy
  | VideoTrimmerCopy
  | VideoToGifCopy
  | VideoThumbnailCopy;

export type FreeToolPageCopy =
  | LocalImageToolCopy
  | StandaloneToolPageCopy;

type FreeToolBaseDefinition = {
  slug: string;
  copyKey: FreeToolCopyKey;
  section: FreeToolSectionKey;
  path: string;
  metadataKey: `landing.free_tools.${FreeToolCopyKey}.metadata`;
  lastModifiedIso: string;
};

type LocalImageFreeToolDefinition = FreeToolBaseDefinition & {
  kind: 'local-image';
  mode: LocalImageToolMode;
};

type StandaloneFreeToolDefinition = FreeToolBaseDefinition & {
  kind: 'standalone';
};

export type FreeToolDefinition =
  | LocalImageFreeToolDefinition
  | StandaloneFreeToolDefinition;

function buildFreeToolPath(slug: string) {
  return `${FREE_TOOLS_ROOT_PATH}/${slug}`;
}

function buildFreeToolMetadataKey(copyKey: FreeToolCopyKey) {
  return `landing.free_tools.${copyKey}.metadata` as const;
}

const freeToolsCatalog = [
  {
    slug: 'image-converter',
    copyKey: 'image_converter',
    section: 'image',
    kind: 'standalone',
  },
  {
    slug: 'image-color-extractor',
    copyKey: 'image_color_extractor',
    section: 'image',
    kind: 'standalone',
  },
  {
    slug: 'image-compressor',
    copyKey: 'image_compressor',
    section: 'image',
    kind: 'standalone',
  },
  {
    slug: 'image-cropper',
    copyKey: 'image_cropper',
    section: 'image',
    kind: 'local-image',
    mode: 'crop',
  },
  {
    slug: 'image-resizer',
    copyKey: 'image_resizer',
    section: 'image',
    kind: 'local-image',
    mode: 'resize',
  },
  {
    slug: 'image-upscaler',
    copyKey: 'image_upscaler',
    section: 'image',
    kind: 'local-image',
    mode: 'upscale',
  },
  {
    slug: 'image-rotator',
    copyKey: 'image_rotator',
    section: 'image',
    kind: 'local-image',
    mode: 'rotate',
  },
  {
    slug: 'image-metadata-remover',
    copyKey: 'image_metadata_remover',
    section: 'image',
    kind: 'local-image',
    mode: 'metadata',
  },
  {
    slug: 'video-converter',
    copyKey: 'video_converter',
    section: 'video',
    kind: 'standalone',
  },
  {
    slug: 'video-trimmer',
    copyKey: 'video_trimmer',
    section: 'video',
    kind: 'standalone',
  },
  {
    slug: 'video-to-gif',
    copyKey: 'video_to_gif',
    section: 'video',
    kind: 'standalone',
  },
  {
    slug: 'video-thumbnail',
    copyKey: 'video_thumbnail',
    section: 'video',
    kind: 'standalone',
  },
] as const satisfies ReadonlyArray<{
  slug: string;
  copyKey: FreeToolCopyKey;
  section: FreeToolSectionKey;
  kind: 'local-image' | 'standalone';
  mode?: LocalImageToolMode;
}>;

export const FREE_TOOL_SECTION_ORDER = ['image', 'video'] as const satisfies readonly FreeToolSectionKey[];

export const FREE_TOOL_DEFINITIONS = freeToolsCatalog.map((tool) => ({
  ...tool,
  path: buildFreeToolPath(tool.slug),
  metadataKey: buildFreeToolMetadataKey(tool.copyKey),
  lastModifiedIso: FREE_TOOLS_LAST_MODIFIED_ISO,
})) as readonly FreeToolDefinition[];

export const FREE_TOOL_SLUGS = FREE_TOOL_DEFINITIONS.map((tool) => tool.slug);
export const FREE_TOOL_PATHS = FREE_TOOL_DEFINITIONS.map((tool) => tool.path);
export const FREE_TOOL_LAST_MODIFIED_ISO = Object.fromEntries(
  FREE_TOOL_DEFINITIONS.map((tool) => [tool.path, tool.lastModifiedIso])
) as Record<string, string>;

export function getFreeToolBySlug(slug: string) {
  return FREE_TOOL_DEFINITIONS.find((tool) => tool.slug === slug);
}

export function getFreeToolByCopyKey(copyKey: FreeToolCopyKey) {
  return FREE_TOOL_DEFINITIONS.find((tool) => tool.copyKey === copyKey);
}
