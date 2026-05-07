import {
  AnalyticsManager,
  ClarityAnalyticsProvider,
  GoogleAnalyticsProvider,
  OpenPanelAnalyticsProvider,
  PlausibleAnalyticsProvider,
  VercelAnalyticsProvider,
} from '@/extensions/analytics';
import { resolveGoogleAdsConfigs } from '@/shared/lib/google-ads';
import type { Configs } from '@/shared/models/config';

import { warnAboutCloudflareAnalyticsRuntimeConfig } from './analytics-runtime-check';
import { createConfigBackedServiceGetter } from './config-service-cache';
import {
  applyManagerRegistrations,
  hasConfigValues,
  hasEnabledConfig,
  whenConfigs,
} from './manager-registry';

function hasResolvedGoogleTagConfig(configs: Configs) {
  const googleAdsConfigs = resolveGoogleAdsConfigs(configs);

  return Boolean(
    configs.google_analytics_id ||
      (googleAdsConfigs.enabled && googleAdsConfigs.conversionId)
  );
}

const analyticsManagerRegistrations = [
  whenConfigs<AnalyticsManager>(hasResolvedGoogleTagConfig, (manager, configs) => {
    const googleAdsConfigs = resolveGoogleAdsConfigs(configs);

    manager.addProvider(
      new GoogleAnalyticsProvider({
        gaId: configs.google_analytics_id,
        adsId: googleAdsConfigs.enabled ? googleAdsConfigs.conversionId : '',
      })
    );
  }),
  whenConfigs<AnalyticsManager>(
    hasConfigValues('plausible_domain', 'plausible_src'),
    (manager, configs) => {
      manager.addProvider(
        new PlausibleAnalyticsProvider({
          domain: configs.plausible_domain,
          src: configs.plausible_src,
        })
      );
    }
  ),
  whenConfigs<AnalyticsManager>(hasConfigValues('clarity_id'), (manager, configs) => {
    manager.addProvider(
      new ClarityAnalyticsProvider({ clarityId: configs.clarity_id })
    );
  }),
  whenConfigs<AnalyticsManager>(
    hasConfigValues('openpanel_client_id'),
    (manager, configs) => {
      manager.addProvider(
        new OpenPanelAnalyticsProvider({
          clientId: configs.openpanel_client_id,
        })
      );
    }
  ),
  whenConfigs<AnalyticsManager>(
    hasEnabledConfig('vercel_analytics_enabled'),
    (manager) => {
      manager.addProvider(new VercelAnalyticsProvider({ mode: 'auto' }));
    }
  ),
] as const;

/**
 * get analytics manager with configs
 */
export function getAnalyticsManagerWithConfigs(configs: Configs) {
  warnAboutCloudflareAnalyticsRuntimeConfig(configs);

  return applyManagerRegistrations(
    new AnalyticsManager(),
    configs,
    analyticsManagerRegistrations
  );
}

/**
 * get analytics service instance
 */
export const getAnalyticsService = createConfigBackedServiceGetter(
  getAnalyticsManagerWithConfigs
);
