import type { Configs } from '@/shared/models/config';

import { APIMartSeedanceAdapter } from './adapters/apimart';
import { APIXOSeedanceAdapter } from './adapters/apixo';
import { EvoLinkSeedanceAdapter } from './adapters/evolink';
import { FalSeedanceAdapter } from './adapters/fal';
import { KIESeedanceAdapter } from './adapters/kie';
import { ReplicateSeedanceAdapter } from './adapters/replicate';
import { VolcengineSeedanceAdapter } from './adapters/volcengine';
import {
  assertSeedanceProviderSupportsRequest,
  isSeedanceProviderName,
} from './capability';
import { buildSeedanceCallbackUrl } from './callback-url';
import {
  SeedanceProviderConfigError,
  SeedanceProviderRequestError,
} from './errors';
import {
  classifySeedanceFailure,
  shouldBlockSeedanceProviderFallback,
} from './fallback-policy';
import {
  attachSeedanceTraceToTaskInfo,
  parseSeedanceTraceFromUnknown,
  SeedanceAttempt,
  SeedanceTrace,
} from './trace';
import {
  SEEDANCE_PROVIDER,
  SEEDANCE_REQUESTED_MODEL,
  SEEDANCE_RUNTIME_PROVIDERS,
  SeedanceProviderAdapter,
  SeedanceProviderGenerateResult,
  SeedanceProviderName,
  SeedanceRequest,
  SeedanceRoutingMode,
  SeedanceScene,
} from './types';
import { parseJsonRecord } from './utils';
import { normalizeSeedanceRequest } from './validation';

type SeedanceRuntimeConfig = {
  enabledProviders: SeedanceProviderName[];
  defaultProvider: SeedanceProviderName;
  providerOrder: SeedanceProviderName[];
  routingMode: SeedanceRoutingMode;
  kieEnabled: boolean;
};

type RetryableTask = {
  id: string;
  scene: string | null;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  options: unknown;
  taskInfo: unknown;
  taskResult: unknown;
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
}

function buildRuntimeConfig(configs: Configs): SeedanceRuntimeConfig {
  const kieEnabled = parseBoolean(configs.seedance_kie_enabled, true);
  const enabledProviders = SEEDANCE_RUNTIME_PROVIDERS.filter(
    (provider) => provider === 'volcengine' || kieEnabled
  );
  const providerOrder = [...enabledProviders];

  return {
    enabledProviders,
    defaultProvider: 'volcengine',
    providerOrder,
    routingMode: kieEnabled ? 'fallback' : 'single',
    kieEnabled,
  };
}

function isSeedanceScene(
  value: string | null | undefined
): value is SeedanceScene {
  return (
    value === 'text-to-video' ||
    value === 'image-to-video' ||
    value === 'reference-to-video'
  );
}

function buildAttempt(input: {
  provider: SeedanceProviderName;
  model: string;
  status: SeedanceAttempt['status'];
  error?: string;
}): SeedanceAttempt {
  return {
    provider: input.provider,
    model: input.model,
    status: input.status,
    error: input.error,
    timestamp: new Date().toISOString(),
  };
}

function buildTrace(input: {
  request: SeedanceRequest;
  routingMode: SeedanceRoutingMode;
  activeProvider: SeedanceProviderName;
  activeModel: string;
  attempts: SeedanceAttempt[];
}): SeedanceTrace {
  return {
    requestedProvider: SEEDANCE_PROVIDER,
    requestedModel: SEEDANCE_REQUESTED_MODEL,
    scene: input.request.scene,
    fast: input.request.fast,
    routingMode: input.routingMode,
    activeProvider: input.activeProvider,
    activeModel: input.activeModel,
    attempts: input.attempts,
    updatedAt: new Date().toISOString(),
  };
}

function getProviderCredentialHint(provider: SeedanceProviderName) {
  switch (provider) {
    case 'volcengine':
      return 'set VOLCENGINE_API_KEY or save the Volcengine API Key in admin settings';
    case 'apixo':
      return 'set APIXO_API_KEY or save the APIXO API Key in admin settings';
    case 'apimart':
      return 'set APIMART_API_KEY or save the APIMart API Key in admin settings';
    case 'evolink':
      return 'set EVOLINK_API_KEY or save the EvoLink API Key in admin settings';
    case 'fal':
      return 'set FAL_API_KEY or save the FAL API Key in admin settings';
    case 'kie':
      return 'set KIE_API_KEY_TEST / KIE_API_KEY_FREE / KIE_API_KEY_PAID or save the KIE API Keys in admin settings';
    case 'replicate':
      return 'set REPLICATE_API_TOKEN or save the Replicate API Token in admin settings';
  }
}

