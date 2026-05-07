import { describe, expect, it } from 'vitest';

import { getAppUrl } from './brand';
import {
  DEFAULT_INDEXNOW_KEY,
  getIndexNowKeyLocation,
  INDEXNOW_KEY_PATTERN,
  isValidIndexNowKey,
  normalizeIndexNowUrls,
  resolveIndexNowKey,
} from './indexnow';

describe('indexnow helpers', () => {
  const appUrl = getAppUrl();

  it('accepts valid hexadecimal keys and rejects invalid ones', () => {
    expect(INDEXNOW_KEY_PATTERN.test('0123abcd')).toBe(true);
    expect(INDEXNOW_KEY_PATTERN.test('index-now-key-123')).toBe(true);
    expect(isValidIndexNowKey('abcdef1234567890')).toBe(true);
    expect(isValidIndexNowKey('short')).toBe(false);
    expect(isValidIndexNowKey('contains spaces')).toBe(false);
  });

  it('falls back to the built-in key when the configured key is blank or invalid', () => {
    expect(resolveIndexNowKey('custom-key-1234')).toBe('custom-key-1234');
    expect(resolveIndexNowKey('')).toBe(DEFAULT_INDEXNOW_KEY);
    expect(resolveIndexNowKey('bad key')).toBe(DEFAULT_INDEXNOW_KEY);
  });

  it('normalizes same-host urls and drops duplicates or foreign hosts', () => {
    expect(
      normalizeIndexNowUrls([
        `${appUrl}/pricing#top`,
        `${appUrl}/pricing`,
        `${appUrl}/mission`,
        'https://example.com/mission',
        'not-a-url',
      ])
    ).toEqual([`${appUrl}/pricing`, `${appUrl}/mission`]);
  });

  it('builds the public key location from the configured app url when available', () => {
    const keyLocation = getIndexNowKeyLocation();

    expect(keyLocation).toBe(`${appUrl}/${DEFAULT_INDEXNOW_KEY}.txt`);
  });
});
