import 'server-only';

import { KieImageService } from '@/extensions/ai/kie-market/service';
import type { Configs } from '@/shared/models/config';

import { createConfigBackedServiceGetter } from './config-service-cache';

export function getKieImageServiceWithConfigs(configs: Configs) {
  return new KieImageService(configs);
}

export const getKieImageService = createConfigBackedServiceGetter(
  getKieImageServiceWithConfigs
);
