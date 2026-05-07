import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { AIGenerationScene } from '@/config/ai-model-registry';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';

import {
  parseVideoGeneratorTaskResult,
  resolveVideoGeneratorTaskMedia,
  type VideoGeneratorBackendTask,
} from './video-generator-task-media';

type UseGeneratorTaskMessages = {
  stillProcessing: string;
  noResult: string;
  taskCompleted: string;
  imageGenerated: string;
  videoGenerated: string;
  createTaskFailed: string;
};

export type GeneratorTaskErrorContext = {
  status?: number;
  errorCode?: string | null;
};

class GeneratorTaskRequestError extends Error {
  readonly status?: number;
  readonly errorCode?: string | null;

  constructor(message: string, context: GeneratorTaskErrorContext = {}) {
    super(message);
    this.name = 'GeneratorTaskRequestError';
    this.status = context.status;
    this.errorCode = context.errorCode ?? null;
  }
}

type GeneratorTaskCommonInput = {
  scene: AIGenerationScene;
  provider: string;
  model: string;
  prompt: string;
  notifyOnCompletion: boolean;
  notifyOnCompletionByDefault: boolean;
  isGuest?: boolean;
};

type GeneratorTaskRuntime = {
  mediaType: AIMediaType;
  estimatedSeconds: number | null;
  videoDuration: number | null;
};

type PersistedGeneratorTask = {
  id: string;
  mediaType: AIMediaType | null;
  model?: string;
  prompt?: string;
  provider?: string;
  startTime?: number;
  queryEndpoint?: string;
  taskToken?: string;
};

type UseGeneratorTaskParams<TInput extends GeneratorTaskCommonInput> = {
  storageKey: string;
  loggerLabel: string;
  normalizeErrorMessage: (
    raw?: string,
    context?: GeneratorTaskErrorContext
  ) => string;
  fetchUserCredits: () => Promise<unknown> | void;
  messages: UseGeneratorTaskMessages;
  buildRequestOptions: (input: TInput) => Record<string, unknown>;
  estimateRuntime: (input: TInput) => GeneratorTaskRuntime;
};

const POLL_INTERVAL = 5000;
const IMAGE_SOFT_TIMEOUT_MS = 180000;
const VIDEO_SOFT_TIMEOUT_MS = 900000;

function createGenerateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `aigen_${crypto.randomUUID()}`;
  }

  return `aigen_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function parsePersistedGeneratorTask(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedGeneratorTask | null;
    if (!parsed?.id) {
      return null;
    }

    return {
      id: parsed.id,
      mediaType: parsed.mediaType ?? null,
      provider:
        typeof parsed.provider === 'string' ? parsed.provider : undefined,
      model: typeof parsed.model === 'string' ? parsed.model : undefined,
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : undefined,
      startTime:
        typeof parsed.startTime === 'number' ? parsed.startTime : undefined,
      queryEndpoint:
        typeof parsed.queryEndpoint === 'string'
          ? parsed.queryEndpoint
          : undefined,
      taskToken:
        typeof parsed.taskToken === 'string' ? parsed.taskToken : undefined,
    };
  } catch (error) {
    console.warn('[generator-task] restore active task failed', error);
    return null;
  }
}

function restorePersistedGeneratorTask(storageKey: string, storage: Storage) {
  return parsePersistedGeneratorTask(storage.getItem(storageKey));
}

function persistGeneratorTask(
  storageKey: string,
  storage: Storage,
  task: PersistedGeneratorTask
) {
  storage.setItem(
    storageKey,
    JSON.stringify({
      id: task.id,
      mediaType: task.mediaType ?? null,
      provider: task.provider,
      model: task.model,
      prompt: task.prompt,
      startTime: task.startTime ?? Date.now(),
      queryEndpoint: task.queryEndpoint,
      taskToken: task.taskToken,
    })
  );
}

function clearPersistedGeneratorTask(storageKey: string, storage: Storage) {
  storage.removeItem(storageKey);
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getGeneratorTaskErrorContext(
  error: unknown
): GeneratorTaskErrorContext {
  if (error instanceof GeneratorTaskRequestError) {
    return {
      status: error.status,
      errorCode: error.errorCode,
    };
  }

  return {};
}

async function readGeneratorTaskErrorResponse(
  response: Response,
  fallbackMessage: string
) {
  try {
    const payload = await response.json();

    return {
      message: getString(payload?.message) || fallbackMessage,
      errorCode: getString(payload?.errorCode),
    };
  } catch {
    return {
      message: fallbackMessage,
      errorCode: null,
    };
  }
}

export function useGeneratorTask<TInput extends GeneratorTaskCommonInput>({
  storageKey,
  loggerLabel,
  normalizeErrorMessage,
  fetchUserCredits,
  messages,
  buildRequestOptions,
  estimateRuntime,
}: UseGeneratorTaskParams<TInput>) {
  const [generatedMedia, setGeneratedMedia] = useState<
    ReturnType<typeof resolveVideoGeneratorTaskMedia>
  >([]);
  const [generatedMediaIsGuest, setGeneratedMediaIsGuest] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskMediaType, setTaskMediaType] = useState<AIMediaType | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null
  );
  const [timeoutNotified, setTimeoutNotified] = useState(false);
  const [taskStatus, setTaskStatus] = useState<AITaskStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [taskQueryEndpoint, setTaskQueryEndpoint] = useState('/api/ai/query');
  const [taskToken, setTaskToken] = useState<string | null>(null);
  const [taskProvider, setTaskProvider] = useState<string | null>(null);
  const [taskModel, setTaskModel] = useState<string | null>(null);
  const [taskPrompt, setTaskPrompt] = useState<string | null>(null);

  const clearActiveTask = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      clearPersistedGeneratorTask(storageKey, window.localStorage);
    } catch (error) {
      console.warn(`[${loggerLabel}] clear active task failed`, error);
    }
  }, [loggerLabel, storageKey]);

  const resetTaskState = useCallback(() => {
    clearActiveTask();
    setIsGenerating(false);
    setProgress(0);
    setEstimatedSeconds(null);
    setVideoDuration(null);
    setTaskId(null);
    setTaskMediaType(null);
    setTimeoutNotified(false);
    setGenerationStartTime(null);
    setTaskStatus(null);
    setErrorMessage(null);
    setTaskQueryEndpoint('/api/ai/query');
    setTaskToken(null);
    setTaskProvider(null);
    setTaskModel(null);
    setTaskPrompt(null);
  }, [clearActiveTask]);

  useEffect(() => {
    if (isGenerating || taskId || typeof window === 'undefined') {
      return;
    }

    const parsed = restorePersistedGeneratorTask(
      storageKey,
      window.localStorage
    );
    if (!parsed?.id) {
      return;
    }

    setTaskId(parsed.id);
    setTaskMediaType(parsed.mediaType ?? null);
    setGenerationStartTime(
      typeof parsed.startTime === 'number' ? parsed.startTime : Date.now()
    );
    setTaskStatus(AITaskStatus.PROCESSING);
    setTaskQueryEndpoint(parsed.queryEndpoint || '/api/ai/query');
    setTaskToken(parsed.taskToken || null);
    setTaskProvider(parsed.provider || null);
    setTaskModel(parsed.model || null);
    setTaskPrompt(parsed.prompt || null);
    setIsGenerating(true);
    setProgress((prev) => (prev > 0 ? prev : 20));
    setTimeoutNotified(false);
    setErrorMessage(null);
  }, [isGenerating, storageKey, taskId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isGenerating && taskId) {
      try {
        persistGeneratorTask(storageKey, window.localStorage, {
          id: taskId,
          mediaType: taskMediaType,
          startTime: generationStartTime ?? Date.now(),
          queryEndpoint: taskQueryEndpoint,
          taskToken: taskToken || undefined,
          provider: taskProvider || undefined,
          model: taskModel || undefined,
          prompt: taskPrompt || undefined,
        });
      } catch (error) {
        console.warn(`[${loggerLabel}] persist active task failed`, error);
      }
      return;
    }

    if (!isGenerating) {
      clearActiveTask();
    }
  }, [
    clearActiveTask,
    generationStartTime,
    isGenerating,
    loggerLabel,
    storageKey,
    taskId,
    taskMediaType,
    taskQueryEndpoint,
    taskToken,
    taskProvider,
    taskModel,
    taskPrompt,
  ]);

  const pollTaskStatus = useCallback(
    async (id: string) => {
      try {
        const mediaForTimeout = taskMediaType ?? AIMediaType.IMAGE;

        if (
          !timeoutNotified &&
          generationStartTime &&
          Date.now() - generationStartTime >
            (mediaForTimeout === AIMediaType.VIDEO
              ? VIDEO_SOFT_TIMEOUT_MS
              : IMAGE_SOFT_TIMEOUT_MS)
        ) {
          setTimeoutNotified(true);
          toast.info(messages.stillProcessing);
        }

        const isGuestQuery = Boolean(taskToken);
        if (isGuestQuery && !taskToken) {
          throw new Error('Guest task token missing');
        }

        const queryPayload = isGuestQuery
          ? { taskId: id, taskToken }
          : { taskId: id };

        const resp = await fetch(taskQueryEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queryPayload),
        });

        if (!resp.ok) {
          const errorPayload = await readGeneratorTaskErrorResponse(
            resp,
            `request failed with status: ${resp.status}`
          );
          throw new GeneratorTaskRequestError(errorPayload.message, {
            status: resp.status,
            errorCode: errorPayload.errorCode,
          });
        }

        const { code, message, data, errorCode } = await resp.json();
        if (code !== 0) {
          throw new GeneratorTaskRequestError(message || 'Query task failed', {
            errorCode: getString(errorCode),
          });
        }

        const task = data as VideoGeneratorBackendTask;
        const effectiveTask = {
          ...task,
          provider: task.provider || taskProvider || '',
          model: task.model || taskModel || '',
          prompt: task.prompt ?? taskPrompt ?? null,
        };
        const currentStatus = task.status as AITaskStatus;
        const parsedTaskInfo = parseVideoGeneratorTaskResult(
          effectiveTask.taskInfo ?? null
        );
        const parsedTaskResult = parseVideoGeneratorTaskResult(
          effectiveTask.taskResult
        );
        const mappedMedia = resolveVideoGeneratorTaskMedia(effectiveTask);

        setTaskStatus(currentStatus);

        if (currentStatus === AITaskStatus.PENDING) {
          setProgress((prev) => Math.max(prev, 20));
          return false;
        }

        if (currentStatus === AITaskStatus.PROCESSING) {
          if (mappedMedia.length > 0) {
            setGeneratedMedia(mappedMedia);
            setProgress((prev) => Math.max(prev, 85));
          } else {
            setProgress((prev) => Math.min(prev + 10, 80));
          }
          return false;
        }

        if (currentStatus === AITaskStatus.SUCCESS) {
          if (mappedMedia.length === 0) {
            console.warn(
              `[${loggerLabel}] task completed without media output`,
              {
                taskId: task.id,
                provider: effectiveTask.provider,
                model: effectiveTask.model,
                taskInfoKeys:
                  effectiveTask.taskInfo &&
                  typeof effectiveTask.taskInfo === 'object'
                    ? Object.keys(effectiveTask.taskInfo)
                    : [],
                taskResultKeys:
                  effectiveTask.taskResult &&
                  typeof effectiveTask.taskResult === 'object'
                    ? Object.keys(effectiveTask.taskResult)
                    : [],
              }
            );
            setErrorMessage(messages.noResult);
            toast.error(messages.noResult);
            setGeneratedMediaIsGuest(false);
            setProgress(100);
            setIsGenerating(false);
            setEstimatedSeconds(null);
            setVideoDuration(null);
            setTaskId(null);
            setTaskMediaType(null);
            setTimeoutNotified(false);
            setGenerationStartTime(null);
            setTaskStatus(null);
            setTaskToken(null);
            setTaskProvider(null);
            setTaskModel(null);
            setTaskPrompt(null);
          } else {
            setGeneratedMediaIsGuest(Boolean(taskToken));
            setGeneratedMedia(mappedMedia);
            setErrorMessage(null);
            toast.success(messages.taskCompleted);
            setProgress(100);
            resetTaskState();
          }

          return true;
        }

        if (currentStatus === AITaskStatus.FAILED) {
          const resultRecord =
            parsedTaskResult && typeof parsedTaskResult === 'object'
              ? (parsedTaskResult as Record<string, unknown>)
              : null;
          const infoRecord =
            parsedTaskInfo && typeof parsedTaskInfo === 'object'
              ? (parsedTaskInfo as Record<string, unknown>)
              : null;
          const failureReason =
            getString(resultRecord?.error) ??
            getString(resultRecord?.failure_reason) ??
            getString(infoRecord?.errorMessage) ??
            getString(infoRecord?.error_message);
          const failureErrorCode =
            getString(resultRecord?.errorCode) ??
            getString(resultRecord?.error_code) ??
            getString(infoRecord?.errorCode) ??
            getString(infoRecord?.error_code);
          const friendly = normalizeErrorMessage(failureReason || undefined, {
            errorCode: failureErrorCode,
          });
          setErrorMessage(friendly);
          toast.error(friendly);
          setGeneratedMediaIsGuest(false);
          setIsGenerating(false);
          setProgress(0);
          setEstimatedSeconds(null);
          setVideoDuration(null);
          setTaskId(null);
          setTaskMediaType(null);
          setTimeoutNotified(false);
          setGenerationStartTime(null);
          setTaskStatus(null);
          setTaskToken(null);
          setTaskProvider(null);
          setTaskModel(null);
          setTaskPrompt(null);
          clearActiveTask();
          fetchUserCredits();
          return true;
        }

        setProgress((prev) => Math.min(prev + 5, 95));
        return false;
      } catch (error: any) {
        console.error(`[${loggerLabel}] poll task failed`, error);
        const friendly = normalizeErrorMessage(
          error?.message,
          getGeneratorTaskErrorContext(error)
        );
        setErrorMessage(friendly);
        toast.error(friendly);
        setGeneratedMediaIsGuest(false);
        setIsGenerating(false);
        setProgress(0);
        setEstimatedSeconds(null);
        setVideoDuration(null);
        setTaskId(null);
        setTaskMediaType(null);
        setTimeoutNotified(false);
        setGenerationStartTime(null);
        setTaskStatus(null);
        setTaskToken(null);
        setTaskProvider(null);
        setTaskModel(null);
        setTaskPrompt(null);
        clearActiveTask();
        fetchUserCredits();
        return true;
      }
    },
    [
      clearActiveTask,
      fetchUserCredits,
      generationStartTime,
      loggerLabel,
      messages.noResult,
      messages.stillProcessing,
      messages.taskCompleted,
      normalizeErrorMessage,
      resetTaskState,
      taskMediaType,
      taskModel,
      taskPrompt,
      taskProvider,
      taskQueryEndpoint,
      taskToken,
      timeoutNotified,
    ]
  );

  useEffect(() => {
    if (!taskId || !isGenerating) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (!taskId) {
        return;
      }

      const completed = await pollTaskStatus(taskId);
      if (completed) {
        cancelled = true;
      }
    };

    void tick();

    const interval = setInterval(async () => {
      if (cancelled || !taskId) {
        clearInterval(interval);
        return;
      }

      const completed = await pollTaskStatus(taskId);
      if (completed) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isGenerating, pollTaskStatus, taskId]);

  const startGeneration = useCallback(
    async (input: TInput) => {
      const idempotencyKey = createGenerateIdempotencyKey();
      const runtime = estimateRuntime(input);
      const generationStartedAt = Date.now();

      setIsGenerating(true);
      setProgress(15);
      setTaskStatus(AITaskStatus.PENDING);
      setGeneratedMedia([]);
      setGeneratedMediaIsGuest(false);
      setErrorMessage(null);
      setGenerationStartTime(generationStartedAt);
      setTaskMediaType(runtime.mediaType);
      setTimeoutNotified(false);
      setEstimatedSeconds(runtime.estimatedSeconds);
      setVideoDuration(runtime.videoDuration);
      const useGuestImageRoute =
        input.isGuest === true && runtime.mediaType === AIMediaType.IMAGE;
      const createEndpoint = useGuestImageRoute
        ? '/api/ai/guest-image-generate'
        : '/api/ai/generate';
      const queryEndpoint = useGuestImageRoute
        ? '/api/ai/guest-image-query'
        : '/api/ai/query';

      setTaskQueryEndpoint(queryEndpoint);
      setTaskToken(null);
      setTaskProvider(input.provider);
      setTaskModel(input.model);
      setTaskPrompt(input.prompt);

      try {
        const options = buildRequestOptions(input);
        const resp = await fetch(createEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(
            useGuestImageRoute
              ? {
                  scene: input.scene,
                  model: input.model,
                  prompt: input.prompt,
                  options,
                }
              : {
                  mediaType: runtime.mediaType,
                  scene: input.scene,
                  provider: input.provider,
                  model: input.model,
                  async: true,
                  prompt: input.prompt,
                  options,
                  notifications: {
                    notifyOnCompletion: input.notifyOnCompletion,
                    notifyOnCompletionByDefault:
                      input.notifyOnCompletionByDefault,
                  },
                }
          ),
        });

        if (!resp.ok) {
          const errorPayload = await readGeneratorTaskErrorResponse(
            resp,
            `request failed with status: ${resp.status}`
          );
          throw new GeneratorTaskRequestError(errorPayload.message, {
            status: resp.status,
            errorCode: errorPayload.errorCode,
          });
        }

        const { code, message, data, errorCode } = await resp.json();
        if (code !== 0) {
          throw new GeneratorTaskRequestError(
            message || messages.createTaskFailed,
            {
              errorCode: getString(errorCode),
            }
          );
        }

        const newTaskId = data?.taskId || data?.id;
        if (!newTaskId) {
          throw new Error('Task id missing in response');
        }
        const nextTaskToken =
          typeof data?.taskToken === 'string' ? data.taskToken : null;
        if (data.status === AITaskStatus.SUCCESS && data.taskInfo) {
          const mediaItems = resolveVideoGeneratorTaskMedia({
            id: newTaskId,
            provider: data.provider || input.provider,
            model: data.model || input.model,
            prompt: input.prompt,
            taskInfo: data.taskInfo ?? null,
            taskResult: data.taskResult ?? null,
          });

          if (mediaItems.length > 0) {
            setGeneratedMediaIsGuest(useGuestImageRoute);
            setGeneratedMedia(mediaItems);
            setErrorMessage(null);
            toast.success(
              runtime.mediaType === AIMediaType.VIDEO
                ? messages.videoGenerated
                : messages.imageGenerated
            );
            setProgress(100);
            resetTaskState();
            await fetchUserCredits();
            return;
          }
        }

        setTaskQueryEndpoint(queryEndpoint);
        setTaskToken(nextTaskToken);
        setTaskProvider(
          (data?.provider as string | undefined) || input.provider
        );
        setTaskModel((data?.model as string | undefined) || input.model);
        setTaskPrompt(input.prompt);
        setTaskId(newTaskId);
        setProgress(25);
        await fetchUserCredits();
      } catch (error: any) {
        console.error(`[${loggerLabel}] create task failed`, error);
        const friendly = normalizeErrorMessage(
          error?.message,
          getGeneratorTaskErrorContext(error)
        );
        setErrorMessage(friendly);
        toast.error(friendly);
        setGeneratedMediaIsGuest(false);
        setIsGenerating(false);
        setProgress(0);
        setEstimatedSeconds(null);
        setVideoDuration(null);
        setTaskId(null);
        setTaskMediaType(null);
        setTimeoutNotified(false);
        setGenerationStartTime(null);
        setTaskStatus(null);
        setTaskToken(null);
        setTaskProvider(null);
        setTaskModel(null);
        setTaskPrompt(null);
        clearActiveTask();
      }
    },
    [
      buildRequestOptions,
      clearActiveTask,
      estimateRuntime,
      fetchUserCredits,
      loggerLabel,
      messages.createTaskFailed,
      messages.imageGenerated,
      messages.videoGenerated,
      normalizeErrorMessage,
      resetTaskState,
    ]
  );

  return {
    errorMessage,
    estimatedSeconds,
    generatedMedia,
    generatedMediaIsGuest,
    isGenerating,
    progress,
    resetTaskState,
    startGeneration,
    taskStatus,
    videoDuration,
  };
}
