type ShowcaseAssetKey =
  | 'coffee'
  | 'journal'
  | 'poster'
  | 'perfume'
  | 'santorini'
  | 'story'
  | 'basket'
  | 'collage';

export type { ShowcaseAssetKey };

export type ShowcaseImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

const SHOWCASE_IMAGE_WIDTH = 1536;
const SHOWCASE_IMAGE_HEIGHT = 1152;
const SHOWCASE_ASSET_PREFIX =
  'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/';

export const SHOWCASE_ASSET_MANIFEST = {
  coffee: {
    filename: 'effects1.webp',
    src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects1.webp',
  },
  journal: {
    filename: 'effects2.webp',
    src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects2.webp',
  },
  perfume: {
    filename: 'effects3.webp',
    src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects3.webp',
  },
  poster: {
    filename: 'effects4.webp',
    src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects4.webp',
  },
  santorini: {
    filename: 'features1.webp',
    src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features1.webp',
  },
  story: {
    filename: 'features2.webp',
    src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features2.webp',
  },
  basket: {
    filename: 'features3.webp',
    src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features3.webp',
  },
  collage: {
    filename: 'main.webp',
    src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/main.webp',
  },
} as const satisfies Record<
  ShowcaseAssetKey,
  {
    filename: string;
    src: `${typeof SHOWCASE_ASSET_PREFIX}${string}`;
  }
>;

export function createShowcaseImage(
  key: ShowcaseAssetKey,
  alt: string
): ShowcaseImage {
  if (!alt.trim()) {
    throw new Error(
      `[ai-image-generator-showcase] missing alt text for ${key}`
    );
  }

  const asset = SHOWCASE_ASSET_MANIFEST[key];

  if (!asset.src.startsWith(SHOWCASE_ASSET_PREFIX)) {
    throw new Error(
      `[ai-image-generator-showcase] invalid showcase asset url for ${key}`
    );
  }

  return {
    src: asset.src,
    alt,
    width: SHOWCASE_IMAGE_WIDTH,
    height: SHOWCASE_IMAGE_HEIGHT,
  };
}
