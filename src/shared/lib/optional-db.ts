import { isPostgresConnectionError } from '@/shared/lib/postgres-error';

const OPTIONAL_DB_COOLDOWN_MS = 30_000;

let optionalDbCooldownUntil = 0;
const optionalDbWarnedScopes = new Set<string>();

function inOptionalDbCooldown(now = Date.now()) {
  return optionalDbCooldownUntil > now;
}

function clearOptionalDbCooldown() {
  optionalDbCooldownUntil = 0;
  optionalDbWarnedScopes.clear();
}

function enterOptionalDbCooldown(now = Date.now()) {
  optionalDbCooldownUntil = now + OPTIONAL_DB_COOLDOWN_MS;
  optionalDbWarnedScopes.clear();
}

function warnOptionalDbScopeOnce(
  scope: string,
  message: string,
  details: Record<string, unknown>
) {
  const warningKey = `${scope}:${message}`;

  if (optionalDbWarnedScopes.has(warningKey)) {
    return;
  }

  optionalDbWarnedScopes.add(warningKey);
  console.warn(message, details);
}

async function resolveFallback<T>(fallback: T | (() => T | Promise<T>)) {
  return typeof fallback === 'function'
    ? await (fallback as () => T | Promise<T>)()
    : fallback;
}

export async function withOptionalDbFallback<T>({
  fallback,
  operation,
  scope,
}: {
  fallback: T | (() => T | Promise<T>);
  operation: () => Promise<T>;
  scope: string;
}) {
  if (inOptionalDbCooldown()) {
    warnOptionalDbScopeOnce(
      scope,
      '[optional-db] skipping optional database access during cooldown',
      {
        cooldownMsRemaining: optionalDbCooldownUntil - Date.now(),
        scope,
      }
    );

    return resolveFallback(fallback);
  }

  try {
    const result = await operation();
    clearOptionalDbCooldown();
    return result;
  } catch (error) {
    if (!isPostgresConnectionError(error)) {
      throw error;
    }

    enterOptionalDbCooldown();
    warnOptionalDbScopeOnce(
      scope,
      '[optional-db] optional database access failed, entering cooldown',
      {
        cooldownMs: OPTIONAL_DB_COOLDOWN_MS,
        error,
        scope,
      }
    );

    return resolveFallback(fallback);
  }
}

export function resetOptionalDbCooldownForTest() {
  clearOptionalDbCooldown();
}

export { OPTIONAL_DB_COOLDOWN_MS };
