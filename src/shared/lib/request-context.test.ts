import { describe, expect, it } from 'vitest';

import {
  getClientIpFromHeaders,
  resolveDeviceType,
  resolveRequestContext,
} from './request-context';

function createHeaders(init: Record<string, string>) {
  return new Headers(init);
}

describe('request context', () => {
  it('prefers trusted proxy headers for client ip parsing', () => {
    const headers = createHeaders({
      'cf-connecting-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.10, 198.51.100.11',
    });

    expect(getClientIpFromHeaders(headers)).toBe('203.0.113.9');
  });

  it('detects mobile device types from user agent', () => {
    expect(
      resolveDeviceType(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
      )
    ).toBe('mobile');
  });

  it('builds locale and geo summary from headers and referer', () => {
    const context = resolveRequestContext(
      createHeaders({
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36',
        'cf-connecting-ip': '203.0.113.20',
        'cf-ipcountry': 'US',
        referer: 'https://mogged.games/zh/pricing',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }),
      {
        path: '/api/payment/checkout',
      }
    );

    expect(context.ipAddress).toBe('203.0.113.20');
    expect(context.deviceType).toBe('desktop');
    expect(context.locale).toBe('zh');
    expect(context.countryCode).toBe('US');
    expect(context.referer).toBe('https://mogged.games/zh/pricing');
  });

  it('normalizes additional planned locales from headers and paths', () => {
    const context = resolveRequestContext(
      createHeaders({
        'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
        referer: 'https://mogged.games/fr/pricing',
      }),
      {
        path: '/fr/mission',
      }
    );

    expect(context.locale).toBe('fr');
  });

  it('prefers the locale cookie over Accept-Language on auth callback routes', () => {
    const context = resolveRequestContext(
      createHeaders({
        cookie: 'NEXT_LOCALE=en; theme=dark',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }),
      {
        path: '/api/auth/callback/google',
      }
    );

    expect(context.locale).toBe('en');
  });
});
