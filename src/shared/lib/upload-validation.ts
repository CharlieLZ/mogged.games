export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
] as const;

export const ALL_ALLOWED_UPLOAD_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
] as const;

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

function hasBytes(sample: Buffer, ...values: number[]) {
  return values.every((value, index) => sample[index] === value);
}

function hasAscii(sample: Buffer, offset: number, text: string) {
  return sample.subarray(offset, offset + text.length).toString('ascii') === text;
}

export function getUploadCategory(mimeType: string) {
  if (IMAGE_MIME_TYPES.includes(mimeType as (typeof IMAGE_MIME_TYPES)[number])) {
    return 'image';
  }

  if (VIDEO_MIME_TYPES.includes(mimeType as (typeof VIDEO_MIME_TYPES)[number])) {
    return 'video';
  }

  if (AUDIO_MIME_TYPES.includes(mimeType as (typeof AUDIO_MIME_TYPES)[number])) {
    return 'audio';
  }

  return null;
}

export function getMaxUploadSize(mimeType: string) {
  const category = getUploadCategory(mimeType);
  if (!category) {
    return null;
  }

  return category === 'image' ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
}

export function validateFileSignature(sample: Buffer, mimeType: string) {
  if (!sample.length) {
    return false;
  }

  switch (mimeType) {
    case 'image/jpeg':
      return hasBytes(sample, 0xff, 0xd8, 0xff);
    case 'image/png':
      return hasBytes(sample, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/gif':
      return hasAscii(sample, 0, 'GIF87a') || hasAscii(sample, 0, 'GIF89a');
    case 'image/webp':
      return hasAscii(sample, 0, 'RIFF') && hasAscii(sample, 8, 'WEBP');
    case 'image/avif':
      return hasAscii(sample, 4, 'ftyp') && ['avif', 'avis'].includes(sample.subarray(8, 12).toString('ascii'));
    case 'video/mp4':
    case 'video/quicktime':
    case 'audio/mp4': {
      if (!hasAscii(sample, 4, 'ftyp')) {
        return false;
      }

      const brand = sample.subarray(8, 12).toString('ascii');
      if (mimeType === 'video/quicktime') {
        return brand === 'qt  ';
      }

      return ['isom', 'iso5', 'iso6', 'mp41', 'mp42', 'M4A ', 'avc1'].includes(
        brand
      );
    }
    case 'video/webm':
    case 'audio/webm':
      return hasBytes(sample, 0x1a, 0x45, 0xdf, 0xa3);
    case 'audio/mpeg':
      return hasAscii(sample, 0, 'ID3') || sample[0] === 0xff;
    case 'audio/wav':
      return hasAscii(sample, 0, 'RIFF') && hasAscii(sample, 8, 'WAVE');
    case 'audio/ogg':
      return hasAscii(sample, 0, 'OggS');
    default:
      return false;
  }
}
