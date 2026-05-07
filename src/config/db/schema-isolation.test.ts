import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import dbConfig from '@/core/db/config';
import * as schemaModule from '@/config/db/schema';
import { order, siteSchema, user, webhookEvent } from '@/config/db/schema';

const require = createRequire(import.meta.url);
const { generateDrizzleJson } = require('drizzle-kit/api');

function readTableSchema(table: object) {
  const symbol = Object.getOwnPropertySymbols(table).find(
    (entry) => String(entry) === 'Symbol(drizzle:Schema)'
  );

  return symbol ? (table as Record<symbol, unknown>)[symbol] : undefined;
}

describe('database schema isolation', () => {
  it('maps existing tables into imageeditorai_net', () => {
    expect(readTableSchema(user)).toBe('imageeditorai_net');
    expect(readTableSchema(order)).toBe('imageeditorai_net');
    expect(readTableSchema(webhookEvent)).toBe('imageeditorai_net');
  });

  it('exports the custom schema for drizzle-kit push snapshots', () => {
    const snapshot = generateDrizzleJson(schemaModule);

    expect(siteSchema.schemaName).toBe('imageeditorai_net');
    expect(snapshot.schemas).toHaveProperty(
      'imageeditorai_net',
      'imageeditorai_net'
    );
  });

  it('limits drizzle-kit to the imageeditorai_net schema', () => {
    expect(dbConfig).toMatchObject({
      schema: './src/config/db/schema.ts',
      schemaFilter: ['imageeditorai_net'],
    });
    expect(dbConfig).not.toHaveProperty('migrations');
    expect(dbConfig).not.toHaveProperty('out');
  });
});
