import 'server-only';

import { revalidateTag, unstable_cache } from 'next/cache';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { config } from '@/config/db/schema';
import { hasEmailProviderConfigured } from '@/shared/lib/email-config';
import {
  isGoogleAuthRuntimeEnabled,
  isGoogleOneTapRuntimeEnabled,
} from '@/shared/lib/google-auth-runtime';
import {
  hasCreemCheckoutConfigs,
  hasPayPalCheckoutConfigs,
  hasStripeCheckoutConfigs,
} from '@/shared/lib/payment-config';
import {
  isPublicSettingName,
  publicSettingNames,
} from '@/shared/lib/public-setting-names';
import { withOptionalDbFallback } from '@/shared/lib/optional-db';
import { isPostgresUndefinedTableError } from '@/shared/lib/postgres-error';

import {
  buildRuntimeSettingAuditEntries,
  recordRuntimeSettingAuditEntries,
} from './runtime-setting-audit';

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type UpdateConfig = Partial<Omit<NewConfig, 'name'>>;

export type Configs = Record<string, string>;

export const CACHE_TAG_CONFIGS = 'configs';
let hasWarnedAboutMissingConfigTable = false;

export async function saveConfigs(
  configs: Record<string, string>,
  options?: {
    actorUserId?: string | null;
  }
) {
  const previousConfigRows = await db().select().from(config);
  const previousValues = Object.fromEntries(
    previousConfigRows.map((entry) => [entry.name, entry.value ?? ''])
  );
  const result = await db().transaction(async (tx) => {
    const configEntries = Object.entries(configs);
    const results = [];

    for (const [name, configValue] of configEntries) {
      const [upsertResult] = await tx
        .insert(config)
        .values({ name, value: configValue })
        .onConflictDoUpdate({
          target: config.name,
          set: { value: configValue },
        })
        .returning();

      results.push(upsertResult);
    }

    return results;
  });

  const auditEntries = buildRuntimeSettingAuditEntries({
    actorUserId: options?.actorUserId,
    envValues: envConfigs,
    existingValues: previousValues,
    nextValues: configs,
  });

  if (auditEntries.length > 0) {
    try {
      await recordRuntimeSettingAuditEntries(db(), auditEntries);
    } catch (error) {
      console.warn('[config] failed to record runtime setting audit', error);
    }
  }

  revalidateTag(CACHE_TAG_CONFIGS, 'max');

  return result;
}

export async function addConfig(newConfig: NewConfig) {
  const [result] = await db().insert(config).values(newConfig).returning();
  revalidateTag(CACHE_TAG_CONFIGS, 'max');

  return result;
}

export const getConfigs = unstable_cache(
  async (): Promise<Configs> => {
    const configs: Record<string, string> = {};

    if (!envConfigs.database_url) {
      return configs;
    }

    let result;

    try {
      result = await withOptionalDbFallback({
        fallback: [] as Config[],
        operation: async () => db().select().from(config),
        scope: 'config/getConfigs',
      });
    } catch (error) {
      if (isPostgresUndefinedTableError(error)) {
        if (!hasWarnedAboutMissingConfigTable) {
          hasWarnedAboutMissingConfigTable = true;
          console.warn(
            '[config] config table is unavailable, using env configs only'
          );
        }
        return configs;
      }

      throw error;
    }

    if (!result) {
      return configs;
    }

    for (const config of result) {
      configs[config.name] = config.value ?? '';
    }

    return configs;
  },
  ['configs'],
  {
    revalidate: 3600,
    tags: [CACHE_TAG_CONFIGS],
  }
);

export async function getAllConfigs(): Promise<Configs> {
  let dbConfigs: Configs = {};

  // Load database-backed overrides only when the server has a database configured.
  if (envConfigs.database_url) {
    try {
      dbConfigs = await getConfigs();
    } catch (e) {
      console.warn('[config] failed to load configs from db', e);
      dbConfigs = {};
    }
  }

  const configs: Configs = { ...envConfigs };

  // Let database values override env values, but ignore empty strings.
  for (const [key, value] of Object.entries(dbConfigs)) {
    if (value === '' || value === undefined || value === null) {
      continue;
    }
    configs[key] = value;
  }

  return configs;
}

export async function getPublicConfigs(): Promise<Configs> {
  let dbConfigs: Configs = {};

  // Read from the database only on the server and only when a DB is configured.
  if (typeof window === 'undefined' && envConfigs.database_url) {
    try {
      dbConfigs = await getConfigs();
    } catch (e) {
      console.warn('[config] failed to load public configs from db', e);
      dbConfigs = {};
    }
  }

  // Start with public env defaults, then override them with non-empty DB values.
  const publicConfigs: Record<string, string> = {};
  const runtimeConfigs: Record<string, string> = {};

  for (const [key, value] of Object.entries(envConfigs)) {
    if (value !== undefined && value !== null && value !== '') {
      runtimeConfigs[key] = String(value);
    }
  }

  for (const key of publicSettingNames) {
    const envValue = envConfigs[key];
    if (envValue !== undefined && envValue !== null && envValue !== '') {
      publicConfigs[key] = String(envValue);
    }
  }

  for (const key in dbConfigs) {
    if (
      dbConfigs[key] !== undefined &&
      dbConfigs[key] !== null &&
      dbConfigs[key] !== ''
    ) {
      runtimeConfigs[key] = String(dbConfigs[key]);
    }

    if (
      isPublicSettingName(key) &&
      dbConfigs[key] !== undefined &&
      dbConfigs[key] !== null &&
      dbConfigs[key] !== ''
    ) {
      publicConfigs[key] = String(dbConfigs[key]);
    }
  }

  publicConfigs.email_delivery_enabled = hasEmailProviderConfigured(
    runtimeConfigs
  )
    ? 'true'
    : 'false';
  publicConfigs.google_auth_enabled = isGoogleAuthRuntimeEnabled(
    runtimeConfigs
  )
    ? 'true'
    : 'false';
  publicConfigs.google_one_tap_enabled = isGoogleOneTapRuntimeEnabled(
    runtimeConfigs
  )
    ? 'true'
    : 'false';
  publicConfigs.stripe_enabled =
    publicConfigs.stripe_enabled === 'true' &&
    hasStripeCheckoutConfigs(runtimeConfigs)
      ? 'true'
      : 'false';
  publicConfigs.paypal_enabled =
    publicConfigs.paypal_enabled === 'true' &&
    hasPayPalCheckoutConfigs(runtimeConfigs)
      ? 'true'
      : 'false';
  publicConfigs.creem_enabled =
    publicConfigs.creem_enabled === 'true' &&
    hasCreemCheckoutConfigs(runtimeConfigs)
      ? 'true'
      : 'false';
  return publicConfigs;
}
