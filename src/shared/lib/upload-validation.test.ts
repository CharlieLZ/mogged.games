import { describe, expect, it } from 'vitest';

import { validateFileSignature } from './upload-validation';

describe('upload validation', () => {
  it('accepts png signatures', () => {
    const sample = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    expect(validateFileSignature(sample, 'image/png')).toBe(true);
  });

  it('rejects mismatched signatures', () => {
    const sample = Buffer.from('not-a-real-file');

    expect(validateFileSignature(sample, 'image/png')).toBe(false);
  });
});
