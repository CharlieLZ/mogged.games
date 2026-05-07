import 'server-only';

import { fal } from '@fal-ai/client';
import { nanoid } from 'nanoid';

import { envConfigs } from '@/config';
import {
  AIConfigs,
  AIGenerateParams,
  AIImage,
  AIVideo,
  AIMediaType,
  AIProvider,
  AITaskInfo,
  AITaskResult,
  AITaskStatus,
} from './types';

export interface FalConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
}

const parsePositive = (value: string | undefined, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

/**
 * 解析超时；<=0 代表不设置超时（用户想禁用限制）。
 */
const parseTimeout = (value: string | undefined, fallback: number | undefined) => {
  if (value === undefined) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num <= 0) return undefined;
  return num;
};

// 默认关闭超时；需要时再通过环境变量开启
const SUBMIT_TIMEOUT_MS = parseTimeout(process.env.FAL_SUBMIT_TIMEOUT_MS, undefined);
const QUEUE_TIMEOUT_MS = parseTimeout(process.env.FAL_QUEUE_TIMEOUT_MS, undefined);
const DEFAULT_POLL_INTERVAL_MS = parsePositive(process.env.FAL_POLL_INTERVAL_MS, 2000);

type FalQueueStatus =
  | 'IN_QUEUE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | string;

const LEGACY_DEFAULT_TEXT_TO_IMAGE_MODEL = 'fal-ai/longcat-image';
const LEGACY_DEFAULT_TEXT_TO_VIDEO_MODEL =
  'fal-ai/longcat-video/distilled/text-to-video/480p';
const LEGACY_DEFAULT_IMAGE_TO_VIDEO_MODEL =
  'fal-ai/longcat-video/distilled/image-to-video/480p';

export class FalProvider implements AIProvider {
  readonly name = 'fal';
  configs: FalConfigs;
  private readonly defaultImageToVideoModel = LEGACY_DEFAULT_IMAGE_TO_VIDEO_MODEL;
  private readonly defaultTextToVideoModel = LEGACY_DEFAULT_TEXT_TO_VIDEO_MODEL;

  constructor(configs: FalConfigs) {
    this.configs = configs;

    if (!this.configs.apiKey) {
      throw new Error('Fal apiKey is required');
    }
  }

  private configureClient() {
    const config: Record<string, any> = {
      credentials: this.configs.apiKey,
    };

    if (this.configs.baseUrl) {
      try {
        const base = new URL(this.configs.baseUrl);
        config.requestMiddleware = async (request: any) => {
          try {
            const nextUrl = new URL(request.url);
            nextUrl.protocol = base.protocol;
            nextUrl.host = base.host;
            return {
              ...request,
              url: nextUrl.toString(),
            };
          } catch {
            return request;
          }
        };
      } catch (error) {
        console.warn('[FAL] invalid baseUrl, fallback to default', error);
      }
    }

    fal.config(config);
  }

  private resolveModel(
    mediaType: AIMediaType,
    model?: string,
    options?: Record<string, unknown>
  ): string {
    if (model) return model;

    if (mediaType === AIMediaType.VIDEO) {
      const opts = options as Record<string, unknown> | undefined;
      const hasImageInput =
        !!(opts?.['image_url'] || opts?.['imageUrl'] || opts?.['image'] || opts?.['source_image'] || opts?.['start_image_url']);
      return hasImageInput ? this.defaultImageToVideoModel : this.defaultTextToVideoModel;
    }

    return LEGACY_DEFAULT_TEXT_TO_IMAGE_MODEL;
  }

  private detectMediaType(url: string | undefined): 'image' | 'video' {
    if (!url) return 'image';
    const lower = url.toLowerCase();
    if (
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.gif')
    ) {
      return 'video';
    }
    return 'image';
  }

