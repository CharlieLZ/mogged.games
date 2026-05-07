import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchJsonWithRetry } from './google-fetch';

describe('google fetch retry helper', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('wraps network failures with the request label', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed')) as typeof fetch;

    await expect(
      fetchJsonWithRetry({
        url: 'https://example.com',
        label: 'gsc:url-inspection:/',
        maxAttempts: 1,
      })
    ).rejects.toThrow('[gsc:url-inspection:/] request failed: fetch failed');
  });

  it('keeps structured google api errors readable', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: 'User does not have sufficient permission for site',
          },
        }),
        {
          status: 403,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    ) as typeof fetch;

    await expect(
      fetchJsonWithRetry({
        url: 'https://example.com',
        label: 'gsc:sitemap',
        maxAttempts: 1,
      })
    ).rejects.toThrow(
      "[gsc:sitemap] 403: User does not have sufficient permission for site"
    );
  });
});
