import { isCloudflareWorker } from '@/shared/lib/env';
import type { Configs } from '@/shared/models/config';

type RuntimeEnv = Record<string, string | undefined>;

type AnalyticsRuntimeIssueCode =
  | 'missing-google-analytics'
  | 'missing-plausible'
  | 'partial-plausible-config';

export type AnalyticsRuntimeIssue = {
  code: AnalyticsRuntimeIssueCode;
  message: string;
};

type ResolveAnalyticsRuntimeIssueOptions = {
  isCloudflareWorker?: boolean;
  isProductionLike?: boolean;
  runtimeEnv?: RuntimeEnv;
};

type WarnAboutAnalyticsRuntimeConfigOptions =
  ResolveAnalyticsRuntimeIssueOptions & {
    logger?: (message: string, details: unknown) => void;
  };

const GOOGLE_ANALYTICS_ENV_KEYS = [
  'GOOGLE_ANALYTICS_ID',
  'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
] as const;
const PLAUSIBLE_DOMAIN_ENV_KEYS = [
  'PLAUSIBLE_DOMAIN',
  'NEXT_PUBLIC_PLAUSIBLE_DOMAIN',
  'NEXT_PUBLIC_DOMAIN',
] as const;
const PLAUSIBLE_SRC_ENV_KEYS = [
  'PLAUSIBLE_SRC',
  'NEXT_PUBLIC_PLAUSIBLE_SCRIPT',
  'NEXT_PUBLIC_PLAUSIBLE_URL',
  'NEXT_PUBLIC_Plausible_URL',
] as const;

let hasWarnedAboutCloudflareAnalyticsRuntimeConfig = false;

function hasValue(value: string | undefined | null) {
  return typeof value === 'string' && value.trim().length > 0;
}

function summarizeEnvBindings(
  runtimeEnv: RuntimeEnv,
  keys: readonly string[]
): Record<string, 'set' | 'missing'> {
  return Object.fromEntries(
    keys.map((key) => [key, hasValue(runtimeEnv[key]) ? 'set' : 'missing'])
  );
}

function isProductionLikeRuntime(
  explicitValue?: boolean,
  runtimeEnv: RuntimeEnv = process.env
) {
  if (typeof explicitValue === 'boolean') {
    return explicitValue;
  }

  return (
    runtimeEnv.NODE_ENV === 'production' ||
    runtimeEnv.NEXT_PUBLIC_DEBUG === 'true'
  );
}

export function resolveCloudflareAnalyticsRuntimeIssues(
  configs: Configs,
  options: ResolveAnalyticsRuntimeIssueOptions = {}
): AnalyticsRuntimeIssue[] {
  const runtimeEnv = options.runtimeEnv ?? process.env;
  const runningOnCloudflare =
    options.isCloudflareWorker ?? isCloudflareWorker;

  if (!runningOnCloudflare) {
    return [];
  }

  if (!isProductionLikeRuntime(options.isProductionLike, runtimeEnv)) {
    return [];
  }

  const hasGoogleAnalytics = hasValue(configs.google_analytics_id);
  const hasPlausibleDomain = hasValue(configs.plausible_domain);
  const hasPlausibleSrc = hasValue(configs.plausible_src);
  const issues: AnalyticsRuntimeIssue[] = [];

  if (!hasGoogleAnalytics) {
    issues.push({
      code: 'missing-google-analytics',
      message:
        'google_analytics_id did not resolve. Set GOOGLE_ANALYTICS_ID or NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, or persist google_analytics_id as a runtime setting override.',
    });
  }

  if (hasPlausibleDomain !== hasPlausibleSrc) {
    issues.push({
      code: 'partial-plausible-config',
      message:
        'plausible_domain and plausible_src must resolve together. Set PLAUSIBLE_DOMAIN + PLAUSIBLE_SRC, NEXT_PUBLIC_DOMAIN + NEXT_PUBLIC_PLAUSIBLE_URL, or persist both runtime setting overrides.',
    });
  } else if (!hasPlausibleDomain) {
    issues.push({
      code: 'missing-plausible',
      message:
        'Plausible did not resolve. Set PLAUSIBLE_DOMAIN + PLAUSIBLE_SRC, NEXT_PUBLIC_DOMAIN + NEXT_PUBLIC_PLAUSIBLE_URL, or persist plausible_domain + plausible_src as runtime setting overrides.',
    });
  }

  return issues;
}

export function warnAboutCloudflareAnalyticsRuntimeConfig(
  configs: Configs,
  options: WarnAboutAnalyticsRuntimeConfigOptions = {}
) {
  if (hasWarnedAboutCloudflareAnalyticsRuntimeConfig) {
    return;
  }

  const runtimeEnv = options.runtimeEnv ?? process.env;
  const issues = resolveCloudflareAnalyticsRuntimeIssues(configs, {
    ...options,
    runtimeEnv,
  });

  if (issues.length === 0) {
    return;
  }

  const logger = options.logger ?? console.warn;
  logger(
    '[analytics/runtime-check] Cloudflare Worker analytics config is incomplete',
    {
      issues,
      resolvedConfigs: {
        google_analytics_id: hasValue(configs.google_analytics_id)
          ? 'set'
          : 'missing',
        plausible_domain: hasValue(configs.plausible_domain)
          ? 'set'
          : 'missing',
        plausible_src: hasValue(configs.plausible_src) ? 'set' : 'missing',
      },
      runtimeBindings: {
        ...summarizeEnvBindings(runtimeEnv, GOOGLE_ANALYTICS_ENV_KEYS),
        ...summarizeEnvBindings(runtimeEnv, PLAUSIBLE_DOMAIN_ENV_KEYS),
        ...summarizeEnvBindings(runtimeEnv, PLAUSIBLE_SRC_ENV_KEYS),
      },
    }
  );

  hasWarnedAboutCloudflareAnalyticsRuntimeConfig = true;
}

export function resetCloudflareAnalyticsRuntimeWarningState() {
  hasWarnedAboutCloudflareAnalyticsRuntimeConfig = false;
}
