import { Configs, getAllConfigs } from '@/shared/models/config';

type ConfigFactory<TService> = (configs: Configs) => TService;

type CachedService<TService> = {
  service: TService;
  createdAt: number;
};

type ConfigServiceCacheOptions = {
  ttlMs?: number;
};

export const DEFAULT_CONFIG_SERVICE_CACHE_TTL_MS = 60 * 1000;

export function createConfigBackedServiceGetter<TService>(
  factory: ConfigFactory<TService>,
  options: ConfigServiceCacheOptions = {}
) {
  const ttlMs = options.ttlMs ?? DEFAULT_CONFIG_SERVICE_CACHE_TTL_MS;
  let cache: CachedService<TService> | null = null;

  return async function getService(): Promise<TService> {
    const now = Date.now();

    if (cache && now - cache.createdAt < ttlMs) {
      return cache.service;
    }

    const configs = await getAllConfigs();
    const service = factory(configs);

    cache = {
      service,
      createdAt: now,
    };

    return service;
  };
}
