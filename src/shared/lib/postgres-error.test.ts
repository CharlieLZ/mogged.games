import postgres from 'postgres';
import { describe, expect, it } from 'vitest';

import {
  isPostgresConnectionError,
  isPostgresDuplicateKeyError,
  isPostgresUndefinedTableError,
} from './postgres-error';

describe('postgres error helpers', () => {
  it('returns true for postgres duplicate key errors', () => {
    const error = new postgres.PostgresError(
      'duplicate key value violates unique constraint'
    ) as postgres.PostgresError & { code: string };
    error.code = '23505';

    expect(isPostgresDuplicateKeyError(error)).toBe(true);
  });

  it('returns true for postgres undefined table errors', () => {
    const error = new postgres.PostgresError(
      'relation does not exist'
    ) as postgres.PostgresError & { code: string };
    error.code = '42P01';

    expect(isPostgresUndefinedTableError(error)).toBe(true);
  });

  it('returns true when the driver wraps a postgres undefined table error in error.cause', () => {
    const cause = new postgres.PostgresError(
      'relation does not exist'
    ) as postgres.PostgresError & { code: string };
    cause.code = '42P01';
    const error = Object.assign(new Error('Failed query'), {
      cause,
    });

    expect(isPostgresUndefinedTableError(error)).toBe(true);
  });

  it('returns true for connectivity errors surfaced by the driver', () => {
    const error = Object.assign(new Error('write CONNECT_TIMEOUT undefined'), {
      code: 'CONNECT_TIMEOUT',
    });

    expect(isPostgresConnectionError(error)).toBe(true);
  });

  it('returns true when connectivity failures are wrapped in error.cause', () => {
    const error = Object.assign(new Error('Failed query'), {
      cause: Object.assign(new Error('connect timeout'), {
        code: 'ECONNREFUSED',
      }),
    });

    expect(isPostgresConnectionError(error)).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    const error = new postgres.PostgresError(
      'value too long'
    ) as postgres.PostgresError & { code: string };
    error.code = '22001';

    expect(isPostgresDuplicateKeyError(error)).toBe(false);
    expect(isPostgresUndefinedTableError(error)).toBe(false);
    expect(isPostgresUndefinedTableError(new Error('relation missing'))).toBe(
      false
    );
    expect(isPostgresDuplicateKeyError(new Error('duplicate'))).toBe(false);
    expect(isPostgresConnectionError(new Error('duplicate'))).toBe(false);
    expect(isPostgresDuplicateKeyError(null)).toBe(false);
  });
});
