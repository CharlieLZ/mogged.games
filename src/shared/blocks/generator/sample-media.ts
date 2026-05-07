import {
  IMAGEEDITORAI_REMOTE_VIDEO_POSTER,
  getImageEditorAiHomeVideoSampleUrl,
  getImageEditorAiMediaUrl,
} from '@/shared/lib/imageeditorai-media';
import { getLandingPreviewSampleVideos } from '@/shared/lib/landing-showcase-videos';
import { resolveAppLocale, type AppLocale } from '@/config/locale';

import type { VideoGeneratorMode } from './video-generator-mode';

export type GeneratorSampleMediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
  alt: string;
  aspectRatio?: 'landscape' | 'portrait';
  posterUrl?: string;
  mimeType?: string;
  isSample: true;
};

type SampleMediaCopy = {
  imageToVideoAlt: string;
  referenceToVideoAlt: string;
};

const SAMPLE_MEDIA_COPY: Record<AppLocale, SampleMediaCopy> = {
  en: {
    imageToVideoAlt: 'Sample mogged first and last frame preview',
    referenceToVideoAlt: 'Sample mogged omni-reference preview',
  },
  zh: {
    imageToVideoAlt: 'mogged 首尾帧示例预览',
    referenceToVideoAlt: 'mogged 多参考示例预览',
  },
  de: {
    imageToVideoAlt: 'Beispielvorschau für ersten und letzten Frame von mogged',
    referenceToVideoAlt: 'Multireferenz-Beispielvorschau von mogged',
  },
  fr: {
    imageToVideoAlt: 'Aperçu d’exemple premier et dernier frame mogged',
    referenceToVideoAlt: 'Aperçu d’exemple multi-références mogged',
  },
  es: {
    imageToVideoAlt: 'Vista previa de muestra de primer y último fotograma de mogged',
    referenceToVideoAlt: 'Vista previa de muestra con múltiples referencias de mogged',
  },
  ja: {
    imageToVideoAlt: 'mogged の開始フレームと終了フレームのサンプルプレビュー',
    referenceToVideoAlt: 'mogged のマルチリファレンスサンプルプレビュー',
  },
  it: {
    imageToVideoAlt: 'Anteprima di esempio del primo e ultimo fotogramma di mogged',
    referenceToVideoAlt: 'Anteprima di esempio multi-riferimento di mogged',
  },
  ko: {
    imageToVideoAlt: 'mogged 첫 프레임과 마지막 프레임 샘플 미리보기',
    referenceToVideoAlt: 'mogged 멀티 레퍼런스 샘플 미리보기',
  },
  ar: {
    imageToVideoAlt: 'معاينة تجريبية للإطار الأول والأخير من mogged',
    referenceToVideoAlt: 'معاينة تجريبية متعددة المراجع من mogged',
  },
};
export function getGeneratorSampleMedia(
  mode: VideoGeneratorMode,
  locale?: string
) {
  const copy = SAMPLE_MEDIA_COPY[resolveAppLocale(locale)];
  const sampleMedia: Record<VideoGeneratorMode, readonly GeneratorSampleMediaItem[]> =
    {
      'text-to-video': getLandingPreviewSampleVideos(locale).map((item) => ({
        id: item.id,
        url: item.src,
        type: 'video' as const,
        alt: item.title,
        aspectRatio: item.aspectRatio,
        posterUrl: IMAGEEDITORAI_REMOTE_VIDEO_POSTER,
        mimeType: 'video/mp4',
        isSample: true as const,
      })),
      'image-to-video': [
        {
          id: 'sample-image-to-video',
          url: getImageEditorAiHomeVideoSampleUrl(1),
          type: 'video',
          alt: copy.imageToVideoAlt,
          aspectRatio: 'landscape',
          posterUrl: IMAGEEDITORAI_REMOTE_VIDEO_POSTER,
          mimeType: 'video/mp4',
          isSample: true,
        },
      ],
      'reference-to-video': [
        {
          id: 'sample-reference-to-video',
          url: getImageEditorAiHomeVideoSampleUrl(5),
          type: 'video',
          alt: copy.referenceToVideoAlt,
          aspectRatio: 'landscape',
          posterUrl: getImageEditorAiMediaUrl('nativeAudio'),
          mimeType: 'video/mp4',
          isSample: true,
        },
      ],
    };

  return sampleMedia[mode] ?? [];
}
