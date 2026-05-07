import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock('@/core/db', () => ({
  db: vi.fn(),
}));

vi.mock('@/config/db/schema', () => ({
  config: {},
  runtimeSettingAudit: {},
}));

vi.mock('@/config', () => ({
  envConfigs: {},
}));

vi.mock('@/shared/models/runtime-setting-audit', () => ({
  buildRuntimeSettingAuditEntries: vi.fn(() => []),
  recordRuntimeSettingAuditEntries: vi.fn(),
}));

describe('config service cache module', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('loads without circular initialization errors', async () => {
    await expect(import('./config-service-cache')).resolves.toMatchObject({
      DEFAULT_CONFIG_SERVICE_CACHE_TTL_MS: 60 * 1000,
      createConfigBackedServiceGetter: expect.any(Function),
    });
  });
});
