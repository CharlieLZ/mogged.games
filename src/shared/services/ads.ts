import { AdsenseProvider, AdsManager } from '@/extensions/ads';
import type { Configs } from '@/shared/models/config';

import { createConfigBackedServiceGetter } from './config-service-cache';
import {
  applyManagerRegistrations,
  hasConfigValues,
  whenConfigs,
} from './manager-registry';

const adsManagerRegistrations = [
  whenConfigs<AdsManager>(hasConfigValues('adsense_code'), (manager, configs) => {
    manager.addProvider(new AdsenseProvider({ adId: configs.adsense_code }));
  }),
] as const;

/**
 * get ads manager with configs
 */
export function getAdsManagerWithConfigs(configs: Configs) {
  return applyManagerRegistrations(new AdsManager(), configs, adsManagerRegistrations);
}

/**
 * get ads service instance
 */
export const getAdsService = createConfigBackedServiceGetter(getAdsManagerWithConfigs);
