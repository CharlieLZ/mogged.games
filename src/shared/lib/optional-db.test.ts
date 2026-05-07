import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OPTIONAL_DB_COOLDOWN_MS,
  resetOptionalDbCooldownForTest,
  withOptionalDbFallback,
} from './optional-db';

describe('optional db fallback', () => {
  beforeEach(() => {
    resetOptionalDbCooldownForTest();
    vi.restoreAllMocks();
  });

  it('falls back and enters cooldown for retryable connectivity failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(Object.assign(new Error('connect timeout'), {
        code: 'CONNECT_TIMEOUT',
      }));

    await expect(
      withOptionalDbFallback({
        fallback: 'fallback-value',
        operation,
        scope: 'test/connect-timeout',
      })
    ).resolves.toBe('fallback-value');

    await expect(
      withOptionalDbFallback({
        fallback: 'fallback-value',
        operation,
        scope: 'test/connect-timeout',
      })
    ).resolves.toBe('fallback-value');

    expect(operation).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[optional-db] optional database access failed, entering cooldown',
      expect.objectContaining({
        cooldownMs: OPTIONAL_DB_COOLDOWN_MS,
        scope: 'test/connect-timeout',
      })
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[optional-db] skipping optional database access during cooldown',
      expect.objectContaining({
        scope: 'test/connect-timeout',
      })
    );
  });

  it('does not swallow non-connectivity failures', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('syntax error'));

    await expect(
      withOptionalDbFallback({
        fallback: 'fallback-value',
        operation,
        scope: 'test/non-connectivity',
      })
    ).rejects.toThrow('syntax error');
  });
});
