import { describe, expect, it } from 'vitest';

import {
  clampImageRect,
  getImageOutputFileName,
  getRotatedDimensions,
  isBrowserSafeImageSize,
} from './image-processing';

describe('local image processing helpers', () => {
  it('clamps crop rectangles inside the source image', () => {
    expect(
      clampImageRect(
        { x: -20, y: 40, width: 900, height: 0 },
        { width: 640, height: 480 }
      )
    ).toEqual({ x: 0, y: 40, width: 640, height: 1 });

    expect(
      clampImageRect(
        { x: 500, y: 400, width: 300, height: 300 },
        { width: 640, height: 480 }
      )
    ).toEqual({ x: 500, y: 400, width: 140, height: 80 });
  });

  it('keeps browser image work inside a bounded pixel budget', () => {
    expect(isBrowserSafeImageSize(4000, 3000)).toBe(true);
    expect(isBrowserSafeImageSize(12000, 12000)).toBe(false);
    expect(isBrowserSafeImageSize(0, 3000)).toBe(false);
  });

  it('calculates rotated canvas dimensions for right-angle rotations', () => {
    expect(getRotatedDimensions(1200, 800, 90)).toEqual({
      width: 800,
      height: 1200,
    });
    expect(getRotatedDimensions(1200, 800, 180)).toEqual({
      width: 1200,
      height: 800,
    });
  });

  it('builds stable output names from the source file and target format', () => {
    expect(
      getImageOutputFileName(
        new File(['x'], 'hero.photo.png', { type: 'image/png' }),
        'cropped',
        'jpeg'
      )
    ).toBe('hero.photo-cropped.jpg');
    expect(getImageOutputFileName(null, 'upscaled', 'webp')).toBe(
      'image-upscaled.webp'
    );
  });
});
