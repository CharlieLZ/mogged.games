import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';
import type { Configs } from '@/shared/models/config';

import {
  SeedanceProviderConfigError,
  SeedanceProviderRequestError,
} from './errors';
import { SeedanceService } from './service';
import { parseSeedanceTraceFromUnknown } from './trace';

vi.mock('server-only', () => ({}));

function buildConfigs(overrides: Partial<Configs> = {}): Configs {
  return {
    app_url: 'https://mogged.games',
    volcengine_api_key: '',
    apixo_api_key: '',
    apixo_api_base_url: 'https://api.apixo.ai',
    apimart_api_key: '',
    apimart_api_base_url: 'https://api.apimart.ai',
    evolink_api_key: '',
    evolink_api_base_url: 'https://api.evolink.ai',
    seedance_kie_enabled: 'false',
    fal_api_key: '',
    fal_api_base_url: '',
    kie_api_key: '',
    kie_api_base_url: 'https://api.kie.ai',
    replicate_api_token: '',
    ...overrides,
  };
}

describe('SeedanceService runtime config', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to Volcengine -> KIE fallback when the runtime switch is omitted', () => {
    const configs = buildConfigs({
      kie_api_key: 'kie-secret',
    });

    delete (configs as Partial<Configs>).seedance_kie_enabled;

    const service = new SeedanceService(configs);

    expect(service.getRuntimeConfig()).toMatchObject({
      enabledProviders: ['volcengine', 'kie'],
      defaultProvider: 'volcengine',
      providerOrder: ['volcengine', 'kie'],
      routingMode: 'fallback',
      kieEnabled: true,
    });
    expect(service.isFallbackEnabled()).toBe(true);
    expect(service.hasFallbackAfter('volcengine')).toBe(true);
  });

  it('stays official-only when the KIE runtime switch is explicitly disabled', () => {
    const service = new SeedanceService(buildConfigs());

    expect(service.getRuntimeConfig()).toMatchObject({
      enabledProviders: ['volcengine'],
      defaultProvider: 'volcengine',
      providerOrder: ['volcengine'],
      routingMode: 'single',
    });
    expect(service.isFallbackEnabled()).toBe(false);
    expect(service.hasFallbackAfter('volcengine')).toBe(false);
  });

  it('enables KIE through the dedicated runtime switch without opening other legacy providers', () => {
    const service = new SeedanceService(
      buildConfigs({
        seedance_kie_enabled: 'true',
      })
    );

    expect(service.getRuntimeConfig()).toMatchObject({
      enabledProviders: ['volcengine', 'kie'],
      defaultProvider: 'volcengine',
      providerOrder: ['volcengine', 'kie'],
      routingMode: 'fallback',
      kieEnabled: true,
    });
    expect(service.hasFallbackAfter('volcengine')).toBe(true);
  });

  it('surfaces the missing official provider credential in the config error', async () => {
    const originalVolcengineApiKey = process.env.VOLCENGINE_API_KEY;
    const originalArkApiKey = process.env.ARK_API_KEY;

    delete process.env.VOLCENGINE_API_KEY;
    delete process.env.ARK_API_KEY;

    try {
      const service = new SeedanceService(buildConfigs());

      await expect(
        service.generate({
          request: {
            scene: 'text-to-video',
            fast: true,
            prompt: 'golden horse at sunset',
            duration: 15,
            executionExpiresAfter: 172800,
            resolution: '720p',
            aspectRatio: '16:9',
            generateAudio: true,
            webSearch: false,
            watermark: false,
            imageUrls: [],
            videoUrls: [],
            audioUrls: [],
            returnLastFrame: false,
          },
        })
      ).rejects.toThrowError(
        new SeedanceProviderConfigError(
          'No Seedance providers are configured. Missing credentials: volcengine (set VOLCENGINE_API_KEY or save the Volcengine API Key in admin settings).'
        )
      );
    } finally {
      if (originalVolcengineApiKey === undefined) {
        delete process.env.VOLCENGINE_API_KEY;
      } else {
        process.env.VOLCENGINE_API_KEY = originalVolcengineApiKey;
      }

      if (originalArkApiKey === undefined) {
        delete process.env.ARK_API_KEY;
      } else {
        process.env.ARK_API_KEY = originalArkApiKey;
      }
    }
  });

  it('keeps the runtime narrowed to volcengine and optional KIE even when env strings list legacy providers', () => {
    const service = new SeedanceService(
      buildConfigs({
        seedance_enabled_providers:
          'volcengine,apimart,apixo,volcengine,evolink,kie',
        seedance_provider_order: 'apixo,volcengine,apimart,apixo,evolink,kie',
        seedance_default_provider: 'kie',
        seedance_provider_mode: 'single',
        seedance_kie_enabled: 'true',
      })
    );

    expect(service.getRuntimeConfig()).toMatchObject({
      enabledProviders: ['volcengine', 'kie'],
      providerOrder: ['volcengine', 'kie'],
      defaultProvider: 'volcengine',
      routingMode: 'fallback',
      kieEnabled: true,
    });
  });

  it('retries KIE with callback urls and records provider model ids in trace', async () => {
    const service = new SeedanceService(
      buildConfigs({
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'fallback-task-2',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'pending',
        },
        taskResult: null,
      },
    });

    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.retryWithFallback({
      task: {
        id: 'task-1',
        scene: 'text-to-video',
        provider: 'volcengine',
        model: 'doubao-seedance-2-0-fast-260128',
        prompt: 'golden horse at sunset',
        options: {
          fast: true,
        },
        taskInfo: {
          errorMessage: 'Volcengine query failed: upstream timeout',
        },
        taskResult: {
          error: 'upstream timeout',
        },
      },
      loggerLabel: 'test',
    });

    expect(kieGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackUrl: 'https://mogged.games/api/ai/notify/kie',
      })
    );

    const trace = parseSeedanceTraceFromUnknown(result?.taskInfo);
    expect(trace?.attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'kie',
          model: 'bytedance/seedance-2-fast',
          status: 'success',
        }),
      ])
    );
  });

  it('retries KIE when the official generate failure is a safety block', async () => {
    const service = new SeedanceService(
      buildConfigs({
        volcengine_api_key: 'volcengine-secret',
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const volcengineGenerate = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'Volcengine generate failed: OutputVideoSensitiveContentDetected. The request failed because the output video may contain sensitive information.'
        )
      );
    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-safety-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });

    (service as any).adapters.volcengine = {
      provider: 'volcengine',
      generate: volcengineGenerate,
      query: vi.fn(),
    };
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.generate({
      request: {
        scene: 'text-to-video',
        fast: true,
        prompt: 'golden horse at sunset',
        duration: 15,
        executionExpiresAfter: 172800,
        resolution: '720p',
        aspectRatio: '16:9',
        generateAudio: true,
        webSearch: false,
        watermark: false,
        imageUrls: [],
        videoUrls: [],
        audioUrls: [],
        returnLastFrame: false,
      },
    });

    expect(result.provider).toBe('kie');
    expect(kieGenerate).toHaveBeenCalled();
  });

  it('retries KIE when the official generate failure is a retryable upstream outage', async () => {
    const service = new SeedanceService(
      buildConfigs({
        volcengine_api_key: 'volcengine-secret',
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const volcengineGenerate = vi
      .fn()
      .mockRejectedValue(
        new Error('Volcengine generate failed: upstream timeout')
      );
    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });

    (service as any).adapters.volcengine = {
      provider: 'volcengine',
      generate: volcengineGenerate,
      query: vi.fn(),
    };
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.generate({
      request: {
        scene: 'text-to-video',
        fast: true,
        prompt: 'golden horse at sunset',
        duration: 15,
        executionExpiresAfter: 172800,
        resolution: '720p',
        aspectRatio: '16:9',
        generateAudio: true,
        webSearch: false,
        watermark: false,
        imageUrls: [],
        videoUrls: [],
        audioUrls: [],
        returnLastFrame: false,
      },
    });

    expect(result.provider).toBe('kie');
    expect(kieGenerate).toHaveBeenCalled();
  });

  it('retries KIE when the official generate failure is a provider auth error', async () => {
    const service = new SeedanceService(
      buildConfigs({
        volcengine_api_key: 'volcengine-secret',
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const volcengineGenerate = vi
      .fn()
      .mockRejectedValue(
        new SeedanceProviderRequestError(
          'Volcengine generate failed: 401 Unauthorized'
        )
      );
    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-auth',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });

    (service as any).adapters.volcengine = {
      provider: 'volcengine',
      generate: volcengineGenerate,
      query: vi.fn(),
    };
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.generate({
      request: {
        scene: 'text-to-video',
        fast: true,
        prompt: 'golden horse at sunset',
        duration: 15,
        executionExpiresAfter: 172800,
        resolution: '720p',
        aspectRatio: '16:9',
        generateAudio: true,
        webSearch: false,
        watermark: false,
        imageUrls: [],
        videoUrls: [],
        audioUrls: [],
        returnLastFrame: false,
      },
    });

    expect(result.provider).toBe('kie');
    expect(kieGenerate).toHaveBeenCalled();
  });

  it('retries KIE when the official generate failure is unknown but not blocked by fallback policy', async () => {
    const service = new SeedanceService(
      buildConfigs({
        volcengine_api_key: 'volcengine-secret',
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const volcengineGenerate = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'Volcengine generate failed: provider rejected request without a retryable status code'
        )
      );
    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-unknown',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });

    (service as any).adapters.volcengine = {
      provider: 'volcengine',
      generate: volcengineGenerate,
      query: vi.fn(),
    };
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.generate({
      request: {
        scene: 'text-to-video',
        fast: true,
        prompt: 'golden horse at sunset',
        duration: 15,
        executionExpiresAfter: 172800,
        resolution: '720p',
        aspectRatio: '16:9',
        generateAudio: true,
        webSearch: false,
        watermark: false,
        imageUrls: [],
        videoUrls: [],
        audioUrls: [],
        returnLastFrame: false,
      },
    });

    expect(result.provider).toBe('kie');
    expect(kieGenerate).toHaveBeenCalled();
  });

  it('retries KIE when the official generate failure is a real-person reference restriction', async () => {
    const service = new SeedanceService(
      buildConfigs({
        volcengine_api_key: 'volcengine-secret',
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const volcengineGenerate = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'Volcengine generate failed: The request failed because the input image may contain real person.'
        )
      );
    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-real-person-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });

    (service as any).adapters.volcengine = {
      provider: 'volcengine',
      generate: volcengineGenerate,
      query: vi.fn(),
    };
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.generate({
      request: {
        scene: 'image-to-video',
        fast: true,
        prompt: '',
        duration: 15,
        executionExpiresAfter: 172800,
        resolution: '720p',
        aspectRatio: '16:9',
        generateAudio: true,
        webSearch: false,
        watermark: false,
        imageUrls: ['https://cdn.example.com/real-person.png'],
        videoUrls: [],
        audioUrls: [],
        returnLastFrame: false,
      },
    });

    expect(result.provider).toBe('kie');
    expect(kieGenerate).toHaveBeenCalled();
  });

  it('retries fallback providers for terminal safety failures', async () => {
    const service = new SeedanceService(
      buildConfigs({
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-terminal-safety',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.retryWithFallback({
      task: {
        id: 'task-2',
        scene: 'text-to-video',
        provider: 'volcengine',
        model: 'doubao-seedance-2-0-fast-260128',
        prompt: 'unsafe prompt',
        options: {
          fast: true,
        },
        taskInfo: {
          errorCode: 'OutputVideoSensitiveContentDetected',
          errorMessage:
            'The request failed because the output video may contain sensitive information.',
        },
        taskResult: {
          error_code: 'OutputVideoSensitiveContentDetected',
        },
      },
      loggerLabel: 'test',
    });

    expect(result).toMatchObject({
      provider: 'kie',
      taskId: 'kie-task-terminal-safety',
      status: AITaskStatus.PROCESSING,
    });
    expect(kieGenerate).toHaveBeenCalled();
  });

  it('retries fallback providers for missing provider task lookups', async () => {
    const service = new SeedanceService(
      buildConfigs({
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-query-missing',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.retryWithFallback({
      task: {
        id: 'task-query-missing',
        scene: 'text-to-video',
        provider: 'volcengine',
        model: 'doubao-seedance-2-0-fast-260128',
        prompt: 'safe prompt',
        options: {
          fast: true,
        },
        taskInfo: {
          statusUrl:
            'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/cgt-missing',
          errorCode: '404',
          errorMessage: 'Volcengine query failed: task not found',
        },
        taskResult: null,
      },
      loggerLabel: 'test',
    });

    expect(result).toMatchObject({
      provider: 'kie',
      taskId: 'kie-task-query-missing',
      status: AITaskStatus.PROCESSING,
    });
    expect(kieGenerate).toHaveBeenCalled();
  });

  it('retries fallback providers for terminal retryable upstream failures', async () => {
    const service = new SeedanceService(
      buildConfigs({
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-2',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.retryWithFallback({
      task: {
        id: 'task-3',
        scene: 'text-to-video',
        provider: 'volcengine',
        model: 'doubao-seedance-2-0-fast-260128',
        prompt: 'safe prompt',
        options: {
          fast: true,
        },
        taskInfo: {
          errorMessage: 'Volcengine query failed: upstream timeout',
        },
        taskResult: {
          error: 'upstream timeout',
        },
      },
      loggerLabel: 'test',
    });

    expect(result).toMatchObject({
      provider: 'kie',
      taskId: 'kie-task-2',
      status: AITaskStatus.PROCESSING,
    });
    expect(kieGenerate).toHaveBeenCalled();
  });

  it('retries KIE for terminal volcengine failures that are not blocked by policy or input validation', async () => {
    const service = new SeedanceService(
      buildConfigs({
        kie_api_key: 'kie-secret',
        seedance_kie_enabled: 'true',
      })
    );

    const kieGenerate = vi.fn().mockResolvedValue({
      provider: 'kie',
      model: 'bytedance/seedance-2-fast',
      result: {
        taskId: 'kie-task-3',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          status: 'waiting',
        },
        taskResult: null,
      },
    });
    (service as any).adapters.kie = {
      provider: 'kie',
      generate: kieGenerate,
      query: vi.fn(),
    };

    const result = await service.retryWithFallback({
      task: {
        id: 'task-4',
        scene: 'text-to-video',
        provider: 'volcengine',
        model: 'doubao-seedance-2-0-fast-260128',
        prompt: 'safe prompt',
        options: {
          fast: true,
        },
        taskInfo: {
          status: 'failed',
        },
        taskResult: {
          id: 'cgt-123',
        },
      },
      loggerLabel: 'test',
    });

    expect(result).toMatchObject({
      provider: 'kie',
      taskId: 'kie-task-3',
      status: AITaskStatus.PROCESSING,
    });
    expect(kieGenerate).toHaveBeenCalled();
  });
});
