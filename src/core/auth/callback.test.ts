import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';

import {
  getCurrentAuthCallback,
  resolveClientAuthCallback,
} from './callback';

function mockWindowLocation(pathname: string, search = '') {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: {
        pathname,
        search,
      },
    },
  });
}

describe('getCurrentAuthCallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the current localized page instead of the auth default', () => {
    mockWindowLocation('/zh/pricing', '?plan=pro');

    expect(getCurrentAuthCallback()).toBe('/zh/pricing?plan=pro');
  });

  it('falls back on auth pages', () => {
    mockWindowLocation('/sign-in', '?callbackUrl=%2Fpricing');

    expect(getCurrentAuthCallback()).toBe(DEFAULT_AUTH_CALLBACK);
  });

  it('falls back on auth api routes', () => {
    mockWindowLocation('/api/auth/callback/google', '?code=123');

    expect(getCurrentAuthCallback()).toBe(DEFAULT_AUTH_CALLBACK);
  });
});

describe('resolveClientAuthCallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers an explicit callback url when provided', () => {
    mockWindowLocation('/pricing', '?plan=starter');

    expect(resolveClientAuthCallback('/dashboard')).toBe('/dashboard');
  });

  it('uses the current page when callback url is omitted', () => {
    mockWindowLocation('/tools/video', '?tab=history');

    expect(resolveClientAuthCallback()).toBe('/tools/video?tab=history');
  });
});
