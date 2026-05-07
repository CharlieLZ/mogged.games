// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';

import { useVideoGeneratorTask } from './use-video-generator-task';
import { ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY } from './video-generator-task-request';

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

const POLL_INTERVAL_MS = 5000;

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

async function advancePollingInterval(ms = POLL_INTERVAL_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
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

type HookValue = ReturnType<typeof useVideoGeneratorTask>;

async function renderUseVideoGeneratorTask(
  overrides?: Partial<Parameters<typeof useVideoGeneratorTask>[0]>
) {
  let latestValue: HookValue | null = null;
  const container = document.createElement('div');
  const root = createRoot(container);

  function Harness() {
    latestValue = useVideoGeneratorTask({
      isVideoMode: false,
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

describe('use-video-generator-task', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T12:00:00.000Z'));
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
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

  it('restores a persisted task and keeps polling until it completes successfully', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          data: {
            id: 'task_restore_success',
            status: AITaskStatus.PROCESSING,
            provider: 'studio',
            model: 'legacy-model',
            prompt: 'golden hour skyline',
            taskResult: null,
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          data: {
            id: 'task_restore_success',
            status: AITaskStatus.PROCESSING,
            provider: 'studio',
            model: 'legacy-model',
            prompt: 'golden hour skyline',
            taskResult: null,
          },
        })
      )
      .mockResolvedValue(
        createJsonResponse({
          code: 0,
          data: {
            id: 'task_restore_success',
            status: AITaskStatus.SUCCESS,
            provider: 'studio',
            model: 'legacy-model',
            prompt: 'golden hour skyline',
            taskResult: JSON.stringify({
              images: ['https://cdn.example.com/output.webp'],
            }),
          },
        })
      );

    window.localStorage.setItem(
      ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY,
      JSON.stringify({
        id: 'task_restore_success',
        mediaType: AIMediaType.IMAGE,
        startTime: Date.now() - 1000,
      })
    );

    const rendered = await renderUseVideoGeneratorTask();

    await waitForAssertion(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ai/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ taskId: 'task_restore_success' }),
        })
      );
    });

    await advancePollingInterval();
    await advancePollingInterval();

    await waitForAssertion(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(rendered.value.isGenerating).toBe(false);
      expect(rendered.value.errorMessage).toBeNull();
      expect(rendered.value.generatedMedia).toEqual([
        {
          id: 'task_restore_success-0',
          url: 'https://cdn.example.com/output.webp',
          type: 'image',
          mimeType: undefined,
          provider: 'studio',
          model: 'legacy-model',
          prompt: 'golden hour skyline',
        },
      ]);
      expect(
        window.localStorage.getItem(ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY)
      ).toBeNull();
      expect(toastMocks.success).toHaveBeenCalledWith('task completed');
    });

    await rendered.unmount();
  });

  it('restores a persisted task and surfaces polling failures with cleanup', async () => {
    const fetchUserCredits = vi.fn();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        code: 0,
        data: {
          id: 'task_restore_failed',
          status: AITaskStatus.FAILED,
          provider: 'studio',
          model: 'legacy-model',
          prompt: 'storm over neon city',
          taskResult: JSON.stringify({
            failure_reason: 'provider timeout',
          }),
        },
      })
    );

    window.localStorage.setItem(
      ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY,
      JSON.stringify({
        id: 'task_restore_failed',
        mediaType: AIMediaType.VIDEO,
        startTime: Date.now() - 1000,
      })
    );

    const rendered = await renderUseVideoGeneratorTask({
      isVideoMode: true,
      fetchUserCredits,
    });

    await waitForAssertion(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(rendered.value.isGenerating).toBe(false);
      expect(rendered.value.errorMessage).toBe('friendly:provider timeout');
      expect(rendered.value.taskStatus).toBeNull();
      expect(
        window.localStorage.getItem(ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY)
      ).toBeNull();
      expect(fetchUserCredits).toHaveBeenCalledTimes(1);
      expect(toastMocks.error).toHaveBeenCalledWith(
        'friendly:provider timeout'
      );
    });

    await rendered.unmount();
  });

  it('uses normalized taskInfo media for successful video tasks before falling back to raw provider payloads', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue(
      createJsonResponse({
        code: 0,
        data: {
          id: 'task_volc_success',
          status: AITaskStatus.SUCCESS,
          provider: 'volcengine',
          model: 'doubao-seedance-2-0-fast-260128',
          prompt: 'test',
          taskInfo: {
            videos: [
              {
                videoUrl: 'https://cdn.example.com/persistent-output.mp4',
              },
            ],
          },
          taskResult: {
            content: {
              video_url: 'https://ark.example.com/temporary-output.mp4',
            },
          },
        },
      })
    );

    window.localStorage.setItem(
      ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY,
      JSON.stringify({
        id: 'task_volc_success',
        mediaType: AIMediaType.VIDEO,
        startTime: Date.now() - 1000,
      })
    );

    const rendered = await renderUseVideoGeneratorTask({
      isVideoMode: true,
    });

    await waitForAssertion(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ai/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ taskId: 'task_volc_success' }),
        })
      );
      expect(rendered.value.isGenerating).toBe(false);
      expect(rendered.value.errorMessage).toBeNull();
      expect(rendered.value.generatedMedia).toEqual([
        {
          id: 'task_volc_success-0',
          url: 'https://cdn.example.com/persistent-output.mp4',
          type: 'video',
          mimeType: undefined,
          provider: 'volcengine',
          model: 'doubao-seedance-2-0-fast-260128',
          prompt: 'test',
        },
      ]);
      expect(toastMocks.error).not.toHaveBeenCalledWith('no result');
      expect(toastMocks.success).toHaveBeenCalledWith('task completed');
    });

    await rendered.unmount();
  });

  it('forwards completion notification preferences when creating a task', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        code: 0,
        data: {
          id: 'task_notify_pref',
          status: AITaskStatus.PROCESSING,
        },
      })
    );
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        code: 0,
        data: {
          id: 'task_notify_pref',
          status: AITaskStatus.PROCESSING,
          provider: 'seedance',
          model: 'seedance-2.0',
          prompt: 'send me the finished render',
          taskResult: null,
        },
      })
    );

    const rendered = await renderUseVideoGeneratorTask({
      isVideoMode: true,
    });

    await act(async () => {
      await rendered.value.startGeneration({
        scene: 'text-to-video',
        mode: 'text-to-video',
        provider: 'seedance',
        model: 'seedance-2.0',
        prompt: 'send me the finished render',
        seed: '',
        videoDurationSeconds: '5',
        videoResolution: '720p',
        videoAspectRatio: '16:9',
        fast: true,
        generateAudio: true,
        webSearch: false,
        returnLastFrame: false,
        imageUrls: [],
        videoUrls: [],
        audioUrls: [],
        notifyOnCompletion: true,
        notifyOnCompletionByDefault: true,
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/generate',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const generateRequest = fetchMock.mock.calls[0]?.[1] as
      | { body?: string }
      | undefined;
    const parsedBody = generateRequest?.body
      ? JSON.parse(generateRequest.body)
      : null;

    expect(parsedBody).toMatchObject({
      mediaType: AIMediaType.VIDEO,
      scene: 'text-to-video',
      provider: 'seedance',
      model: 'seedance-2.0',
      async: true,
      prompt: 'send me the finished render',
      notifications: {
        notifyOnCompletion: true,
        notifyOnCompletionByDefault: true,
      },
    });

    await rendered.unmount();
  });

  it('passes API error codes into the video error normalizer on create failure', async () => {
    const fetchMock = vi.mocked(global.fetch);
    const normalizeErrorMessage = vi.fn(
      (
        raw?: string,
        context?: { status?: number; errorCode?: string | null }
      ) =>
        `friendly:${context?.status ?? 'none'}:${context?.errorCode ?? 'none'}:${raw ?? 'unknown'}`
    );

    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          code: -1,
          message:
            'This AI route is temporarily unavailable because an upstream provider is not configured.',
          errorCode: 'ai_generate_provider_unavailable',
        },
        503
      )
    );

    const rendered = await renderUseVideoGeneratorTask({
      normalizeErrorMessage,
    });

    await act(async () => {
      await rendered.value.startGeneration({
        scene: 'text-to-video',
        provider: 'seedance',
        model: 'seedance-2.0',
        prompt: 'storm over neon city',
        notifyOnCompletion: false,
        notifyOnCompletionByDefault: false,
        mode: 'text-to-video',
        seed: '',
        videoDurationSeconds: '5',
        videoResolution: '720p',
        videoAspectRatio: '16:9',
        fast: true,
        generateAudio: false,
        webSearch: false,
        returnLastFrame: false,
        imageUrls: [],
        videoUrls: [],
        audioUrls: [],
      });
    });

    expect(normalizeErrorMessage).toHaveBeenCalledWith(
      'This AI route is temporarily unavailable because an upstream provider is not configured.',
      {
        status: 503,
        errorCode: 'ai_generate_provider_unavailable',
      }
    );
    expect(toastMocks.error).toHaveBeenCalledWith(
      'friendly:503:ai_generate_provider_unavailable:This AI route is temporarily unavailable because an upstream provider is not configured.'
    );

    await rendered.unmount();
  });
});
