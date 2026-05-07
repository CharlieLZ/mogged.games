import { afterEach, describe, expect, it, vi } from 'vitest';

function replaceBrandTokensDeepForTest<T>(input: T): T {
  if (typeof input === 'string') {
    return input
      .replaceAll('mogged', 'ExampleMotion 2.0')
      .replaceAll('mogged.games', 'examplemotion.ai') as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => replaceBrandTokensDeepForTest(item)) as T;
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        replaceBrandTokensDeepForTest(value),
      ])
    ) as T;
  }

  return input;
}

describe('ai generator seo branding', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@/shared/lib/brand');
  });

  it('normalizes root and mode seo copy through the shared brand token layer', async () => {
    vi.doMock('@/shared/lib/brand', () => ({
      replaceBrandTokensDeep: replaceBrandTokensDeepForTest,
    }));

    const { getGeneratorRootSeoCopy, getGeneratorModeSeoCopy } = await import(
      './ai-video-generator-seo'
    );

    const rootCopy = getGeneratorRootSeoCopy('en');
    const localizedRootCopy = getGeneratorRootSeoCopy('ar');
    const modeCopy = getGeneratorModeSeoCopy('ar', 'reference-to-video');

    expect(JSON.stringify(rootCopy)).toContain('ExampleMotion 2.0');
    expect(JSON.stringify(rootCopy)).not.toContain('mogged');
    expect(JSON.stringify(rootCopy)).not.toContain('mogged.games');

    expect(JSON.stringify(localizedRootCopy)).toContain('ExampleMotion 2.0');
    expect(JSON.stringify(localizedRootCopy)).toContain('examplemotion.ai');
    expect(JSON.stringify(localizedRootCopy)).not.toContain('mogged');
    expect(JSON.stringify(localizedRootCopy)).not.toContain(
      'mogged.games'
    );

    expect(JSON.stringify(modeCopy)).toContain('ExampleMotion 2.0');
    expect(JSON.stringify(modeCopy)).not.toContain('mogged');
    expect(JSON.stringify(modeCopy)).not.toContain('mogged.games');
  });
});
