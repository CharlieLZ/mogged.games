import { describe, expect, it } from 'vitest';

import {
  aiTask,
  apikey,
  credit,
  order,
  rolePermission,
  subscription,
  userRole,
} from '@/config/db/schema';

type DrizzleTableLike = object;

function getSymbol(table: DrizzleTableLike, name: string) {
  return Object.getOwnPropertySymbols(table).find(
    (entry) => String(entry) === name
  );
}

function getColumnSqlType(table: DrizzleTableLike, columnName: string) {
  const tableRecord = table as Record<PropertyKey, unknown>;
  const symbol = getSymbol(table, 'Symbol(drizzle:Columns)');
  if (!symbol) {
    throw new Error(`columns symbol not found for ${columnName}`);
  }

  const columns = tableRecord[symbol] as Record<
    string,
    { getSQLType(): string }
  >;
  const column = columns[columnName];
  if (!column) {
    throw new Error(`column ${columnName} not found`);
  }

  return column.getSQLType();
}

function getIndexConfigs(table: DrizzleTableLike) {
  const tableRecord = table as Record<PropertyKey, unknown>;
  const builderSymbol = getSymbol(table, 'Symbol(drizzle:ExtraConfigBuilder)');
  const extraColumnsSymbol = getSymbol(
    table,
    'Symbol(drizzle:ExtraConfigColumns)'
  );

  if (!builderSymbol || !extraColumnsSymbol) {
    return [];
  }

  const builder = tableRecord[builderSymbol] as (
    extraColumns: Record<string, unknown>
  ) => Array<{ config: { name?: string; unique?: boolean } }>;
  const extraColumns = tableRecord[extraColumnsSymbol] as Record<
    string,
    unknown
  >;

  return builder(extraColumns).map((entry) => entry.config);
}

describe('database schema governance', () => {
  it('stores active workflow payloads as jsonb instead of text blobs', () => {
    expect(getColumnSqlType(aiTask, 'options')).toBe('jsonb');
    expect(getColumnSqlType(aiTask, 'taskInfo')).toBe('jsonb');
    expect(getColumnSqlType(aiTask, 'taskResult')).toBe('jsonb');

    expect(getColumnSqlType(order, 'checkoutInfo')).toBe('jsonb');
    expect(getColumnSqlType(order, 'checkoutResult')).toBe('jsonb');
    expect(getColumnSqlType(order, 'paymentResult')).toBe('jsonb');
    expect(getColumnSqlType(order, 'subscriptionResult')).toBe('jsonb');

    expect(getColumnSqlType(credit, 'consumedDetail')).toBe('jsonb');
    expect(getColumnSqlType(credit, 'metadata')).toBe('jsonb');
  });

  it('adds explicit security fields for hashed api key storage', () => {
    expect(getColumnSqlType(apikey, 'keyHash')).toBe('text');
    expect(getColumnSqlType(apikey, 'keyPrefix')).toBe('text');
    expect(getColumnSqlType(apikey, 'lastUsedAt')).toBe('timestamp');
  });

  it('enforces database-level uniqueness for core idempotent relations', () => {
    const aiTaskIndexes = getIndexConfigs(aiTask);
    const orderIndexes = getIndexConfigs(order);
    const subscriptionIndexes = getIndexConfigs(subscription);
    const apikeyIndexes = getIndexConfigs(apikey);
    const rolePermissionIndexes = getIndexConfigs(rolePermission);
    const userRoleIndexes = getIndexConfigs(userRole);

    expect(aiTaskIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'uq_ai_task_provider_task_id',
          unique: true,
        }),
      ])
    );

    expect(orderIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'uq_order_transaction_provider',
          unique: true,
        }),
      ])
    );

    expect(subscriptionIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'uq_subscription_provider_id',
          unique: true,
        }),
      ])
    );

    expect(apikeyIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'uq_apikey_key_hash',
          unique: true,
        }),
      ])
    );

    expect(rolePermissionIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'uq_role_permission_role_permission',
          unique: true,
        }),
      ])
    );

    expect(userRoleIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'uq_user_role_user_role',
          unique: true,
        }),
      ])
    );
  });
});
