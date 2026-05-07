import { describe, expect, it } from 'vitest';

import { DEFAULT_AUTH_CALLBACK } from './auth';

describe('auth constants', () => {
  it('defaults post-auth traffic to the surviving public image workspace route', () => {
    expect(DEFAULT_AUTH_CALLBACK).toBe('/ai-image-generator');
  });
});
