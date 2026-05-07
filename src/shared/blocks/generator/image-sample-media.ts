import { resolveAppLocale, type AppLocale } from '@/config/locale';
import { IMAGEEDITORAI_IMAGE_PREVIEW_PLACEHOLDER_BASE_URL } from '@/shared/lib/imageeditorai-media';

import type { ImageGeneratorMode } from './image-generator-mode';

export type ImageSampleMediaItem = {
  id: string;
  url: string;
  type: 'image';
  alt: string;
  isSample: true;
};

type ImageSampleCopy = {
  textToImageAlt: string;
  imageToImageAlt: string;
};

const IMAGE_PREVIEW_PLACEHOLDER_URLS = {
  styleTransfer: `${IMAGEEDITORAI_IMAGE_PREVIEW_PLACEHOLDER_BASE_URL}/StyleTransfer.webp`,
  textRendering: `${IMAGEEDITORAI_IMAGE_PREVIEW_PLACEHOLDER_BASE_URL}/TextRendering.webp`,
  worldKnowledgeModel: `${IMAGEEDITORAI_IMAGE_PREVIEW_PLACEHOLDER_BASE_URL}/WorldKnowledgeModel.webp`,
  fourK: `${IMAGEEDITORAI_IMAGE_PREVIEW_PLACEHOLDER_BASE_URL}/4k.webp`,
} as const;

const IMAGE_SAMPLE_COPY: Record<AppLocale, ImageSampleCopy> = {
  en: {
    textToImageAlt: 'Sample mogged text-to-image preview',
    imageToImageAlt: 'Sample mogged image-to-image preview',
  },
  zh: {
    textToImageAlt: 'mogged 文生图示例预览',
    imageToImageAlt: 'mogged 图生图示例预览',
  },
  de: {
    textToImageAlt: 'mogged Text-zu-Bild-Beispielvorschau',
    imageToImageAlt: 'mogged Bild-zu-Bild-Beispielvorschau',
  },
  fr: {
    textToImageAlt: 'Aperçu d’exemple mogged texte vers image',
    imageToImageAlt: 'Aperçu d’exemple mogged image vers image',
  },
  es: {
    textToImageAlt: 'Vista previa de muestra mogged texto a imagen',
    imageToImageAlt: 'Vista previa de muestra mogged imagen a imagen',
  },
  ja: {
    textToImageAlt: 'mogged 文から画像のサンプルプレビュー',
    imageToImageAlt: 'mogged 画像から画像のサンプルプレビュー',
  },
  it: {
    textToImageAlt: 'Anteprima di esempio mogged testo in immagine',
    imageToImageAlt:
      'Anteprima di esempio mogged immagine in immagine',
  },
  ko: {
    textToImageAlt: 'mogged 텍스트-이미지 샘플 미리보기',
    imageToImageAlt: 'mogged 이미지-이미지 샘플 미리보기',
  },
  ar: {
    textToImageAlt: 'معاينة تجريبية لتحويل النص إلى صورة من mogged',
    imageToImageAlt: 'معاينة تجريبية لتحويل الصورة إلى صورة من mogged',
  },
};

export function getImageSampleMedia(mode: ImageGeneratorMode, locale?: string) {
  const copy = IMAGE_SAMPLE_COPY[resolveAppLocale(locale)];

  const sampleMedia: Record<
    ImageGeneratorMode,
    readonly ImageSampleMediaItem[]
  > = {
    'text-to-image': [
      {
        id: 'sample-text-to-image',
        url: IMAGE_PREVIEW_PLACEHOLDER_URLS.textRendering,
        type: 'image',
        alt: copy.textToImageAlt,
        isSample: true,
      },
      {
        id: 'sample-text-to-image-style-transfer',
        url: IMAGE_PREVIEW_PLACEHOLDER_URLS.styleTransfer,
        type: 'image',
        alt: copy.textToImageAlt,
        isSample: true,
      },
      {
        id: 'sample-text-to-image-world-knowledge',
        url: IMAGE_PREVIEW_PLACEHOLDER_URLS.worldKnowledgeModel,
        type: 'image',
        alt: copy.textToImageAlt,
        isSample: true,
      },
      {
        id: 'sample-text-to-image-4k',
        url: IMAGE_PREVIEW_PLACEHOLDER_URLS.fourK,
        type: 'image',
        alt: copy.textToImageAlt,
        isSample: true,
      },
    ],
    'image-to-image': [
      {
        id: 'sample-image-to-image',
        url: IMAGE_PREVIEW_PLACEHOLDER_URLS.styleTransfer,
        type: 'image',
        alt: copy.imageToImageAlt,
        isSample: true,
      },
      {
        id: 'sample-image-to-image-text-rendering',
        url: IMAGE_PREVIEW_PLACEHOLDER_URLS.textRendering,
        type: 'image',
        alt: copy.imageToImageAlt,
        isSample: true,
      },
      {
        id: 'sample-image-to-image-world-knowledge',
        url: IMAGE_PREVIEW_PLACEHOLDER_URLS.worldKnowledgeModel,
        type: 'image',
        alt: copy.imageToImageAlt,
        isSample: true,
      },
      {
        id: 'sample-image-to-image-4k',
        url: IMAGE_PREVIEW_PLACEHOLDER_URLS.fourK,
        type: 'image',
        alt: copy.imageToImageAlt,
        isSample: true,
      },
    ],
  };

  return sampleMedia[mode] ?? [];
}
