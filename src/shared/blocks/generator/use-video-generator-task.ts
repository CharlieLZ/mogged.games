import type { AIGenerationScene } from '@/config/ai-model-registry';

import {
  useGeneratorTask,
  type GeneratorTaskErrorContext,
} from './use-generator-task';
import {
  ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY,
  buildVideoGeneratorRequestOptions,
  estimateVideoGeneratorTaskRuntime,
  type VideoGeneratorTaskRequestInput,
} from './video-generator-task-request';

type UseVideoGeneratorTaskMessages = {
  stillProcessing: string;
  noResult: string;
  taskCompleted: string;
  imageGenerated: string;
  videoGenerated: string;
  createTaskFailed: string;
};

type StartVideoGeneratorTaskInput = VideoGeneratorTaskRequestInput & {
  scene: AIGenerationScene;
  provider: string;
  model: string;
  prompt: string;
  notifyOnCompletion: boolean;
  notifyOnCompletionByDefault: boolean;
  isGuest?: boolean;
};

type UseVideoGeneratorTaskParams = {
  isVideoMode?: boolean;
  normalizeErrorMessage: (
    raw?: string,
    context?: GeneratorTaskErrorContext
  ) => string;
  fetchUserCredits: () => Promise<unknown> | void;
  messages: UseVideoGeneratorTaskMessages;
};

export function useVideoGeneratorTask({
  isVideoMode: _isVideoMode,
  normalizeErrorMessage,
  fetchUserCredits,
  messages,
}: UseVideoGeneratorTaskParams) {
  return useGeneratorTask<StartVideoGeneratorTaskInput>({
    storageKey: ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY,
    loggerLabel: 'ai/video-generator',
    normalizeErrorMessage,
    fetchUserCredits,
    messages,
    buildRequestOptions: buildVideoGeneratorRequestOptions,
    estimateRuntime: estimateVideoGeneratorTaskRuntime,
  });
}
