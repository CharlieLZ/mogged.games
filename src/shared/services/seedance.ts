import 'server-only';

import { SeedanceService } from '@/extensions/ai/seedance/service';
import type { Configs } from '@/shared/models/config';

import { createConfigBackedServiceGetter } from './config-service-cache';

export function getSeedanceServiceWithConfigs(configs: Configs) {
  return new SeedanceService(configs);
}

export const getSeedanceService = createConfigBackedServiceGetter(
  getSeedanceServiceWithConfigs
);
