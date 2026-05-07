import 'server-only';

import {
  CrispCustomerServiceProvider,
  CustomerServiceManager,
  TawkCustomerServiceProvider,
} from '@/extensions/customer-service';
import type { Configs } from '@/shared/models/config';

import { createConfigBackedServiceGetter } from './config-service-cache';
import {
  applyManagerRegistrations,
  hasEnabledConfig,
  whenConfigs,
} from './manager-registry';

const customerServiceRegistrations = [
  whenConfigs<CustomerServiceManager>(
    hasEnabledConfig('crisp_enabled', 'crisp_website_id'),
    (manager, configs) => {
      manager.addProvider(
        new CrispCustomerServiceProvider({
          websiteId: configs.crisp_website_id,
        })
      );
    }
  ),
  whenConfigs<CustomerServiceManager>(
    hasEnabledConfig('tawk_enabled', 'tawk_property_id', 'tawk_widget_id'),
    (manager, configs) => {
      manager.addProvider(
        new TawkCustomerServiceProvider({
          propertyId: configs.tawk_property_id,
          widgetId: configs.tawk_widget_id,
        })
      );
    }
  ),
] as const;

/**
 * get affiliate manager with configs
 */
export function getCustomerServiceWithConfigs(configs: Configs) {
  return applyManagerRegistrations(
    new CustomerServiceManager(),
    configs,
    customerServiceRegistrations
  );
}

/**
 * get customer service instance
 */
export const getCustomerService = createConfigBackedServiceGetter(
  getCustomerServiceWithConfigs
);
