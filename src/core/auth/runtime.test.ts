import { describe, expect, it } from 'vitest';

import {
  resolveAuthClientBaseURL,
  resolveAuthEndpoint,
  resolveAuthServerRuntimeConfig,
  resolveRequestOrigin,
} from './runtime';

describe('resolveAuthClientBaseURL', () => {
  it('prefers the current window origin', () => {
    expect(
      resolveAuthClientBaseURL({
        authURL: 'https://mogged.games',
        appURL: 'https://mogged.games',
        windowOrigin: 'http://127.0.0.1:3000',
      })
    ).toBe('http://127.0.0.1:3000');
  });

  it('falls back to configured auth url', () => {
    expect(
      resolveAuthClientBaseURL({
        authURL: 'https://mogged.games/',
        appURL: 'https://mogged.games',
      })
    ).toBe('https://mogged.games');
  });
});

describe('resolveAuthServerRuntimeConfig', () => {
  it('prefers the current request origin for server auth routes', () => {
    expect(
      resolveAuthServerRuntimeConfig({
        authURL: 'https://mogged.games',
        appURL: 'https://mogged.games',
        requestOrigin: 'http://127.0.0.1:3000',
      })
    ).toEqual({
      baseURL: 'http://127.0.0.1:3000',
      trustedOrigins: ['https://mogged.games', 'http://127.0.0.1:3000'],
    });
  });

  it('falls back to configured urls when request origin is missing', () => {
    expect(
      resolveAuthServerRuntimeConfig({
        authURL: 'https://mogged.games',
        appURL: 'https://mogged.games',
      })
    ).toEqual({
      baseURL: 'https://mogged.games',
      trustedOrigins: ['https://mogged.games'],
    });
  });
});

describe('resolveAuthEndpoint', () => {
  it('builds same-origin auth endpoints for browser requests', () => {
    expect(
      resolveAuthEndpoint('/sign-in/social', {
        authURL: 'https://mogged.games',
        appURL: 'https://mogged.games',
        windowOrigin: 'http://127.0.0.1:3000',
      })
    ).toBe('http://127.0.0.1:3000/api/auth/sign-in/social');
  });
});

describe('resolveRequestOrigin', () => {
  it('prefers the explicit origin header over request.url', () => {
    expect(
      resolveRequestOrigin({
        originHeader: 'http://127.0.0.1:3000',
        refererHeader: 'http://127.0.0.1:3000/sign-in',
        requestURL: 'http://localhost:3000/api/auth/sign-in/social',
      })
    ).toBe('http://127.0.0.1:3000');
  });

  it('prefers the callback request URL over a third-party referer', () => {
    expect(
      resolveRequestOrigin({
        refererHeader:
          'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
        requestURL:
          'https://mogged.games/api/auth/callback/google?code=test&state=test',
      })
    ).toBe('https://mogged.games');
  });

  it('falls back to request.url origin', () => {
    expect(
      resolveRequestOrigin({
        requestURL: 'http://localhost:3000/api/auth/get-session',
      })
    ).toBe('http://localhost:3000');
  });

  it('falls back to referer when request.url is unavailable', () => {
    expect(
      resolveRequestOrigin({
        refererHeader: 'http://127.0.0.1:3000/sign-in',
      })
    ).toBe('http://127.0.0.1:3000');
  });
});
