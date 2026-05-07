import { describe, expect, it } from 'vitest';

import {
  buildPaletteCssVariables,
  extractPaletteFromPixels,
  getReadableTextColor,
  rgbToHex,
} from './color-palette';

describe('color palette helpers', () => {
  it('converts RGB tuples into lowercase hex values', () => {
    expect(rgbToHex(255, 128, 0)).toBe('#ff8000');
    expect(rgbToHex(12, 34, 56)).toBe('#0c2238');
  });

  it('chooses readable foreground colors for dark and light swatches', () => {
    expect(getReadableTextColor('#101820')).toBe('#ffffff');
    expect(getReadableTextColor('#f6efe2')).toBe('#111827');
  });

  it('extracts a stable dominant palette from pixel data', () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0,
      255, 255, 0, 255, 0, 255, 255, 255, 255, 0,
    ]);

    expect(extractPaletteFromPixels(pixels, { colorCount: 3 })).toEqual([
      expect.objectContaining({
        hex: '#ff0000',
        population: 3,
        textColor: '#111827',
      }),
      expect.objectContaining({
        hex: '#0000ff',
        population: 2,
        textColor: '#ffffff',
      }),
      expect.objectContaining({
        hex: '#00ff00',
        population: 1,
        textColor: '#111827',
      }),
    ]);
  });

  it('builds CSS custom properties from extracted swatches', () => {
    expect(
      buildPaletteCssVariables([
        { hex: '#112233', population: 4, rgb: [17, 34, 51], textColor: '#fff' },
        { hex: '#f0e0d0', population: 2, rgb: [240, 224, 208], textColor: '#000' },
      ])
    ).toBe(':root {\n  --palette-1: #112233;\n  --palette-2: #f0e0d0;\n}');
  });
});
