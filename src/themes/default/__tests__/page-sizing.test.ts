import { describe, expect, it } from 'vitest';

import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';

describe('landing page sizing contract', () => {
  it('keeps public typography aligned to a readable Material-style scale', () => {
    const typographyClasses = Object.values(publicPageTypography).join(' ');

    expect(publicPageTypography.eyebrow).toContain('text-xs');
    expect(publicPageTypography.heroTitle).toContain('text-[2.25rem]');
    expect(publicPageTypography.heroTitle).toContain('sm:text-[2.8125rem]');
    expect(publicPageTypography.heroTitle).toContain('lg:text-[3.5625rem]');
    expect(publicPageTypography.heroTitle).toContain('lg:leading-[4rem]');
    expect(publicPageTypography.sectionTitle).toContain('text-2xl');
    expect(publicPageTypography.sectionTitle).toContain('md:text-[1.75rem]');
    expect(publicPageTypography.sectionTitle).toContain('lg:text-3xl');
    expect(publicPageTypography.cardDescription).toContain('text-sm');
    expect(publicPageTypography.sectionDescription).toContain('md:text-base');
    expect(typographyClasses).not.toMatch(
      /text-\[(10|10\.5|11|12\.5|13|13\.5)px\]/
    );
  });

  it('keeps public H1 headers on the shared compact single-line contract', () => {
    expect(publicPageTypography.pageHeaderTitle).toBe(
      publicPageTypography.generatorHeaderTitle
    );
    expect(publicPageTypography.pageHeaderTitle).toContain('text-2xl');
    expect(publicPageTypography.pageHeaderTitle).toContain('md:text-[1.75rem]');
    expect(publicPageTypography.pageHeaderTitle).toContain('lg:text-3xl');
    expect(publicPageTypography.pageHeaderTitle).toContain(
      'lg:whitespace-nowrap'
    );
    expect(publicPageTypography.pageHeaderTitle).not.toContain(
      'text-[2.25rem]'
    );
    expect(publicPageTypography.pageHeaderTitle).not.toContain(
      'lg:text-[3.5625rem]'
    );
    expect(publicPageTypography.pageHeaderTitle).not.toContain('text-balance');

    expect(publicPageTypography.pageHeaderDescription).toBe(
      publicPageTypography.generatorHeaderDescription
    );
    expect(publicPageTypography.pageHeaderDescription).toContain('max-w-6xl');
    expect(publicPageTypography.pageHeaderDescription).toContain('text-sm');
    expect(publicPageTypography.pageHeaderDescription).toContain('leading-6');
    expect(publicPageTypography.pageHeaderDescription).toContain(
      'lg:whitespace-nowrap'
    );
    expect(publicPageTypography.pageHeaderDescription).not.toContain(
      'text-pretty'
    );
  });

  it('keeps public page media frames ratio based and viewport aware', () => {
    expect(publicPageMedia.comparisonFrame).toContain('aspect-[4/3]');
    expect(publicPageMedia.comparisonFrame).toContain('min-h-[15rem]');
    expect(publicPageMedia.comparisonFrame).toContain('lg:min-h-[18rem]');
    expect(publicPageMedia.galleryCard).toContain('w-[min(84vw,400px)]');
    expect(publicPageMedia.toolPreviewFrame).toContain('aspect-[4/3]');
    expect(publicPageMedia.toolPreviewFrame).not.toContain('h-60');
  });
});
