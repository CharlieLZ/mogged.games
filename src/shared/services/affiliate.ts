import {
  AffiliateManager,
  AffonsoAffiliateProvider,
  PromoteKitAffiliateProvider,
} from '@/extensions/affiliate';
import type { Configs } from '@/shared/models/config';

import { createConfigBackedServiceGetter } from './config-service-cache';
import {
  applyManagerRegistrations,
  hasEnabledConfig,
  whenConfigs,
} from './manager-registry';

const affiliateManagerRegistrations = [
  whenConfigs<AffiliateManager>(
    hasEnabledConfig('affonso_enabled', 'affonso_id'),
    (manager, configs) => {
      manager.addProvider(
        new AffonsoAffiliateProvider({
          affonsoId: configs.affonso_id,
          cookieDuration: Number(configs.affonso_cookie_duration || 30),
        })
      );
    }
  ),
  whenConfigs<AffiliateManager>(
    hasEnabledConfig('promotekit_enabled', 'promotekit_id'),
    (manager, configs) => {
      manager.addProvider(
        new PromoteKitAffiliateProvider({ promotekitId: configs.promotekit_id })
      );
    }
  ),
] as const;

/**
 * get affiliate manager with configs
 */
export function getAffiliateManagerWithConfigs(configs: Configs) {
  return applyManagerRegistrations(
    new AffiliateManager(),
    configs,
    affiliateManagerRegistrations
  );
}

/**
 * get affiliate service instance
 */
export const getAffiliateService = createConfigBackedServiceGetter(
  getAffiliateManagerWithConfigs
);
