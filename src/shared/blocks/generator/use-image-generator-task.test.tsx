// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';

import { ACTIVE_IMAGE_GENERATOR_TASK_STORAGE_KEY } from './image-generator-task-request';
import { useImageGeneratorTask } from './use-image-generator-task';

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

function createJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitForAssertion(assertion: () => void, attempts = 20) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flushAsyncWork();
    }
  }

  throw lastError;
}

type HookValue = ReturnType<typeof useImageGeneratorTask>;

async function renderUseImageGeneratorTask(
  overrides?: Partial<Parameters<typeof useImageGeneratorTask>[0]>
) {
  let latestValue: HookValue | null = null;
  const container = document.createElement('div');
  const root = createRoot(container);

  function Harness() {
    latestValue = useImageGeneratorTask({
      normalizeErrorMessage: (raw) => `friendly:${raw ?? 'unknown'}`,
      fetchUserCredits: vi.fn(),
      messages: {
        stillProcessing: 'still processing',
        noResult: 'no result',
        taskCompleted: 'task completed',
        imageGenerated: 'image generated',
        videoGenerated: 'video generated',
        createTaskFailed: 'create task failed',
      },
      ...overrides,
    });

    return null;
  }

  await act(async () => {
    root.render(createElement(Harness));
  });

  return {
    get value() {
      if (!latestValue) {
        throw new Error('Hook value is not ready yet.');
      }

      return latestValue;
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('use-image-generator-task', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T12:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn());
    window.localStorage.clear();
    toastMocks.error.mockReset();
    toastMocks.info.mockReset();
    toastMocks.success.mockReset();
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('polls guest image tasks through the dedicated guest query route with the issued task token', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          data: {
            id: 'guest-task-1',
            taskId: 'guest-task-1',
            taskToken: 'guest-task-token-1',
            status: AITaskStatus.PROCESSING,
            provider: 'kie',
            model: 'kie-nano-banana',
            taskInfo: null,
            taskResult: null,
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          data: {
            id: 'guest-task-1',
            status: AITaskStatus.SUCCESS,
            provider: 'kie',
            model: 'kie-nano-banana',
            prompt: 'guest skyline',
            taskResult: {
              images: ['https://cdn.example.com/guest-output.webp'],
            },
          },
        })
      );

    const rendered = await renderUseImageGeneratorTask();

    await act(async () => {
      await rendered.value.startGeneration({
        scene: 'text-to-image',
        provider: 'kie',
        model: 'kie-nano-banana',
        prompt: 'guest skyline',
        notifyOnCompletion: false,
        notifyOnCompletionByDefault: false,
        isGuest: true,
        mode: 'text-to-image',
        imageResolution: '1K',
        imageAspectRatio: '1:1',
        imageOutputFormat: 'jpg',
        webSearch: false,
        imageUrls: [],
      });
    });

    await waitForAssertion(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/api/ai/guest-image-generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            scene: 'text-to-image',
            model: 'kie-nano-banana',
            prompt: 'guest skyline',
            options: {
              aspect_ratio: '1:1',
              resolution: '1K',
              output_format: 'jpg',
              web_search: false,
            },
          }),
        })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/ai/guest-image-query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            taskId: 'guest-task-1',
            taskToken: 'guest-task-token-1',
          }),
        })
      );
    });

    await waitForAssertion(() => {
      expect(rendered.value.isGenerating).toBe(false);
      expect(rendered.value.generatedMedia).toEqual([
        {
          id: 'guest-task-1-0',
          url: 'https://cdn.example.com/guest-output.webp',
          type: 'image',
          mimeType: undefined,
          provider: 'kie',
          model: 'kie-nano-banana',
          prompt: 'guest skyline',
        },
      ]);
      expect(rendered.value.generatedMediaIsGuest).toBe(true);
      expect(
        window.localStorage.getItem(ACTIVE_IMAGE_GENERATOR_TASK_STORAGE_KEY)
      ).toBeNull();
    });

    await rendered.unmount();
  });

  it('keeps account image task results out of guest local history provenance', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          data: {
            id: 'account-task-1',
            taskId: 'account-task-1',
            status: AITaskStatus.PROCESSING,
            provider: 'kie',
            model: 'kie-nano-banana',
            taskInfo: null,
            taskResult: null,
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          data: {
            id: 'account-task-1',
            status: AITaskStatus.SUCCESS,
            provider: 'kie',
            model: 'kie-nano-banana',
            prompt: 'account skyline',
            taskResult: {
              images: ['https://cdn.example.com/account-output.webp'],
            },
          },
        })
      );

    const rendered = await renderUseImageGeneratorTask();

    await act(async () => {
      await rendered.value.startGeneration({
        scene: 'text-to-image',
        provider: 'kie',
        model: 'kie-nano-banana',
        prompt: 'account skyline',
        notifyOnCompletion: true,
        notifyOnCompletionByDefault: true,
        mode: 'text-to-image',
        imageResolution: '1K',
        imageAspectRatio: '1:1',
        imageOutputFormat: 'jpg',
        webSearch: false,
        imageUrls: [],
      });
    });

    await waitForAssertion(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/api/ai/generate',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/ai/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            taskId: 'account-task-1',
          }),
        })
      );
    });

    await waitForAssertion(() => {
      expect(rendered.value.isGenerating).toBe(false);
      expect(rendered.value.generatedMedia).toEqual([
        {
          id: 'account-task-1-0',
          url: 'https://cdn.example.com/account-output.webp',
          type: 'image',
          mimeType: undefined,
          provider: 'kie',
          model: 'kie-nano-banana',
          prompt: 'account skyline',
        },
      ]);
      expect(rendered.value.generatedMediaIsGuest).toBe(false);
    });

    await rendered.unmount();
  });

  it('passes guest generate error codes into the image error normalizer', async () => {
    const fetchMock = vi.mocked(global.fetch);
    const normalizeErrorMessage = vi.fn(
      (
        raw?: string,
        context?: { status?: number; errorCode?: string | null }
      ) => `friendly:${context?.status}:${context?.errorCode}:${raw}`
    );
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          code: -1,
          message: 'prompt is required',
          errorCode: 'guest_image_prompt_required',
        },
        400
      )
    );

    const rendered = await renderUseImageGeneratorTask({
      normalizeErrorMessage,
    });

    await act(async () => {
      await rendered.value.startGeneration({
        scene: 'text-to-image',
        provider: 'kie',
        model: 'kie-nano-banana',
        prompt: '',
        notifyOnCompletion: false,
        notifyOnCompletionByDefault: false,
        isGuest: true,
        mode: 'text-to-image',
        imageResolution: '1K',
        imageAspectRatio: '1:1',
        imageOutputFormat: 'jpg',
        webSearch: false,
        imageUrls: [],
      });
    });

    expect(normalizeErrorMessage).toHaveBeenCalledWith('prompt is required', {
      status: 400,
      errorCode: 'guest_image_prompt_required',
    });
    expect(toastMocks.error).toHaveBeenCalledWith(
      'friendly:400:guest_image_prompt_required:prompt is required'
    );

    await rendered.unmount();
  });
});
