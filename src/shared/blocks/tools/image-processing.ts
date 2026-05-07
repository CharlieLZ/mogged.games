export const MAX_BROWSER_IMAGE_PIXELS = 48_000_000;
export const MAX_BROWSER_IMAGE_SIDE = 12_000;

export type ImageOutputFormat = 'png' | 'jpeg' | 'webp';

export type ImageRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageDimensions = {
  width: number;
  height: number;
};

const outputFormatExtensions: Record<ImageOutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

export const outputFormatMimeTypes: Record<ImageOutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function isBrowserSafeImageSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return false;
  }

  if (width <= 0 || height <= 0) {
    return false;
  }

  if (width > MAX_BROWSER_IMAGE_SIDE || height > MAX_BROWSER_IMAGE_SIDE) {
    return false;
  }

  return width * height <= MAX_BROWSER_IMAGE_PIXELS;
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.round(value), min), max);
}

export function clampImageRect(
  rect: ImageRect,
  source: ImageDimensions
): ImageRect {
  const sourceWidth = Math.max(1, Math.round(source.width));
  const sourceHeight = Math.max(1, Math.round(source.height));
  const x = clampInteger(rect.x, 0, sourceWidth - 1);
  const y = clampInteger(rect.y, 0, sourceHeight - 1);
  const width = clampInteger(rect.width, 1, sourceWidth - x);
  const height = clampInteger(rect.height, 1, sourceHeight - y);

  return { x, y, width, height };
}

export function getRotatedDimensions(
  width: number,
  height: number,
  angle: number
): ImageDimensions {
  const normalizedAngle = ((angle % 360) + 360) % 360;

  if (normalizedAngle === 90 || normalizedAngle === 270) {
    return { width: height, height: width };
  }

  return { width, height };
}

export function getImageOutputFileName(
  file: File | null,
  suffix: string,
  format: ImageOutputFormat
) {
  const sourceName = file?.name?.replace(/\.[^/.]+$/, '') || 'image';
  const extension = outputFormatExtensions[format];

  return `${sourceName}-${suffix}.${extension}`;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageOutputFormat,
  quality: number
) {
  const mimeType = outputFormatMimeTypes[format];
  const outputQuality = format === 'png' ? undefined : quality;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas export failed'));
        }
      },
      mimeType,
      outputQuality
    );
  });
}
