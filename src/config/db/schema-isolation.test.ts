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
  it('maps existing tables into mogged_games', () => {
    expect(readTableSchema(user)).toBe('mogged_games');
    expect(readTableSchema(order)).toBe('mogged_games');
    expect(readTableSchema(webhookEvent)).toBe('mogged_games');
  });

  it('exports the custom schema for drizzle-kit push snapshots', () => {
    const snapshot = generateDrizzleJson(schemaModule);

    expect(siteSchema.schemaName).toBe('mogged_games');
    expect(snapshot.schemas).toHaveProperty(
      'mogged_games',
      'mogged_games'
    );
  });

  it('limits drizzle-kit to the mogged_games schema', () => {
    expect(dbConfig).toMatchObject({
      schema: './src/config/db/schema.ts',
      schemaFilter: ['mogged_games'],
    });
    expect(dbConfig).not.toHaveProperty('migrations');
    expect(dbConfig).not.toHaveProperty('out');
  });
});
