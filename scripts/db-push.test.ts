import { describe, expect, it, vi } from 'vitest';

import { runDbPush } from './db-push';

describe('db push wrapper', () => {
  it('ensures the postgres schema exists before invoking drizzle push', async () => {
    const ensureSchemaExists = vi.fn(async () => {});
    const spawnPush = vi.fn(() => 0);

    const exitCode = await runDbPush({
      databaseProvider: 'postgresql',
      databaseUrl: 'postgres://example',
      schemaFilter: ['mogged_games'],
      ensureSchemaExists,
      spawnPush,
    });

    expect(exitCode).toBe(0);
    expect(ensureSchemaExists).toHaveBeenCalledWith({
      databaseUrl: 'postgres://example',
      schema: 'mogged_games',
    });
    expect(spawnPush).toHaveBeenCalledOnce();
  });

  it('skips schema creation when the database provider is not postgres', async () => {
    const ensureSchemaExists = vi.fn(async () => {});
    const spawnPush = vi.fn(() => 0);

    const exitCode = await runDbPush({
      databaseProvider: 'sqlite',
      databaseUrl: 'file:dev.db',
      schemaFilter: ['mogged_games'],
      ensureSchemaExists,
      spawnPush,
    });

    expect(exitCode).toBe(0);
    expect(ensureSchemaExists).not.toHaveBeenCalled();
    expect(spawnPush).toHaveBeenCalledOnce();
  });
});