function getSeedanceProviderModel(
  provider: SeedanceProviderName,
  request: Pick<SeedanceRequest, 'fast'>
) {
  if (provider === 'volcengine') {
    return request.fast
      ? 'doubao-seedance-2-0-fast-260128'
      : 'doubao-seedance-2-0-260128';
  }
  if (provider === 'apixo') {
    return request.fast ? 'seedance-2-0-fast' : 'seedance-2-0';
  }
  if (provider === 'apimart') {
    return request.fast ? 'doubao-seedance-2.0-fast' : 'doubao-seedance-2.0';
  }
  if (provider === 'evolink') {
    return request.fast ? 'seedance-2.0-fast' : 'seedance-2.0';
  }
  if (provider === 'kie') {
    return request.fast ? 'bytedance/seedance-2-fast' : 'bytedance/seedance-2';
  }
  if (provider === 'replicate') {
    return request.fast
      ? 'bytedance/seedance-2.0-fast'
      : 'bytedance/seedance-2.0';
  }

  return 'seedance';
}

export class SeedanceService {
  private readonly runtimeConfig: SeedanceRuntimeConfig;
  private readonly adapters: Record<
    SeedanceProviderName,
    SeedanceProviderAdapter
  >;

  constructor(private readonly configs: Configs) {
    this.runtimeConfig = buildRuntimeConfig(configs);
    this.adapters = {
      volcengine: new VolcengineSeedanceAdapter(),
      apixo: new APIXOSeedanceAdapter({
        baseUrl: configs.apixo_api_base_url,
      }),
      apimart: new APIMartSeedanceAdapter({
        baseUrl: configs.apimart_api_base_url,
      }),
      evolink: new EvoLinkSeedanceAdapter({
        baseUrl: configs.evolink_api_base_url,
      }),
      fal: new FalSeedanceAdapter({
        baseUrl: configs.fal_api_base_url,
      }),
      kie: new KIESeedanceAdapter({
        baseUrl: configs.kie_api_base_url,
      }),
      replicate: new ReplicateSeedanceAdapter(),
    };
  }

  getRequestedProvider() {
    return SEEDANCE_PROVIDER;
  }

  getRequestedModel() {
    return SEEDANCE_REQUESTED_MODEL;
  }

  getRuntimeConfig() {
    return this.runtimeConfig;
  }

  isFallbackEnabled() {
    return this.runtimeConfig.routingMode === 'fallback';
  }

  isManagedProvider(provider: string | null | undefined) {
    return isSeedanceProviderName(provider);
  }

  private getApiKey(provider: SeedanceProviderName) {
    switch (provider) {
      case 'volcengine':
        return (
          process.env.VOLCENGINE_API_KEY?.trim() ||
          this.configs.volcengine_api_key?.trim() ||
          process.env.ARK_API_KEY?.trim()
        );
      case 'apixo':
        return this.configs.apixo_api_key?.trim();
      case 'apimart':
        return this.configs.apimart_api_key?.trim();
      case 'evolink':
        return this.configs.evolink_api_key?.trim();
      case 'fal':
        return this.configs.fal_api_key?.trim();
      case 'kie':
        return this.configs.kie_api_key?.trim();
      case 'replicate':
        return this.configs.replicate_api_token?.trim();
    }
  }

  private getDispatchProviders() {
    if (this.runtimeConfig.routingMode === 'fallback') {
      return [...this.runtimeConfig.providerOrder];
    }

    return [this.runtimeConfig.defaultProvider];
  }

  private getFallbackProvidersAfter(provider: SeedanceProviderName) {
    const currentIndex = this.runtimeConfig.providerOrder.indexOf(provider);
    if (currentIndex < 0) {
      return this.runtimeConfig.providerOrder.filter(
        (item) => item !== provider
      );
    }

    return this.runtimeConfig.providerOrder.slice(currentIndex + 1);
  }

  private getCallbackUrl(provider: SeedanceProviderName) {
    return buildSeedanceCallbackUrl({
      appUrl: this.configs.app_url,
      provider,
    });
  }

  hasFallbackAfter(provider: SeedanceProviderName) {
    return this.getFallbackProvidersAfter(provider).some((candidate) =>
      this.runtimeConfig.enabledProviders.includes(candidate)
    );
  }

