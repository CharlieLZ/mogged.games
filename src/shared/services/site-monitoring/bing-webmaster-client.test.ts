import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { BingWebmasterClient } from './bing-webmaster-client';

describe('BingWebmasterClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it('calls the official JSON endpoint and strips Bing metadata wrappers', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          d: {
            __type: 'UrlSubmissionQuota:#Microsoft.Bing.Webmaster.Api',
            DailyQuota: 25,
            MonthlyQuota: 500,
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        }
      )
    );

    const client = new BingWebmasterClient({
      apiKey: 'bing-api-key',
    });
    const quota = await client.getUrlSubmissionQuota('https://mogged.games');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota?'
      ),
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain('apikey=bing-api-key');
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      'siteUrl=https%3A%2F%2Fmogged.games'
    );
    expect(quota).toEqual({
      DailyQuota: 25,
      MonthlyQuota: 500,
    });
  });

  it('retries transient failures before succeeding', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            d: [],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          }
        )
      );

    const client = new BingWebmasterClient({
      apiKey: 'bing-api-key',
      maxRetries: 1,
      retryDelayMs: 1,
    });
    const sites = await client.getUserSites();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sites).toEqual([]);
  });

  it('throws a clear error when the API key is missing', async () => {
    const client = new BingWebmasterClient({
      apiKey: ' ',
    });

    await expect(client.getUserSites()).rejects.toThrow(
      'BING_WEBMASTER_API_KEY is missing'
    );
  });
});
