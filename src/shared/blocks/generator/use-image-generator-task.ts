import type { AIGenerationScene } from '@/config/ai-model-registry';

import {
  ACTIVE_IMAGE_GENERATOR_TASK_STORAGE_KEY,
  buildImageGeneratorRequestOptions,
  estimateImageGeneratorTaskRuntime,
  type ImageGeneratorTaskRequestInput,
} from './image-generator-task-request';
import {
  useGeneratorTask,
  type GeneratorTaskErrorContext,
} from './use-generator-task';

type UseImageGeneratorTaskMessages = {
  stillProcessing: string;
  noResult: string;
  taskCompleted: string;
  imageGenerated: string;
  videoGenerated: string;
  createTaskFailed: string;
};

type StartImageGeneratorTaskInput = ImageGeneratorTaskRequestInput & {
  scene: AIGenerationScene;
  provider: string;
  model: string;
  prompt: string;
  notifyOnCompletion: boolean;
  notifyOnCompletionByDefault: boolean;
  isGuest?: boolean;
};

type UseImageGeneratorTaskParams = {
  normalizeErrorMessage: (
    raw?: string,
    context?: GeneratorTaskErrorContext
  ) => string;
  fetchUserCredits: () => Promise<unknown> | void;
  messages: UseImageGeneratorTaskMessages;
};

export function useImageGeneratorTask({
  normalizeErrorMessage,
  fetchUserCredits,
  messages,
}: UseImageGeneratorTaskParams) {
  return useGeneratorTask<StartImageGeneratorTaskInput>({
    storageKey: ACTIVE_IMAGE_GENERATOR_TASK_STORAGE_KEY,
    loggerLabel: 'ai/image-generator',
    normalizeErrorMessage,
    fetchUserCredits,
    messages,
    buildRequestOptions: buildImageGeneratorRequestOptions,
    estimateRuntime: estimateImageGeneratorTaskRuntime,
  });
}
