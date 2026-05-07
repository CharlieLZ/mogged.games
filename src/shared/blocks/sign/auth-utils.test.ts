// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAuthAvailability,
  isGithubAuthReady,
  localizeRelativeAuthPath,
} from './auth-utils';

describe('isGithubAuthReady', () => {
  it('treats github oauth as client-ready when the public client id is present', () => {
    expect(
      isGithubAuthReady({
        github_auth_enabled: 'true',
        github_client_id: 'github-client-id',
      })
    ).toBe(true);
  });
});

describe('getAuthAvailability', () => {
  it('does not force email auth back on when github auth is configured', () => {
    expect(
      getAuthAvailability({
        email_auth_enabled: 'false',
        github_auth_enabled: 'true',
        github_client_id: 'github-client-id',
      })
    ).toEqual({
      emailEnabled: false,
      githubEnabled: true,
      googleEnabled: false,
      magicLinkEnabled: false,
    });
  });

  it('disables magic link actions when email delivery is unavailable', () => {
    expect(
      getAuthAvailability({
        email_auth_enabled: 'true',
        google_auth_enabled: 'false',
        github_auth_enabled: 'false',
        email_delivery_enabled: 'false',
      })
    ).toEqual(
      expect.objectContaining({
        emailEnabled: true,
        magicLinkEnabled: false,
      })
    );
  });

  it('keeps magic link actions available while client configs are still loading', () => {
    expect(
      getAuthAvailability({
        email_auth_enabled: 'true',
        google_auth_enabled: 'false',
        github_auth_enabled: 'false',
      })
    ).toEqual(
      expect.objectContaining({
        emailEnabled: true,
        magicLinkEnabled: true,
      })
    );
  });
});

describe('localizeRelativeAuthPath', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://mogged.games',
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefixes locale-aware internal callback paths', () => {
    expect(localizeRelativeAuthPath('/pricing?plan=pro', 'zh')).toBe(
      '/zh/pricing?plan=pro'
    );
  });

  it('keeps same-origin absolute callback urls and strips the origin', () => {
    expect(
      localizeRelativeAuthPath(
        'https://mogged.games/pricing?plan=pro',
        'zh'
      )
    ).toBe('/zh/pricing?plan=pro');
  });

  it('falls back when the callback url points off-origin', () => {
    expect(localizeRelativeAuthPath('https://evil.example/phish', 'zh')).toBe(
      '/ai-image-generator'
    );
  });

  it('falls back when the callback points back into auth routes', () => {
    expect(localizeRelativeAuthPath('/sign-in?next=/pricing', 'zh')).toBe(
      '/ai-image-generator'
    );
  });
});
