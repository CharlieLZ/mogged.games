import {
  SEEDANCE_PROVIDER,
  SeedanceProviderName,
  SeedanceRoutingMode,
  SeedanceScene,
} from './types';

export type SeedanceAttemptStatus = 'success' | 'failed' | 'skipped';

export interface SeedanceAttempt {
  provider: SeedanceProviderName;
  model: string;
  status: SeedanceAttemptStatus;
  error?: string;
  timestamp: string;
}

export interface SeedanceTrace {
  requestedProvider: typeof SEEDANCE_PROVIDER;
  requestedModel: string;
  scene: SeedanceScene;
  fast: boolean;
  routingMode: SeedanceRoutingMode;
  activeProvider: SeedanceProviderName;
  activeModel: string;
  attempts: SeedanceAttempt[];
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAttemptStatus(value: unknown): value is SeedanceAttemptStatus {
  return value === 'success' || value === 'failed' || value === 'skipped';
}

function normalizeAttempt(value: unknown): SeedanceAttempt | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.provider !== 'string' ||
    typeof value.model !== 'string' ||
    !isAttemptStatus(value.status)
  ) {
    return null;
  }

  return {
    provider: value.provider as SeedanceProviderName,
    model: value.model,
    status: value.status,
    error: typeof value.error === 'string' ? value.error : undefined,
    timestamp:
      typeof value.timestamp === 'string'
        ? value.timestamp
        : new Date().toISOString(),
  };
}

export function parseSeedanceTraceFromUnknown(
  value: unknown
): SeedanceTrace | undefined {
  if (!isRecord(value) || !isRecord(value.seedance)) {
    return undefined;
  }

  const trace = value.seedance;
  if (
    trace.requestedProvider !== SEEDANCE_PROVIDER ||
    typeof trace.requestedModel !== 'string' ||
    typeof trace.scene !== 'string' ||
    typeof trace.fast !== 'boolean' ||
    typeof trace.routingMode !== 'string' ||
    typeof trace.activeProvider !== 'string' ||
    typeof trace.activeModel !== 'string'
  ) {
    return undefined;
  }

  const attempts = Array.isArray(trace.attempts)
    ? trace.attempts
        .map((attempt) => normalizeAttempt(attempt))
        .filter((attempt): attempt is SeedanceAttempt => attempt !== null)
    : [];

  return {
    requestedProvider: SEEDANCE_PROVIDER,
    requestedModel: trace.requestedModel,
    scene: trace.scene as SeedanceScene,
    fast: trace.fast,
    routingMode: trace.routingMode as SeedanceRoutingMode,
    activeProvider: trace.activeProvider as SeedanceProviderName,
    activeModel: trace.activeModel,
    attempts,
    updatedAt:
      typeof trace.updatedAt === 'string'
        ? trace.updatedAt
        : new Date().toISOString(),
  };
}

export function attachSeedanceTraceToTaskInfo(
  baseTaskInfo: unknown,
  trace: SeedanceTrace
) {
  const base = isRecord(baseTaskInfo) ? { ...baseTaskInfo } : {};

  return {
    ...base,
    seedance: trace,
  };
}
