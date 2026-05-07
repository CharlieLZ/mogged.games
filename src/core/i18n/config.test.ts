import { describe, expect, it } from 'vitest';

import { routing } from './config';

describe('i18n routing config', () => {
  it('disables the middleware locale cookie so public pages stay cache-friendly', () => {
    expect(routing.localeCookie).toBe(false);
  });
});
