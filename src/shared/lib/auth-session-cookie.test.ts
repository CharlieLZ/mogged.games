import { describe, expect, it } from 'vitest';

import { hasBetterAuthSessionCookie } from './auth-session-cookie';

describe('hasBetterAuthSessionCookie', () => {
  it('detects the default better-auth session cookie', () => {
    expect(
      hasBetterAuthSessionCookie(
        new Request('https://mogged.games', {
          headers: {
            cookie: 'better-auth.session_token=session-token-value',
          },
        })
      )
    ).toBe(true);
  });

  it('detects the secure better-auth session cookie', () => {
    expect(
      hasBetterAuthSessionCookie(
        new Request('https://mogged.games', {
          headers: {
            cookie: '__Secure-better-auth.session_token=session-token-value',
          },
        })
      )
    ).toBe(true);
  });

  it('returns false when no session cookie is present', () => {
    expect(
      hasBetterAuthSessionCookie(new Request('https://mogged.games'))
    ).toBe(false);
  });
});
