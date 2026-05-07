import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('runtime setting audit helpers', () => {
  it('creates audit entries from stored and effective config changes', async () => {
    const auditModule = await import('./runtime-setting-audit');

    const entries = auditModule.buildRuntimeSettingAuditEntries({
      actorUserId: 'user_admin',
      envValues: {
        stripe_enabled: 'true',
      },
      existingValues: {
        stripe_enabled: 'false',
      },
      nextValues: {
        stripe_enabled: '',
      },
      createdAt: new Date('2026-04-10T10:00:00.000Z'),
    });

    expect(entries).toEqual([
      expect.objectContaining({
        actorUserId: 'user_admin',
        settingName: 'stripe_enabled',
        previousStoredValue: 'false',
        nextStoredValue: null,
        previousEffectiveValue: 'false',
        nextEffectiveValue: 'true',
        previousSource: 'database',
        nextSource: 'env',
      }),
    ]);
  });
});
