import { afterEach, describe, expect, it, vi } from 'vitest';

describe('loadMessages', () => {
  afterEach(() => {
    vi.doUnmock('node:fs/promises');
    vi.resetModules();
  });

  it('loads bundled locale messages when runtime filesystem reads are unavailable', async () => {
    vi.doMock('server-only', () => ({}));
    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(async () => {
        throw new Error('filesystem unavailable');
      }),
    }));

    const { loadMessages } = await import('./load-messages');

    const messages = (await loadMessages('landing', 'en', {})) as {
      hero?: { title?: string };
      seo_sections?: { structured_data?: { alternate_names?: string[] } };
    };

    expect(messages.hero?.title).toEqual(expect.any(String));
    expect(
      messages.seo_sections?.structured_data?.alternate_names
    ).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it('fails early when a required locale message path is not configured', async () => {
    vi.doMock('server-only', () => ({}));

    const { loadMessages } = await import('./load-messages');

    await expect(loadMessages('missing/path', 'en', {})).rejects.toThrow(
      '[i18n] Failed to load required locale messages'
    );
  });
});
