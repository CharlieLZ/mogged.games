import { describe, expect, it } from 'vitest';

import { getLocalizedAlternates, getLocalizedUrl } from './seo';

describe('seo localized urls', () => {
  it('uses the root path for the default english locale', () => {
    expect(getLocalizedUrl('/', 'en')).toMatch(/https?:\/\/[^/]+$/);
    expect(getLocalizedUrl('/pricing', 'en')).toMatch(
      /https?:\/\/[^/]+\/pricing$/
    );
    expect(getLocalizedAlternates('/pricing').languages).toEqual({
      en: expect.stringMatching(/https?:\/\/[^/]+\/pricing$/),
      zh: expect.stringMatching(/https?:\/\/[^/]+\/zh\/pricing$/),
      de: expect.stringMatching(/https?:\/\/[^/]+\/de\/pricing$/),
      fr: expect.stringMatching(/https?:\/\/[^/]+\/fr\/pricing$/),
      es: expect.stringMatching(/https?:\/\/[^/]+\/es\/pricing$/),
      ja: expect.stringMatching(/https?:\/\/[^/]+\/ja\/pricing$/),
      it: expect.stringMatching(/https?:\/\/[^/]+\/it\/pricing$/),
      ko: expect.stringMatching(/https?:\/\/[^/]+\/ko\/pricing$/),
      ar: expect.stringMatching(/https?:\/\/[^/]+\/ar\/pricing$/),
      'x-default': expect.stringMatching(/https?:\/\/[^/]+\/pricing$/),
    });
  });

  it('normalizes accidental locale-prefixed inputs before building alternates', () => {
    expect(getLocalizedUrl('/en/pricing', 'en')).toMatch(
      /https?:\/\/[^/]+\/pricing$/
    );
    expect(getLocalizedAlternates('/en/pricing').languages).toEqual({
      en: expect.stringMatching(/https?:\/\/[^/]+\/pricing$/),
      zh: expect.stringMatching(/https?:\/\/[^/]+\/zh\/pricing$/),
      de: expect.stringMatching(/https?:\/\/[^/]+\/de\/pricing$/),
      fr: expect.stringMatching(/https?:\/\/[^/]+\/fr\/pricing$/),
      es: expect.stringMatching(/https?:\/\/[^/]+\/es\/pricing$/),
      ja: expect.stringMatching(/https?:\/\/[^/]+\/ja\/pricing$/),
      it: expect.stringMatching(/https?:\/\/[^/]+\/it\/pricing$/),
      ko: expect.stringMatching(/https?:\/\/[^/]+\/ko\/pricing$/),
      ar: expect.stringMatching(/https?:\/\/[^/]+\/ar\/pricing$/),
      'x-default': expect.stringMatching(/https?:\/\/[^/]+\/pricing$/),
    });
  });

  it('builds localized urls for every live public locale', () => {
    expect(getLocalizedUrl('/pricing', 'fr')).toMatch(
      /https?:\/\/[^/]+\/fr\/pricing$/
    );
    expect(getLocalizedAlternates('/pricing').languages.fr).toMatch(
      /https?:\/\/[^/]+\/fr\/pricing$/
    );
    expect(getLocalizedAlternates('/pricing').languages.it).toMatch(
      /https?:\/\/[^/]+\/it\/pricing$/
    );
    expect(getLocalizedAlternates('/pricing').languages.ko).toMatch(
      /https?:\/\/[^/]+\/ko\/pricing$/
    );
    expect(getLocalizedAlternates('/pricing').languages.ar).toMatch(
      /https?:\/\/[^/]+\/ar\/pricing$/
    );
  });
});
