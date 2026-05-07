import postgres from 'postgres';

const POSTGRES_DUPLICATE_KEY_ERROR_CODE = '23505';
const POSTGRES_UNDEFINED_TABLE_ERROR_CODE = '42P01';
const POSTGRES_CONNECTION_ERROR_CODES = new Set([
  'CONNECT_TIMEOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
]);

function getPostgresErrorCode(error: unknown) {
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (
    typeof current === 'object' &&
    current !== null &&
    !visited.has(current)
  ) {
    visited.add(current);

    if (current instanceof postgres.PostgresError) {
      return current.code;
    }

    if ('code' in current && typeof current.code === 'string') {
      return current.code;
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return undefined;
}

function hasErrorMessage(error: unknown, pattern: RegExp) {
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (
    typeof current === 'object' &&
    current !== null &&
    !visited.has(current)
  ) {
    visited.add(current);

    if ('message' in current && typeof current.message === 'string') {
      pattern.lastIndex = 0;
      if (pattern.test(current.message)) {
        return true;
      }
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return false;
}

export function isPostgresDuplicateKeyError(error: unknown) {
  return getPostgresErrorCode(error) === POSTGRES_DUPLICATE_KEY_ERROR_CODE;
}

export function isPostgresUndefinedTableError(error: unknown) {
  return getPostgresErrorCode(error) === POSTGRES_UNDEFINED_TABLE_ERROR_CODE;
}

export function isPostgresConnectionError(error: unknown) {
  const errorCode = getPostgresErrorCode(error);

  return (
    (errorCode ? POSTGRES_CONNECTION_ERROR_CODES.has(errorCode) : false) ||
    hasErrorMessage(error, /\bconnect[_\s-]*timeout\b/i)
  );
}