  private async maybeRehostUrl(
    url: string | undefined,
    type: 'image' | 'video'
  ): Promise<string | undefined> {
    if (!url) return url;

    const lowered = url.toLowerCase();
    if (
      (envConfigs.r2_domain && lowered.startsWith(envConfigs.r2_domain.toLowerCase())) ||
      (envConfigs.r2_endpoint && lowered.startsWith(envConfigs.r2_endpoint.toLowerCase())) ||
      (envConfigs.r2_bucket_name &&
        lowered.includes(`/${envConfigs.r2_bucket_name.toLowerCase()}/`))
    ) {
      return url;
    }

    try {
      const { getStorageService } = await import('@/shared/services/storage');
      const storageService = await getStorageService();
      const pathname = (() => {
        try {
          return new URL(url).pathname;
        } catch {
          return url.split('?')[0];
        }
      })();
      const extMatch = pathname.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1] : type === 'video' ? 'mp4' : 'png';
      const key = `ai/${this.name}/${type}s/${Date.now()}-${nanoid()}.${ext}`;
      const upload = await storageService.downloadAndUpload({
        url,
        key,
      });

      if (upload.success && upload.url) {
        return upload.url;
      }

      console.error(`[FAL] rehost ${type} failed`, upload.error || upload);
      return url;
    } catch (error) {
      console.error(`[FAL] rehost ${type} failed`, error);
      return url;
    }
  }

  private async normalizeResult(
    rawResult: any,
    taskId: string
  ): Promise<{
    taskInfo: AITaskInfo;
    taskResult: any;
  }> {
    const data = rawResult?.data ?? rawResult ?? {};

    const images: AIImage[] | undefined = Array.isArray(data?.images)
      ? await Promise.all(
          data.images.map(async (item: any, index: number) => {
            const imageUrl =
              typeof item === 'object' ? item.url || item.image || item.src : item;
            const hostedUrl = await this.maybeRehostUrl(
              typeof imageUrl === 'string' ? imageUrl : undefined,
              'image'
            );
            const record: AIImage = {
              id: `${taskId}-${index}`,
              createTime: new Date(),
              imageType:
                typeof item === 'object'
                  ? item.content_type || item.contentType || item.mime_type
                  : undefined,
              imageUrl: hostedUrl,
            };

            if (typeof item === 'object') {
              if (item.url) item.url = hostedUrl;
              if (item.image) item.image = hostedUrl;
              if (item.src) item.src = hostedUrl;
            } else if (typeof data.images[index] === 'string') {
              data.images[index] = hostedUrl;
            }

            return record;
          })
        )
      : undefined;

    const videos = await (async () => {
      const videoItems: any[] = [];

      const addVideo = (item: any) => {
        if (!item) return;
        if (typeof item === 'string') {
          videoItems.push({ videoUrl: item });
          return;
        }
        if (typeof item === 'object') {
          const videoUrl =
            item.url || item.video || item.src || item.video_url || item.videoUrl;
          const videoType =
            item.content_type || item.contentType || item.mime_type || item.type;
          if (videoUrl) {
            videoItems.push({
              videoUrl,
              videoType,
              thumbnailUrl: item.thumbnail || item.thumbnail_url,
            });
          }
        }
      };

      if (data?.video) {
        addVideo(data.video);
      }

      if (Array.isArray(data?.videos)) {
        data.videos.forEach(addVideo);
      }

      if (Array.isArray(data?.output)) {
        data.output.forEach((item: any) => {
          if (typeof item === 'object' && (item.video || item.video_url)) {
            addVideo(item);
          }
          if (typeof item === 'string') {
            addVideo(item);
          }
        });
      }

      return videoItems.length > 0
        ? Promise.all(
            videoItems.map(async (item, index) => {
              const hostedUrl = await this.maybeRehostUrl(item.videoUrl, 'video');
              if (item.videoUrl !== hostedUrl) {
                item.videoUrl = hostedUrl;
              }
              const thumbnailUrl =
                item.thumbnailUrl && (await this.maybeRehostUrl(item.thumbnailUrl, 'image'));

              const record: AIVideo = {
                id: `${taskId}-video-${index}`,
                createTime: new Date(),
                ...item,
                videoUrl: hostedUrl,
                thumbnailUrl: thumbnailUrl || item.thumbnailUrl,
              };

              return record;
            })
          )
        : undefined;
    })();

    if (data?.video) {
      if (typeof data.video === 'string') {
        data.video = await this.maybeRehostUrl(data.video, 'video');
      } else if (typeof data.video === 'object') {
        data.video.videoUrl = await this.maybeRehostUrl(
          data.video.videoUrl || data.video.url || data.video.video || data.video.src,
          'video'
        );
        if (data.video.url) data.video.url = data.video.videoUrl;
      }
    }

    if (Array.isArray(data?.videos)) {
      data.videos = await Promise.all(
        data.videos.map(async (item: any) => {
          if (typeof item === 'string') {
            return await this.maybeRehostUrl(item, 'video');
          }
          if (typeof item === 'object') {
            const hosted = await this.maybeRehostUrl(
              item.videoUrl || item.url || item.video || item.src,
              'video'
            );
            return {
              ...item,
              videoUrl: hosted,
              url: item.url ? hosted : item.url,
              video: item.video ? hosted : item.video,
              src: item.src ? hosted : item.src,
            };
          }
          return item;
        })
      );
    }

    if (Array.isArray(data?.output)) {
      data.output = await Promise.all(
        data.output.map(async (item: any) => {
          if (typeof item === 'string') {
            const detected = this.detectMediaType(item);
            return await this.maybeRehostUrl(item, detected);
          }
          if (typeof item === 'object') {
            const hostedVideo = await this.maybeRehostUrl(
              item.video || item.video_url || item.videoUrl,
              'video'
            );
            const hostedImage = await this.maybeRehostUrl(
              item.url || item.image || item.src,
              'image'
            );
            return {
              ...item,
              video: item.video ? hostedVideo : item.video,
              video_url: item.video_url ? hostedVideo : item.video_url,
              videoUrl: item.videoUrl ? hostedVideo : item.videoUrl,
              url: item.url ? hostedImage : item.url,
              image: item.image ? hostedImage : item.image,
              src: item.src ? hostedImage : item.src,
            };
          }
          return item;
        })
      );
    }

    if (data && typeof data === 'object') {
      if (!data.request_id && !data.requestId) {
        (data as Record<string, any>).request_id = taskId;
      }
    }

    return {
      taskInfo: {
        images,
        videos,
        status: data?.status || 'success',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }

  private mapQueueStatus(status?: FalQueueStatus): AITaskStatus {
    const normalized = status?.toUpperCase();
    switch (normalized) {
      case 'COMPLETED':
        return AITaskStatus.SUCCESS;
      case 'IN_PROGRESS':
        return AITaskStatus.PROCESSING;
      case 'FAILED':
        return AITaskStatus.FAILED;
      case 'CANCELED':
        return AITaskStatus.CANCELED;
      case 'IN_QUEUE':
      default:
        return AITaskStatus.PENDING;
    }
  }

  private isBlockedError(errorText?: string, logs?: any): boolean {
    const text =
      `${errorText || ''} ${Array.isArray(logs) ? logs.join(' ') : logs || ''}`.toLowerCase();
    if (!text.trim()) return false;
    // 只检测真正的内容审核关键词，422 是输入验证错误不应归类为 NSFW
    return (
      text.includes('nsfw') ||
      text.includes('safety') ||
      text.includes('inappropriate') ||
      text.includes('moderation')
    );
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, options, callbackUrl, async: isAsync } = params;

    if (mediaType === AIMediaType.IMAGE && !prompt) {
      throw new Error('prompt is required');
    }

    if (mediaType !== AIMediaType.IMAGE && mediaType !== AIMediaType.VIDEO) {
      throw new Error(`mediaType not supported: ${mediaType}`);
    }

    const endpointId = this.resolveModel(mediaType, model, options as Record<string, unknown>);

    if (
      mediaType === AIMediaType.VIDEO &&
      endpointId.includes('image-to-video')
    ) {
      if (!options?.image_url && !options?.imageUrl && !options?.image) {
        throw new Error('image_url is required for image-to-video');
      }
    }

    if (mediaType === AIMediaType.VIDEO && endpointId.includes('text-to-video') && !prompt) {
      throw new Error('prompt is required for text-to-video');
    }

    // fal.ai 对 prompt 长度有限制，超长会返回 422，这里做截断保护
    const MAX_PROMPT_LENGTH = 2000;
    const safePrompt = prompt && prompt.length > MAX_PROMPT_LENGTH ? prompt.slice(0, MAX_PROMPT_LENGTH) : prompt;

    const payload: Record<string, unknown> = {
      ...(safePrompt ? { prompt: safePrompt } : {}),
      ...(options || {}),
    };

    // distilled 模型帧数范围 17-961（默认 162），兜底 clamp 防止无效值
    if (mediaType === AIMediaType.VIDEO) {
      const MAX_FRAMES = 961;
      const MIN_FRAMES = 17;
      const numFrames = Number(payload.num_frames);
      if (numFrames > MAX_FRAMES) {
        console.warn(`[FAL] num_frames=${numFrames} 超出上限 ${MAX_FRAMES}，截断`);
        payload.num_frames = MAX_FRAMES;
      } else if (numFrames > 0 && numFrames < MIN_FRAMES) {
        console.warn(`[FAL] num_frames=${numFrames} 低于最小值 ${MIN_FRAMES}，调整`);
        payload.num_frames = MIN_FRAMES;
      }
    }

    if (mediaType === AIMediaType.VIDEO && payload.acceleration === undefined) {
      payload.acceleration = 'regular';
    }

    this.configureClient();

    if (isAsync) {
      const enqueued = await fal.queue.submit(endpointId, {
        input: payload,
        webhookUrl: callbackUrl,
        ...(SUBMIT_TIMEOUT_MS ? { abortSignal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS) } : {}),
      });

      const taskId =
        (enqueued as any)?.request_id ||
        (enqueued as any)?.requestId ||
        (enqueued as any)?.id ||
        (enqueued as any)?.task_id ||
        nanoid();

      return {
        taskStatus: this.mapQueueStatus(enqueued?.status),
        taskId,
        taskInfo: {
          status: enqueued?.status,
          createTime: new Date(),
          queuePosition:
            typeof (enqueued as any)?.queue_position === 'number'
              ? (enqueued as any)?.queue_position
              : undefined,
          responseUrl: (enqueued as any)?.response_url,
          statusUrl: (enqueued as any)?.status_url,
          cancelUrl: (enqueued as any)?.cancel_url,
        },
        taskResult: enqueued,
      };
    }

    let requestId = nanoid();
    let lastStatus: FalQueueStatus | undefined = 'IN_QUEUE';
    let lastLogs: any[] = [];

    try {
      const submission = await fal.queue.submit(endpointId, {
        input: payload,
        webhookUrl: callbackUrl,
        ...(SUBMIT_TIMEOUT_MS ? { abortSignal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS) } : {}),
      });

      requestId =
        (submission as any)?.request_id ||
        (submission as any)?.requestId ||
        (submission as any)?.id ||
        (submission as any)?.task_id ||
        requestId;
      lastStatus = submission?.status || lastStatus;
    } catch (error: any) {
      // 保留 fal 返回的详细错误信息（如 422 输入验证失败的具体字段）
      const detail = error?.body?.detail || error?.detail || '';
      console.error('[FAL] submit failed', {
        message: error?.message,
        detail,
        status: error?.status,
        name: error?.name,
        cause: error?.cause,
      });
      const detailStr = detail ? ` (${typeof detail === 'string' ? detail : JSON.stringify(detail)})` : '';
      throw new Error(`Fal submit failed: ${error?.message || error}${detailStr}`);
    }

    const controller = new AbortController();

    try {
      await fal.queue.subscribeToStatus(endpointId, {
        requestId,
        logs: true,
        pollInterval: DEFAULT_POLL_INTERVAL_MS,
        ...(QUEUE_TIMEOUT_MS ? { timeout: QUEUE_TIMEOUT_MS } : {}),
        abortSignal: controller.signal,
        onQueueUpdate: (update: any) => {
          lastStatus = update?.status || lastStatus;
          if (Array.isArray(update?.logs) && update.logs.length > 0) {
            lastLogs = update.logs;
          }
          if (update?.status === 'FAILED' || update?.status === 'CANCELED') {
            controller.abort(
              new Error(
                update?.error ||
                  update?.error_message ||
                  'fal task reported failure'
              )
            );
          }
        },
      });

      const result = await fal.queue.result(endpointId, {
        requestId,
      });

      const { taskInfo, taskResult } = await this.normalizeResult(
        result?.data ?? result,
        requestId
      );

      return {
        taskStatus: AITaskStatus.SUCCESS,
        taskId: requestId,
        taskInfo,
        taskResult,
      };
    } catch (error: any) {
      console.error('[FAL] subscribe/result failed', error);

      // 检测是否是服务端500错误（如序列化问题）
      const is500Error =
        error?.message?.includes('500') ||
        error?.message?.includes('not JSON serializable') ||
        error?.message?.includes('Internal server error');

      // 500错误时尝试补偿查询：检查FAL端任务真实状态
      if (is500Error && requestId) {
        console.log('[FAL] 检测到500错误，尝试补偿查询任务状态...', { requestId, endpointId });
        try {
          // 等待一小段时间让FAL端完成处理
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const statusResp = await fal.queue.status(endpointId, {
            requestId,
            logs: true,
          });

          const recoveryStatus = statusResp?.status;
          console.log('[FAL] 补偿查询状态结果:', recoveryStatus);

          // 如果FAL端任务实际完成了，尝试获取结果
          if (recoveryStatus === 'COMPLETED') {
            console.log('[FAL] FAL端任务已完成，尝试获取结果...');
            const result = await fal.queue.result(endpointId, { requestId });
            const { taskInfo, taskResult } = await this.normalizeResult(
              result?.data ?? result,
              requestId
            );
            console.log('[FAL] 补偿查询成功，返回成功结果');
            return {
              taskStatus: AITaskStatus.SUCCESS,
              taskId: requestId,
              taskInfo,
              taskResult,
            };
          }

          // 如果FAL端任务还在处理中，返回处理中状态（而不是失败）
          if (recoveryStatus === 'IN_PROGRESS' || recoveryStatus === 'IN_QUEUE') {
            console.log('[FAL] FAL端任务仍在处理中，返回处理中状态');
            return {
              taskStatus: this.mapQueueStatus(recoveryStatus),
              taskId: requestId,
              taskInfo: {
                status: recoveryStatus,
                createTime: new Date(),
              },
              taskResult: {
                request_id: requestId,
                status: recoveryStatus,
              },
            };
          }

          // 如果FAL端任务已失败，更新lastStatus以便后续正确处理
          if (recoveryStatus === 'FAILED' || recoveryStatus === 'CANCELED') {
            lastStatus = recoveryStatus;
            const statusAny = statusResp as any;
            if (statusAny?.logs) {
              lastLogs = statusAny.logs;
            }
          }
        } catch (recoveryError: any) {
          console.error('[FAL] 补偿查询失败:', recoveryError?.message);
          // 补偿查询失败，继续使用原来的错误处理逻辑
        }
      }

      const blocked = this.isBlockedError(error?.message, lastLogs);
      const fallbackStatus = blocked ? AITaskStatus.FAILED : this.mapQueueStatus(lastStatus);

      return {
        taskStatus: fallbackStatus,
        taskId: requestId,
        taskInfo: {
          status: fallbackStatus === AITaskStatus.FAILED ? 'failed' : lastStatus || 'pending',
          errorMessage: error?.message,
          createTime: new Date(),
        },
        taskResult: {
          request_id: requestId,
          status: fallbackStatus === AITaskStatus.FAILED ? 'failed' : lastStatus || 'pending',
          logs: lastLogs,
          error: error?.message,
        },
      };
    }
  }

  async query({
    taskId,
    model,
  }: {
    taskId: string;
    model?: string;
  }): Promise<AITaskResult> {
    if (!taskId) {
      throw new Error('taskId is required');
    }

    if (!model) {
      throw new Error('model is required to query fal task');
    }

    this.configureClient();

    const statusResp = await fal.queue.status(model, {
      requestId: taskId,
      logs: true,
    });

    const mappedStatus = this.mapQueueStatus(statusResp?.status);
    const statusAny = statusResp as any;
    const statusError = statusAny?.error ?? statusAny?.detail;
    const statusLogs = statusAny?.logs;
    const isBlocked = this.isBlockedError(statusError, statusLogs);
    const queuePosition =
      typeof statusAny?.queue_position === 'number'
        ? statusAny?.queue_position
        : undefined;
    const responseUrl = statusAny?.response_url;
    const statusUrl = statusAny?.status_url;
    const cancelUrl = statusAny?.cancel_url;

    if (statusResp?.status !== 'COMPLETED') {
      const derivedStatus = isBlocked ? AITaskStatus.FAILED : mappedStatus;
      return {
        taskStatus: derivedStatus,
        taskId,
        taskInfo: {
          status: derivedStatus === AITaskStatus.FAILED ? 'failed' : statusResp?.status || 'pending',
          errorMessage: statusError,
          createTime: new Date(),
          queuePosition,
          responseUrl,
          statusUrl,
          cancelUrl,
        },
        taskResult: {
          request_id: taskId,
          status: derivedStatus === AITaskStatus.FAILED ? 'failed' : statusResp?.status || 'pending',
          logs: statusLogs,
          error: statusError,
        },
      };
    }

    const result = await fal.queue.result(model, {
      requestId: taskId,
    });

    const { taskInfo, taskResult } = await this.normalizeResult(
      result?.data ?? result,
      taskId
    );

    return {
      taskStatus: AITaskStatus.SUCCESS,
      taskId,
      taskInfo,
      taskResult,
    };
  }
}
