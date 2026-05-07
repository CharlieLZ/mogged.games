import 'server-only';

import { runtimeSettingAudit } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

type RuntimeSettingAuditInsert = typeof runtimeSettingAudit.$inferInsert;

export type BuildRuntimeSettingAuditEntriesInput = {
  actorUserId?: string | null;
  envValues: Record<string, string | undefined>;
  existingValues: Record<string, string | undefined>;
  nextValues: Record<string, string | undefined>;
  createdAt?: Date;
};

function normalizeStoredValue(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function resolveEffectiveValue(
  storedValue: string | null,
  envValue: string | undefined
): string {
  if (storedValue !== null) {
    return storedValue;
  }

  return envValue?.trim() || '';
}

function resolveValueSource(
  storedValue: string | null,
  envValue: string | undefined
): 'database' | 'env' | 'unset' {
  if (storedValue !== null) {
    return 'database';
  }

  return envValue?.trim() ? 'env' : 'unset';
}

export function buildRuntimeSettingAuditEntries(
  input: BuildRuntimeSettingAuditEntriesInput
): RuntimeSettingAuditInsert[] {
  const createdAt = input.createdAt || new Date();
  const allSettingNames = Array.from(
    new Set([
      ...Object.keys(input.existingValues),
      ...Object.keys(input.nextValues),
    ])
  ).sort();

  return allSettingNames.flatMap((settingName) => {
    const previousStoredValue = normalizeStoredValue(
      input.existingValues[settingName]
    );
    const nextStoredValue = normalizeStoredValue(input.nextValues[settingName]);
    const previousEffectiveValue = resolveEffectiveValue(
      previousStoredValue,
      input.envValues[settingName]
    );
    const nextEffectiveValue = resolveEffectiveValue(
      nextStoredValue,
      input.envValues[settingName]
    );
    const previousSource = resolveValueSource(
      previousStoredValue,
      input.envValues[settingName]
    );
    const nextSource = resolveValueSource(
      nextStoredValue,
      input.envValues[settingName]
    );

    if (
      previousStoredValue === nextStoredValue &&
      previousEffectiveValue === nextEffectiveValue &&
      previousSource === nextSource
    ) {
      return [];
    }

    return [
      {
        id: getUuid(),
        actorUserId: input.actorUserId || null,
        settingName,
        previousStoredValue,
        nextStoredValue,
        previousEffectiveValue,
        nextEffectiveValue,
        previousSource,
        nextSource,
        createdAt,
      },
    ];
  });
}

export async function recordRuntimeSettingAuditEntries(
  database: {
    insert: (table: typeof runtimeSettingAudit) => {
      values: (
        values: RuntimeSettingAuditInsert[]
      ) => Promise<RuntimeSettingAuditInsert[]>;
    };
  },
  entries: RuntimeSettingAuditInsert[]
) {
  if (entries.length === 0) {
    return [];
  }

  return database.insert(runtimeSettingAudit).values(entries);
}
