import { describe, expect, it } from 'vitest';

import { getCanonicalHostRedirectUrl } from './canonical-host-redirect';

describe('getCanonicalHostRedirectUrl', () => {
  it('redirects plain-http requests on the canonical host to https', () => {
    expect(
      getCanonicalHostRedirectUrl(
        'http://mogged.games/zh/pricing?cycle=yearly'
      )
    ).toBe('https://mogged.games/zh/pricing?cycle=yearly');
  });

  it('redirects the www host to the canonical bare domain while preserving path and query', () => {
    expect(
      getCanonicalHostRedirectUrl(
        'https://www.mogged.games/zh/pricing?cycle=yearly'
      )
    ).toBe('https://mogged.games/zh/pricing?cycle=yearly');
  });

  it('returns null for requests that are already on the canonical host', () => {
    expect(
      getCanonicalHostRedirectUrl('https://mogged.games/ai-image-generator')
    ).toBeNull();
  });

  it('leaves unrelated hosts untouched', () => {
    expect(getCanonicalHostRedirectUrl('http://localhost:3000/pricing')).toBeNull();
  });
});
