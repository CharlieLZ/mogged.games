export type PaletteSwatch = {
  hex: string;
  population: number;
  rgb: [number, number, number];
  textColor: string;
};

type ExtractPaletteOptions = {
  colorCount?: number;
  sampleStride?: number;
};

const DARK_TEXT_HEX = '#111827';
const LIGHT_TEXT_HEX = '#ffffff';

function clampByte(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

function quantizeColorChannel(value: number) {
  return Math.min(255, Math.round(clampByte(value) / 32) * 32);
}

function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').trim();

  if (normalized.length !== 6) {
    return [0, 0, 0];
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function getRelativeLuminance(value: number) {
  const normalized = value / 255;

  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }

  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function getContrastRatio(
  foreground: [number, number, number],
  background: [number, number, number]
) {
  const foregroundLuminance =
    0.2126 * getRelativeLuminance(foreground[0]) +
    0.7152 * getRelativeLuminance(foreground[1]) +
    0.0722 * getRelativeLuminance(foreground[2]);
  const backgroundLuminance =
    0.2126 * getRelativeLuminance(background[0]) +
    0.7152 * getRelativeLuminance(background[1]) +
    0.0722 * getRelativeLuminance(background[2]);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => clampByte(value).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function getReadableTextColor(hex: string) {
  const background = parseHexColor(hex);
  const whiteContrast = getContrastRatio([255, 255, 255], background);
  const darkContrast = getContrastRatio([17, 24, 39], background);

  return whiteContrast >= darkContrast ? LIGHT_TEXT_HEX : DARK_TEXT_HEX;
}

export function extractPaletteFromPixels(
  pixels: Uint8ClampedArray,
  options: ExtractPaletteOptions = {}
) {
  const colorCount = Math.max(1, Math.min(12, options.colorCount ?? 6));
  const sampleStride = Math.max(1, Math.round(options.sampleStride ?? 1));
  const buckets = new Map<string, { count: number; rgb: [number, number, number] }>();

  for (let index = 0; index < pixels.length; index += 4 * sampleStride) {
    const alpha = pixels[index + 3];
    if ((alpha ?? 0) < 128) {
      continue;
    }

    const rgb: [number, number, number] = [
      quantizeColorChannel(pixels[index] ?? 0),
      quantizeColorChannel(pixels[index + 1] ?? 0),
      quantizeColorChannel(pixels[index + 2] ?? 0),
    ];
    const key = rgb.join(',');
    const current = buckets.get(key);

    if (current) {
      current.count += 1;
      continue;
    }

    buckets.set(key, {
      count: 1,
      rgb,
    });
  }

  return [...buckets.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, colorCount)
    .map(({ count, rgb }) => {
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);

      return {
        hex,
        population: count,
        rgb,
        textColor: getReadableTextColor(hex),
      } satisfies PaletteSwatch;
    });
}

export function buildPaletteCssVariables(swatches: PaletteSwatch[]) {
  const lines = swatches.map(
    (swatch, index) => `  --palette-${index + 1}: ${swatch.hex};`
  );

  return [':root {', ...lines, '}'].join('\n');
}

export function buildPaletteJson(swatches: PaletteSwatch[]) {
  return JSON.stringify(
    swatches.map((swatch, index) => ({
      token: `palette-${index + 1}`,
      hex: swatch.hex,
      rgb: swatch.rgb,
      population: swatch.population,
    })),
    null,
    2
  );
}
