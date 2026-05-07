import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Rgb = readonly [number, number, number];

function extractBlock(css: string, selector: ':root' | '.dark') {
  const block = css.match(new RegExp(`${selector.replace('.', '\\.')}\\s*{([\\s\\S]*?)}`))?.[1];

  if (!block) {
    throw new Error(`Missing ${selector} theme block.`);
  }

  return block;
}

function extractToken(block: string, name: string) {
  const value = block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();

  if (!value) {
    throw new Error(`Missing theme token ${name}.`);
  }

  return value;
}

function parseOklch(value: string) {
  const match = value.match(
    /^oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)$/i
  );

  if (!match) {
    throw new Error(`Expected OKLCH token, received ${value}.`);
  }

  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
  };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function oklchToRgb(value: string): Rgb {
  const parsed = parseOklch(value);
  const angle = (parsed.h * Math.PI) / 180;
  const a = parsed.c * Math.cos(angle);
  const b = parsed.c * Math.sin(angle);

  const l_ = parsed.l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = parsed.l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = parsed.l - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const linearR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const convert = (channel: number) => {
    const clamped = clamp01(channel);

    if (clamped <= 0.0031308) {
      return 12.92 * clamped;
    }

    return 1.055 * clamped ** (1 / 2.4) - 0.055;
  };

  return [convert(linearR), convert(linearG), convert(linearB)];
}

function linearize(channel: number) {
  if (channel <= 0.03928) {
    return channel / 12.92;
  }

  return ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: Rgb) {
  return (
    0.2126 * linearize(rgb[0]) +
    0.7152 * linearize(rgb[1]) +
    0.0722 * linearize(rgb[2])
  );
}

function contrastRatio(a: Rgb, b: Rgb) {
  const first = luminance(a);
  const second = luminance(b);

  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function getColor(block: string, token: string) {
  return oklchToRgb(extractToken(block, token));
}

const themeCss = readFileSync(
  join(process.cwd(), 'src/config/style/theme.css'),
  'utf8'
);

describe('theme contrast tokens', () => {
  it('keeps semantic theme colors in the OKLCH token system', () => {
    const root = extractBlock(themeCss, ':root');
    const dark = extractBlock(themeCss, '.dark');
    const semanticTokens = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--success',
      '--success-foreground',
      '--warning',
      '--warning-foreground',
      '--border',
      '--input',
      '--ring',
    ];

    for (const block of [root, dark]) {
      for (const token of semanticTokens) {
        expect(() => parseOklch(extractToken(block, token))).not.toThrow();
      }
    }
  });

  it('meets text contrast for light and dark semantic foreground pairs', () => {
    const cases = [
      {
        block: extractBlock(themeCss, ':root'),
        pairs: [
          ['--foreground', '--background'],
          ['--card-foreground', '--card'],
          ['--popover-foreground', '--popover'],
          ['--primary-foreground', '--primary'],
          ['--secondary-foreground', '--secondary'],
          ['--muted-foreground', '--muted'],
          ['--accent-foreground', '--accent'],
          ['--destructive-foreground', '--destructive'],
          ['--success-foreground', '--success'],
          ['--warning-foreground', '--warning'],
        ],
      },
      {
        block: extractBlock(themeCss, '.dark'),
        pairs: [
          ['--foreground', '--background'],
          ['--card-foreground', '--card'],
          ['--popover-foreground', '--popover'],
          ['--primary-foreground', '--primary'],
          ['--secondary-foreground', '--secondary'],
          ['--muted-foreground', '--muted'],
          ['--accent-foreground', '--accent'],
          ['--destructive-foreground', '--destructive'],
          ['--success-foreground', '--success'],
          ['--warning-foreground', '--warning'],
        ],
      },
    ] as const;

    for (const item of cases) {
      for (const [foreground, background] of item.pairs) {
        const ratio = contrastRatio(
          getColor(item.block, foreground),
          getColor(item.block, background)
        );

        expect(ratio, `${foreground} on ${background}`).toBeGreaterThanOrEqual(
          4.5
        );
      }
    }
  });

  it('keeps input and focus indicators visible against page surfaces', () => {
    const cases = [
      extractBlock(themeCss, ':root'),
      extractBlock(themeCss, '.dark'),
    ];

    for (const block of cases) {
      for (const surface of ['--background', '--card']) {
        expect(
          contrastRatio(getColor(block, '--border'), getColor(block, surface)),
          `--border on ${surface}`
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(getColor(block, '--input'), getColor(block, surface)),
          `--input on ${surface}`
        ).toBeGreaterThanOrEqual(3);
      }

      expect(
        contrastRatio(getColor(block, '--ring'), getColor(block, '--background')),
        '--ring on --background'
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
