import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';

import { KieImageService } from './service';

vi.mock('@/extensions/ai/provider-utils', () => ({
  createImageItemsFromUrls: vi.fn(async ({ taskId, urls }) =>
    urls.map((url: string, index: number) => ({
      id: `${taskId}-${index}`,
      imageUrl: url,
    }))
  ),
  extractResultUrls: vi.fn(
    (payload: { resultUrls?: string[] }) => payload.resultUrls || []
  ),
}));

describe('KieImageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates text-to-image tasks with the KIE nano banana 2 API contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    const result = await service.generate({
      request: {
        scene: 'text-to-image',
        prompt: 'upgrade this product shot',
        aspectRatio: '1:1',
        resolution: '2K',
        outputFormat: 'png',
        webSearch: true,
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.kie.ai/api/v1/jobs/createTask',
      expect.objectContaining({
        method: 'POST',
      })
    );
    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'nano-banana-2',
      input: {
        prompt: 'upgrade this product shot',
        aspect_ratio: '1:1',
        resolution: '2K',
        output_format: 'png',
      },
    });
    expect(result.provider).toBe('kie-market');
    expect(result.model).toBe('nano-banana-2');
    expect(result.result.taskStatus).toBe(AITaskStatus.PENDING);
    expect(result.result.taskId).toBe('task-1');
  });

  it('creates image edit tasks with the KIE nano banana edit API contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    const result = await service.generate({
      request: {
        scene: 'image-to-image',
        model: 'google/nano-banana-edit',
        prompt: 'upgrade this product shot',
        imageUrl: 'https://cdn.example.com/source.png',
        imageUrls: ['https://cdn.example.com/source.png'],
        editMode: 'single-edit',
        aspectRatio: '4:5',
        resolution: '1K',
        outputFormat: 'png',
        webSearch: false,
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.kie.ai/api/v1/jobs/createTask',
      expect.objectContaining({
        method: 'POST',
      })
    );
    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'google/nano-banana-edit',
      input: {
        prompt: 'upgrade this product shot',
        image_urls: ['https://cdn.example.com/source.png'],
        output_format: 'png',
        image_size: '4:5',
      },
    });
    expect(result.provider).toBe('kie-market');
    expect(result.model).toBe('google/nano-banana-edit');
    expect(result.result.taskStatus).toBe(AITaskStatus.PENDING);
    expect(result.result.taskId).toBe('task-1');
  });

  it('creates Google Nano Banana text-to-image tasks with image_size', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'text-to-image',
        model: 'google/nano-banana',
        prompt: 'create a sharp product ad',
        aspectRatio: '4:3',
        resolution: '1K',
        outputFormat: 'png',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'google/nano-banana',
      input: {
        prompt: 'create a sharp product ad',
        output_format: 'png',
        image_size: '4:3',
      },
    });
  });

  it('creates GPT Image 2 edit tasks with input_urls as documented by KIE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'image-to-image',
        model: 'gpt-image-2-image-to-image',
        prompt: 'combine these into one editorial poster',
        imageUrls: [
          'https://cdn.example.com/source.png',
          'https://cdn.example.com/reference.png',
        ],
        editMode: 'multi-fusion',
        aspectRatio: '1:1',
        resolution: '2K',
        outputFormat: 'png',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'gpt-image-2-image-to-image',
      input: {
        prompt: 'combine these into one editorial poster',
        input_urls: [
          'https://cdn.example.com/source.png',
          'https://cdn.example.com/reference.png',
        ],
        aspect_ratio: '1:1',
      },
    });
  });

  it('creates GPT Image 2 text-to-image tasks without unsupported resolution fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'text-to-image',
        model: 'gpt-image-2-text-to-image',
        prompt: 'create a precise product ad',
        aspectRatio: '4:3',
        resolution: '4K',
        outputFormat: 'png',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'gpt-image-2-text-to-image',
      input: {
        prompt: 'create a precise product ad',
        aspect_ratio: '4:3',
      },
    });
  });

  it('creates Nano Banana 2 image-to-image tasks with image_input as documented by KIE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'image-to-image',
        model: 'nano-banana-2',
        prompt: 'edit this product shot',
        imageUrls: ['https://cdn.example.com/source.png'],
        editMode: 'single-edit',
        aspectRatio: 'auto',
        resolution: '4K',
        outputFormat: 'png',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'nano-banana-2',
      input: {
        prompt: 'edit this product shot',
        image_input: ['https://cdn.example.com/source.png'],
        aspect_ratio: 'auto',
        resolution: '4K',
        output_format: 'png',
      },
    });
  });

  it('creates Seedream 5.0 text-to-image tasks with the documented quality fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'text-to-image',
        model: 'seedream/5-lite-text-to-image',
        prompt: 'create a clean cafe SaaS product poster',
        aspectRatio: '1:1',
        resolution: '2K',
        outputFormat: 'png',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'seedream/5-lite-text-to-image',
      input: {
        prompt: 'create a clean cafe SaaS product poster',
        aspect_ratio: '1:1',
        quality: 'basic',
        nsfw_checker: false,
      },
    });
  });

  it('creates Seedream 5.0 edit tasks with image_urls and bounded defaults', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'image-to-image',
        model: 'seedream/5-lite-image-to-image',
        prompt: 'refine this source image',
        imageUrls: ['https://cdn.example.com/source.png'],
        editMode: 'single-edit',
        aspectRatio: '16:9',
        resolution: '4K',
        outputFormat: 'jpg',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'seedream/5-lite-image-to-image',
      input: {
        prompt: 'refine this source image',
        image_urls: ['https://cdn.example.com/source.png'],
        aspect_ratio: '16:9',
        quality: 'high',
        nsfw_checker: false,
      },
    });
  });

  it('creates Seedream 4.5 edit tasks with image_urls and bounded quality', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'image-to-image',
        model: 'seedream/4.5-edit',
        prompt: 'refine this source image',
        imageUrls: ['https://cdn.example.com/source.png'],
        editMode: 'single-edit',
        aspectRatio: '16:9',
        resolution: '4K',
        outputFormat: 'jpg',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'seedream/4.5-edit',
      input: {
        prompt: 'refine this source image',
        image_urls: ['https://cdn.example.com/source.png'],
        aspect_ratio: '16:9',
        quality: 'high',
        nsfw_checker: false,
      },
    });
  });

  it('creates Flux 2 image-to-image tasks with input_urls and safety defaults', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'image-to-image',
        model: 'flux-2/pro-image-to-image',
        prompt: 'replace the can in image 2 with image 1',
        imageUrls: [
          'https://cdn.example.com/source.png',
          'https://cdn.example.com/reference.png',
        ],
        aspectRatio: '1:1',
        resolution: '1K',
        outputFormat: 'jpg',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'flux-2/pro-image-to-image',
      input: {
        input_urls: [
          'https://cdn.example.com/source.png',
          'https://cdn.example.com/reference.png',
        ],
        prompt: 'replace the can in image 2 with image 1',
        aspect_ratio: '1:1',
        resolution: '1K',
        nsfw_checker: false,
      },
    });
  });

  it('creates Qwen image edit tasks with the documented single image_url contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'image-to-image',
        model: 'qwen/image-edit',
        prompt: 'make this product photo cleaner',
        imageUrl: 'https://cdn.example.com/source.png',
        aspectRatio: '4:3',
        resolution: '2K',
        outputFormat: 'png',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'qwen/image-edit',
      input: {
        prompt: 'make this product photo cleaner',
        image_url: 'https://cdn.example.com/source.png',
        acceleration: 'none',
        image_size: 'landscape_4_3',
        num_inference_steps: 25,
        guidance_scale: 4,
        sync_mode: false,
        enable_safety_checker: true,
        output_format: 'png',
        negative_prompt: 'blurry, ugly',
      },
    });
  });

  it('creates Ideogram V3 text-to-image tasks with the documented model id and image_size fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'text-to-image',
        model: 'ideogram/v3-text-to-image',
        prompt: 'a serene lakeside logo poster',
        aspectRatio: '1:1',
        resolution: '1K',
        outputFormat: 'png',
        webSearch: false,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'ideogram/v3-text-to-image',
      input: {
        prompt: 'a serene lakeside logo poster',
        rendering_speed: 'BALANCED',
        style: 'AUTO',
        expand_prompt: true,
        image_size: 'square_hd',
        negative_prompt: '',
      },
    });
  });

  it('creates Ideogram Character tasks through the image-to-image reference contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              status: 'waiting',
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    await service.generate({
      request: {
        scene: 'image-to-image',
        model: 'ideogram/character',
        prompt: 'place this character in a clean studio portrait',
        imageUrl: 'https://cdn.example.com/person.png',
        aspectRatio: '3:4',
        resolution: '1K',
        outputFormat: 'png',
        webSearch: false,
        numImages: 2,
      },
    });

    const createCall = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      model: 'ideogram/character',
      input: {
        prompt: 'place this character in a clean studio portrait',
        rendering_speed: 'BALANCED',
        style: 'AUTO',
        expand_prompt: true,
        image_size: 'portrait_4_3',
        negative_prompt: '',
        reference_image_urls: ['https://cdn.example.com/person.png'],
        num_images: '2',
      },
    });
  });

  it('queries task detail and turns resultJson image urls into task images', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              taskId: 'task-1',
              state: 'success',
              resultJson: JSON.stringify({
                resultUrls: ['https://cdn.example.com/output.png'],
              }),
            },
          })
        )
      )
    );

    const service = new KieImageService({
      kie_api_key: 'test-key',
      kie_api_base_url: 'https://api.kie.ai',
    } as any);

    const result = await service.query({
      taskId: 'task-1',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task-1',
      expect.any(Object)
    );
    expect(result.taskStatus).toBe(AITaskStatus.SUCCESS);
    expect(result.taskInfo?.images).toEqual([
      {
        id: 'task-1-0',
        imageUrl: 'https://cdn.example.com/output.png',
      },
    ]);
    expect(result.taskResult).toMatchObject({
      data: {
        parsedResultJson: {
          resultUrls: ['https://cdn.example.com/output.png'],
        },
      },
    });
  });
});