  private hasEligibleFallbackProvider(
    provider: SeedanceProviderName,
    request: SeedanceRequest
  ) {
    return this.getFallbackProvidersAfter(provider).some((candidate) => {
      if (!this.runtimeConfig.enabledProviders.includes(candidate)) {
        return false;
      }

      if (!this.getApiKey(candidate)) {
        return false;
      }

      try {
        assertSeedanceProviderSupportsRequest(candidate, request);
        return true;
      } catch {
        return false;
      }
    });
  }

  private normalizeRetryRequest(task: RetryableTask) {
    if (!isSeedanceScene(task.scene)) {
      return null;
    }

    try {
      return normalizeSeedanceRequest({
        scene: task.scene,
        prompt: task.prompt || '',
        options: parseJsonRecord(task.options) || {},
      });
    } catch (error) {
      console.error('[seedance] failed to normalize fallback request', {
        taskId: task.id,
        scene: task.scene,
        provider: task.provider,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  shouldAttemptFallback(input: { task: RetryableTask }) {
    if (this.runtimeConfig.routingMode !== 'fallback') {
      return false;
    }

    if (!isSeedanceProviderName(input.task.provider)) {
      return false;
    }

    const request = this.normalizeRetryRequest(input.task);
    if (!request) {
      return false;
    }

    if (input.task.provider === 'volcengine') {
      return this.hasEligibleFallbackProvider(input.task.provider, request);
    }

    const decision = classifySeedanceFailure({
      taskInfo: input.task.taskInfo,
      taskResult: input.task.taskResult,
    });
    if (shouldBlockSeedanceProviderFallback(decision)) {
      return false;
    }

    return this.getFallbackProvidersAfter(input.task.provider).some(
      (provider) => {
        if (!this.getApiKey(provider)) {
          return false;
        }

        try {
          assertSeedanceProviderSupportsRequest(provider, request);
          return true;
        } catch {
          return false;
        }
      }
    );
  }

  async generate(input: {
    request: SeedanceRequest;
    callbackUrlForProvider?: (
      provider: SeedanceProviderName
    ) => string | undefined;
  }): Promise<SeedanceProviderGenerateResult> {
    const providers = this.getDispatchProviders();
    const attempts: SeedanceAttempt[] = [];

    for (const provider of providers) {
      const apiKey = this.getApiKey(provider);
      const adapter = this.adapters[provider];
      const model = getSeedanceProviderModel(provider, input.request);

      if (!apiKey) {
        attempts.push(
          buildAttempt({
            provider,
            model,
            status: 'skipped',
            error: `${provider} api key is not configured`,
          })
        );
        continue;
      }

      try {
        assertSeedanceProviderSupportsRequest(provider, input.request);
        const generated = await adapter.generate({
          apiKey,
          request: input.request,
          callbackUrl: input.callbackUrlForProvider?.(provider),
        });
        attempts.push(
          buildAttempt({
            provider,
            model: generated.model,
            status: 'success',
          })
        );

        generated.result.taskInfo = attachSeedanceTraceToTaskInfo(
          generated.result.taskInfo,
          buildTrace({
            request: input.request,
            routingMode: this.runtimeConfig.routingMode,
            activeProvider: generated.provider,
            activeModel: generated.model,
            attempts,
          })
        ) as any;

        return generated;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'provider request failed';
        const decision = classifySeedanceFailure({
          error,
        });
        attempts.push(
          buildAttempt({
            provider,
            model,
            status: message.includes('not configured') ? 'skipped' : 'failed',
            error: message,
          })
        );
        console.error('[seedance] generate candidate failed', {
          provider,
          model,
          scene: input.request.scene,
          fast: input.request.fast,
          category: decision.category,
          error: message,
        });

        if (
          provider === 'volcengine' &&
          this.hasEligibleFallbackProvider(provider, input.request)
        ) {
          continue;
        }

        if (shouldBlockSeedanceProviderFallback(decision)) {
          throw error instanceof Error
            ? error
            : new SeedanceProviderRequestError(message);
        }
      }
    }

    const configuredProviders = this.runtimeConfig.enabledProviders.filter(
      (provider) => Boolean(this.getApiKey(provider))
    );

    if (configuredProviders.length === 0) {
      const missingCredentials = this.runtimeConfig.enabledProviders.map(
        (provider) => `${provider} (${getProviderCredentialHint(provider)})`
      );

      throw new SeedanceProviderConfigError(
        `No Seedance providers are configured. Missing credentials: ${missingCredentials.join(', ')}.`
      );
    }

    throw new SeedanceProviderRequestError(
      `All Seedance providers failed for ${input.request.scene}: ${attempts
        .map(
          (attempt) =>
            `${attempt.provider}/${attempt.model}${attempt.error ? ` (${attempt.error})` : ''}`
        )
        .join(' -> ')}`
    );
  }

  async query(input: {
    provider: SeedanceProviderName;
    taskId: string;
    model?: string | null;
  }) {
    const apiKey = this.getApiKey(input.provider);
    if (!apiKey) {
      throw new SeedanceProviderConfigError(
        `${input.provider} api key is not configured`
      );
    }

    return this.adapters[input.provider].query({
      apiKey,
      taskId: input.taskId,
      model: input.model || undefined,
    });
  }

  async retryWithFallback(input: { task: RetryableTask; loggerLabel: string }) {
    if (!this.shouldAttemptFallback({ task: input.task })) {
      const decision = classifySeedanceFailure({
        taskInfo: input.task.taskInfo,
        taskResult: input.task.taskResult,
      });
      if (decision.category !== 'unknown') {
        console.warn(`[${input.loggerLabel}] seedance fallback skipped`, {
          taskId: input.task.id,
          provider: input.task.provider,
          category: decision.category,
          errorCode: decision.errorCode,
          errorMessage: decision.errorMessage,
        });
      }
      return null;
    }

    const request = this.normalizeRetryRequest(input.task);
    const currentProvider = input.task.provider;
    if (!request || !isSeedanceProviderName(currentProvider)) {
      return null;
    }
    const existingTrace = parseSeedanceTraceFromUnknown(
      parseJsonRecord(input.task.taskInfo)
    );
    const attempts = [...(existingTrace?.attempts || [])];
    const fallbackProviders = this.getFallbackProvidersAfter(currentProvider);

    for (const provider of fallbackProviders) {
      const apiKey = this.getApiKey(provider);
      const adapter = this.adapters[provider];
      const model = getSeedanceProviderModel(provider, request);

      if (!apiKey) {
        attempts.push(
          buildAttempt({
            provider,
            model,
            status: 'skipped',
            error: `${provider} api key is not configured`,
          })
        );
        continue;
      }

      try {
        assertSeedanceProviderSupportsRequest(provider, request);
        const generated = await adapter.generate({
          apiKey,
          request,
          callbackUrl: this.getCallbackUrl(provider),
        });

        attempts.push(
          buildAttempt({
            provider,
            model: generated.model,
            status: 'success',
          })
        );

        const taskInfo = attachSeedanceTraceToTaskInfo(
          generated.result.taskInfo,
          buildTrace({
            request,
            routingMode: this.runtimeConfig.routingMode,
            activeProvider: generated.provider,
            activeModel: generated.model,
            attempts,
          })
        );

        console.warn(`[${input.loggerLabel}] seedance fallback activated`, {
          taskId: input.task.id,
          scene: request.scene,
          provider: generated.provider,
          model: generated.model,
        });

        return {
          provider: generated.provider,
          model: generated.model,
          taskId: generated.result.taskId,
          status: generated.result.taskStatus,
          taskInfo,
          taskResult: generated.result.taskResult,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'provider request failed';
        attempts.push(
          buildAttempt({
            provider,
            model,
            status: 'failed',
            error: message,
          })
        );
        console.error(
          `[${input.loggerLabel}] seedance fallback candidate failed`,
          {
            taskId: input.task.id,
            scene: request.scene,
            provider,
            error: message,
          }
        );
      }
    }

    return null;
  }

  attachExistingTrace(input: {
    taskInfo: unknown;
    nextTaskInfo: unknown;
    provider: SeedanceProviderName;
    model: string;
    request?: SeedanceRequest | null;
  }) {
    const existingTrace = parseSeedanceTraceFromUnknown(input.taskInfo);
    if (!existingTrace) {
      return input.nextTaskInfo;
    }

    return attachSeedanceTraceToTaskInfo(input.nextTaskInfo, {
      ...existingTrace,
      activeProvider: input.provider,
      activeModel: input.model,
      fast: input.request?.fast ?? existingTrace.fast,
      scene: input.request?.scene ?? existingTrace.scene,
      updatedAt: new Date().toISOString(),
    });
  }
}
