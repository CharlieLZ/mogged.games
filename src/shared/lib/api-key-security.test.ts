import { describe, expect, it } from 'vitest';

import {
  buildApiKeyPrefix,
  buildMaskedApiKeyDisplay,
  generateApiKeySecret,
  hashApiKeySecret,
} from './api-key-security';

describe('api key security helpers', () => {
  it('generates a prefixed high-entropy secret', () => {
    const secret = generateApiKeySecret();

    expect(secret.startsWith('sk-hh1-')).toBe(true);
    expect(secret.length).toBeGreaterThan(20);
  });

  it('hashes the trimmed secret deterministically', () => {
    const secret = '  sk-hh1-demo-secret  ';

    expect(hashApiKeySecret(secret)).toHaveLength(64);
    expect(hashApiKeySecret(secret)).toBe(hashApiKeySecret(secret.trim()));
  });

  it('builds a reusable masked display from the visible prefix', () => {
    const secret = 'sk-hh1-abcdefghijklmnopqrstuvwxyz';
    const prefix = buildApiKeyPrefix(secret);

    expect(prefix).toBe('sk-hh1-abcde');
    expect(buildMaskedApiKeyDisplay(prefix)).toBe('sk-hh1-abcde...');
  });
});
