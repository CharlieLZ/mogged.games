import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAllConfigs } from '@/shared/models/config';

import { createConfigBackedServiceGetter } from './config-service-cache';

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: vi.fn(),
}));

describe('config service cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getAllConfigs).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reuses the same service within the ttl window', async () => {
    vi.mocked(getAllConfigs).mockResolvedValue({
      version: 'v1',
    });

    const getService = createConfigBackedServiceGetter((configs) => ({
      version: configs.version,
      createdAt: Date.now(),
    }));

    const first = await getService();
    vi.advanceTimersByTime(30 * 1000);
    const second = await getService();

    expect(first).toBe(second);
    expect(getAllConfigs).toHaveBeenCalledTimes(1);
  });

  it('refreshes the service after the ttl expires', async () => {
    vi.mocked(getAllConfigs)
      .mockResolvedValueOnce({ version: 'v1' })
      .mockResolvedValueOnce({ version: 'v2' });

    const getService = createConfigBackedServiceGetter((configs) => ({
      version: configs.version,
      createdAt: Date.now(),
    }));

    const first = await getService();
    vi.advanceTimersByTime(60 * 1000);
    const second = await getService();

    expect(second).not.toBe(first);
    expect(second.version).toBe('v2');
    expect(getAllConfigs).toHaveBeenCalledTimes(2);
  });
});
