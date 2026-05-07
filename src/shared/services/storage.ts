import 'server-only';

import { R2Provider, S3Provider, StorageManager } from '@/extensions/storage';
import type { Configs } from '@/shared/models/config';

import { createConfigBackedServiceGetter } from './config-service-cache';
import {
  applyManagerRegistrations,
  hasConfigValues,
  whenConfigs,
} from './manager-registry';

/**
 * get storage service with configs
 */
export function getStorageServiceWithConfigs(configs: Configs) {
  const appUrl = configs.app_url?.replace(/\/$/, '');
  const fallbackPublicUrlPrefix = appUrl
    ? `${appUrl}/api/storage/file?key=`
    : undefined;
  const storageRegistrations = [
    whenConfigs<StorageManager>(
      hasConfigValues('r2_access_key', 'r2_secret_key', 'r2_bucket_name'),
      (manager, nextConfigs) => {
        manager.addProvider(
          new R2Provider({
            accountId: nextConfigs.r2_account_id || '',
            accessKeyId: nextConfigs.r2_access_key,
            secretAccessKey: nextConfigs.r2_secret_key,
            bucket: nextConfigs.r2_bucket_name,
            region: 'auto',
            endpoint: nextConfigs.r2_endpoint,
            publicDomain: nextConfigs.r2_domain,
            publicUrlPrefix: nextConfigs.r2_domain
              ? undefined
              : fallbackPublicUrlPrefix,
          }),
          true
        );
      }
    ),
    whenConfigs<StorageManager>(
      hasConfigValues('s3_access_key', 's3_secret_key', 's3_bucket'),
      (manager, nextConfigs) => {
        manager.addProvider(
          new S3Provider({
            endpoint: nextConfigs.s3_endpoint,
            region: nextConfigs.s3_region,
            accessKeyId: nextConfigs.s3_access_key,
            secretAccessKey: nextConfigs.s3_secret_key,
            bucket: nextConfigs.s3_bucket,
            publicDomain: nextConfigs.s3_domain,
            publicUrlPrefix: nextConfigs.s3_domain
              ? undefined
              : fallbackPublicUrlPrefix,
          })
        );
      }
    ),
  ] as const;

  return applyManagerRegistrations(
    new StorageManager(),
    configs,
    storageRegistrations
  );
}

/**
 * get storage service instance
 */
export const getStorageService = createConfigBackedServiceGetter(
  getStorageServiceWithConfigs
);
