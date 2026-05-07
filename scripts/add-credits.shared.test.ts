import { describe, expect, it } from 'vitest';

import { calculateManualCreditExpiration } from './add-credits.shared';

describe('add credits script helpers', () => {
  it('sets manual credit grants to expire one calendar month later', () => {
    expect(
      calculateManualCreditExpiration(new Date('2026-05-06T12:00:00.000Z'))
    ).toEqual(new Date('2026-06-06T12:00:00.000Z'));
  });
});
