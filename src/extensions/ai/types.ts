/**
 * AI Configs to use AI functions
 */
export interface AIConfigs {
  [key: string]: any;
}

/**
 * ai media type
 */
export enum AIMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
  SPEECH = 'speech',
}

export interface AIImage {
  id?: string;
  createTime?: Date;
  imageType?: string
  imageUrl?: string;
}

export interface AIVideo {
  id?: string;
  createTime?: Date;
  videoUrl?: string;
  videoType?: string;
  thumbnailUrl?: string;
}

export type AIStudioAttemptStatus = 'success' | 'failed' | 'skipped';

export interface AIStudioAttempt {
  provider: string;
  model: string;
  label?: string;
  status: AIStudioAttemptStatus;
  error?: string;
  timestamp?: string;
}

export interface AIStudioTrace {
  requestedProvider: string;
  requestedModel: string;
  scene: string;
  activeProvider: string;
  activeModel: string;
  attempts: AIStudioAttempt[];
  updatedAt: string;
}

/**
 * AI generate params
 */
export interface AIGenerateParams {
  mediaType: AIMediaType;
  prompt: string;
  model?: string;
  // custom options
  options?: any;
  // receive notify result
  callbackUrl?: string;
  // is return stream
  stream?: boolean;
  // is async
  async?: boolean;
}

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * AI task info
 */
export interface AITaskInfo {
  images?: AIImage[];
  videos?: AIVideo[];
  status?: string; // provider task status
  errorCode?: string;
  errorMessage?: string;
  createTime?: Date;
  queuePosition?: number;
  responseUrl?: string;
  statusUrl?: string;
  cancelUrl?: string;
  studio?: AIStudioTrace;
}

/**
 * AI task result
 */
export interface AITaskResult {
  taskStatus: AITaskStatus;
  taskId: string; // provider task id
  taskInfo?: AITaskInfo;
  taskResult?: any; // raw result from provider
}

/**
 * AI Provider provide AI functions
 */
export interface AIProvider {
  // provider name
  readonly name: string;

  // provider configs
  configs: AIConfigs;

  // generate content
  generate({ params }: { params: AIGenerateParams }): Promise<AITaskResult>;

  // query task
  query?({
    taskId,
    model,
  }: {
    taskId: string;
    model?: string;
  }): Promise<AITaskResult>;
}
