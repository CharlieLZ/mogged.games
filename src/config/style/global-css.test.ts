import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('global CSS utility fallbacks', () => {
  it('keeps explicit aspect ratio utilities for fill-based image panels', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/config/style/global.css'),
      'utf8'
    );

    expect(css).toMatch(/\[class~=['"]aspect-\[6\/5\]['"]\]/);
    expect(css).toContain('aspect-ratio: 6 / 5;');
    expect(css).toMatch(/\[class~=['"]aspect-\[4\/3\]['"]\]/);
    expect(css).toContain('aspect-ratio: 4 / 3;');
    expect(css).toMatch(/\[class~=['"]md:aspect-square['"]\]/);
    expect(css).toContain('aspect-ratio: 1 / 1;');
  });

  it('keeps public header typography fallbacks for classes used from shared TS constants', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/config/style/global.css'),
      'utf8'
    );

    expect(css).toContain('.text-\\[2\\.25rem\\]');
    expect(css).toContain('font-size: 2.25rem;');
    expect(css).toContain('.leading-\\[2\\.75rem\\]');
    expect(css).toContain('line-height: 2.75rem;');
    expect(css).toContain('.sm\\:text-\\[2\\.8125rem\\]');
    expect(css).toContain('font-size: 2.8125rem;');
    expect(css).toContain('.sm\\:leading-\\[3\\.25rem\\]');
    expect(css).toContain('line-height: 3.25rem;');
    expect(css).toContain('.lg\\:text-\\[3\\.5625rem\\]');
    expect(css).toContain('font-size: 3.5625rem;');
    expect(css).toContain('.lg\\:leading-\\[4rem\\]');
    expect(css).toContain('line-height: 4rem;');
    expect(css).toContain('.lg\\:whitespace-nowrap');
    expect(css).toContain('.xl\\:whitespace-nowrap');
    expect(css).toContain('white-space: nowrap;');
  });

  it('defines the shared final CTA gradient animation tokens', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/config/style/global.css'),
      'utf8'
    );

    expect(css).toContain(
      '--animate-home-final-cta-gradient: home-final-cta-gradient 18s ease infinite;'
    );
    expect(css).toContain('@keyframes home-final-cta-gradient');
    expect(css).toContain('background-position: 0% 50%;');
    expect(css).toContain('background-position: 100% 50%;');
  });
});
