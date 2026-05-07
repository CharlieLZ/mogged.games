import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_INDEXNOW_KEY } from '@/shared/lib/indexnow-key';

import { config, middleware } from './middleware';

const { intlMiddlewareSpy } = vi.hoisted(() => ({
  intlMiddlewareSpy: vi.fn(() => NextResponse.next()),
}));

vi.mock('next-intl/middleware', () => ({
  default: () => intlMiddlewareSpy,
}));

describe('middleware locale canonicalization', () => {
  const originalIndexNowKey = process.env.INDEXNOW_KEY;
  const originalNextPublicIndexNowKey = process.env.NEXT_PUBLIC_INDEXNOW_KEY;

  beforeEach(() => {
    intlMiddlewareSpy.mockClear();
    process.env.INDEXNOW_KEY = DEFAULT_INDEXNOW_KEY;
    delete process.env.NEXT_PUBLIC_INDEXNOW_KEY;
  });

  afterEach(() => {
    if (originalIndexNowKey === undefined) {
      delete process.env.INDEXNOW_KEY;
    } else {
      process.env.INDEXNOW_KEY = originalIndexNowKey;
    }

    if (originalNextPublicIndexNowKey === undefined) {
      delete process.env.NEXT_PUBLIC_INDEXNOW_KEY;
    } else {
      process.env.NEXT_PUBLIC_INDEXNOW_KEY = originalNextPublicIndexNowKey;
    }
  });

  it('redirects /en to the unprefixed default-locale root', async () => {
    const response = await middleware(
      new NextRequest('https://mogged.games/en')
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://mogged.games/');
    expect(intlMiddlewareSpy).not.toHaveBeenCalled();
  });

  it('redirects /en/pricing to /pricing while preserving the query string', async () => {
    const response = await middleware(
      new NextRequest('https://mogged.games/en/pricing?cycle=yearly')
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://mogged.games/pricing?cycle=yearly'
    );
    expect(intlMiddlewareSpy).not.toHaveBeenCalled();
  });

  it('redirects plain-http sitemap requests to the canonical https origin', async () => {
    const response = await middleware(
      new NextRequest('http://mogged.games/sitemap.xml')
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://mogged.games/sitemap.xml'
    );
    expect(intlMiddlewareSpy).not.toHaveBeenCalled();
  });

  it('bypasses intl middleware for sitemap.xml so the metadata route can answer directly', async () => {
    const response = await middleware(
      new NextRequest('https://mogged.games/sitemap.xml')
    );

    expect(response.status).toBe(200);
    expect(intlMiddlewareSpy).not.toHaveBeenCalled();
    expect(response.headers.get('x-pathname')).toBeNull();
    expect(response.headers.get('x-url')).toBeNull();
  });

  it('keeps non-default locale paths on their prefixed route', async () => {
    const response = await middleware(
      new NextRequest('https://mogged.games/zh/pricing')
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(intlMiddlewareSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps /ai-image-generator live', async () => {
    const response = await middleware(
      new NextRequest('https://mogged.games/ai-image-generator?ref=seo')
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(intlMiddlewareSpy).toHaveBeenCalledTimes(1);
  });

  it('redirects image workflow paths to the root image workspace mode query', async () => {
    const response = await middleware(
      new NextRequest(
        'https://mogged.games/ai-image-generator/text-to-image?ref=seo'
      )
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://mogged.games/ai-image-generator?ref=seo&mode=text-to-image'
    );
    expect(intlMiddlewareSpy).not.toHaveBeenCalled();
  });

  it('redirects localized image workflow paths to the localized root image workspace', async () => {
    const response = await middleware(
      new NextRequest(
        'https://mogged.games/zh/ai-image-generator/image-to-image?ref=seo'
      )
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://mogged.games/zh/ai-image-generator?ref=seo&mode=image-to-image'
    );
    expect(intlMiddlewareSpy).not.toHaveBeenCalled();
  });

  it('keeps the root video generator route live', async () => {
    const response = await middleware(
      new NextRequest(
        'https://mogged.games/ai-video-generator?mode=text-to-video&ref=seo'
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(intlMiddlewareSpy).toHaveBeenCalledTimes(1);
  });

  it('redirects localized video workflow routes to the localized root video workspace state url', async () => {
    const response = await middleware(
      new NextRequest(
        'https://mogged.games/zh/ai-video-generator/reference-to-video?ref=seo'
      )
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://mogged.games/zh/ai-video-generator?ref=seo&mode=reference-to-video'
    );
    expect(intlMiddlewareSpy).not.toHaveBeenCalled();
  });

  it('keeps dotted static asset paths outside middleware matching', () => {
    expect(config.matcher[0]).toContain('.*\\..*');
    expect(config.matcher).toEqual(
      expect.arrayContaining([
        '/robots.txt',
        '/sitemap.xml',
        '/llm.txt',
        '/llms.txt',
        '/llms-full.txt',
        '/:indexNowKey.txt',
      ])
    );
  });

  it('redirects private routes to sign-in when no auth session cookie exists', async () => {
    const response = await middleware(
      new NextRequest('https://mogged.games/zh/settings/profile')
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://mogged.games/zh/sign-in?callbackUrl=%2Fsettings%2Fprofile'
    );
  });

  it('keeps private routes accessible when a better-auth session cookie exists', async () => {
    const response = await middleware(
      new NextRequest('https://mogged.games/settings/profile', {
        headers: {
          cookie: 'better-auth.session_token=session-token-value',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(intlMiddlewareSpy).toHaveBeenCalledTimes(1);
  });

  it('serves the configured IndexNow key file directly from middleware', async () => {
    const response = await middleware(
      new NextRequest(`https://mogged.games/${DEFAULT_INDEXNOW_KEY}.txt`)
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8'
    );
  });
});
