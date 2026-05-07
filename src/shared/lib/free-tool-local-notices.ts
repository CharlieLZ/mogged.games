import { resolveAppLocale } from '@/config/locale';
import type { FreeToolCopyKey } from '@/shared/lib/free-tools-catalog';

export type FreeToolLocalNoticeKey = FreeToolCopyKey;

const FREE_TOOL_LOCAL_NOTICE_OVERRIDES = {
  en: {
    image_converter:
      'Convert image formats locally before upload, review, or handoff.',
    image_color_extractor:
      'Extract a local palette before design review, token cleanup, or frontend handoff.',
    image_compressor:
      'Compress images locally before sending review links or exports.',
    image_cropper:
      'Crop local images before upload, publishing, or client review.',
    image_resizer:
      'Resize image dimensions locally before upload, storefront, or docs.',
    image_upscaler:
      'Upscale local images for layout checks and quick review passes.',
    image_rotator:
      'Fix image orientation locally before upload or publishing.',
    image_metadata_remover:
      'Create a cleaner local copy before sharing private images.',
    video_converter:
      'Convert local video formats before review, embeds, or handoff.',
    video_trimmer:
      'Trim local video clips before review, GIF export, or final handoff.',
    video_to_gif: 'Turn short local clips into looping GIF previews.',
    video_thumbnail:
      'Capture a clean local frame for covers, listings, or docs.',
  },
  zh: {
    image_converter: '本地完成图片格式转换，再上传、评审或交付。',
    image_color_extractor: '先在本地提取配色和 HEX，再做设计评审或前端交接。',
    image_compressor: '先在本地压小图片，再发评审链接或导出交付。',
    image_cropper: '先在本地裁好图，再上传、发布或给客户评审。',
    image_resizer: '先在本地改好图片尺寸，再上传到商品页或文档。',
    image_upscaler: '先在本地放大图片，再做排版检查和快速评审。',
    image_rotator: '先在本地修正图片方向，再上传或发布。',
    image_metadata_remover: '先在本地生成更干净的副本，再分享敏感图片。',
    video_converter: '先在本地统一视频格式，再做评审、嵌入或交付。',
    video_trimmer: '先在本地裁好视频片段，再做评审、转 GIF 或交付。',
    video_to_gif: '把短视频先在本地转成循环 GIF 预览。',
    video_thumbnail: '先在本地抓一帧清晰封面图，再放到列表或文档里。',
  },
} as const satisfies Partial<
  Record<'en' | 'zh', Record<FreeToolLocalNoticeKey, string>>
>;

export function getFreeToolLocalNotice(
  locale: string,
  toolKey: FreeToolLocalNoticeKey
) {
  const normalizedLocale = resolveAppLocale(locale);

  if (normalizedLocale !== 'en' && normalizedLocale !== 'zh') {
    return undefined;
  }

  return FREE_TOOL_LOCAL_NOTICE_OVERRIDES[normalizedLocale][toolKey];
}
