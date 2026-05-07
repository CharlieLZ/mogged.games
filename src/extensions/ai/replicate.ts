import 'server-only';

import Replicate from 'replicate';
import { nanoid } from 'nanoid';

import { envConfigs } from '@/config';
import {
  AIConfigs,
  AIGenerateParams,
  AIImage,
  AIProvider,
  AIVideo,
  AITaskResult,
  AITaskStatus,
} from './types';

/**
 * Replicate configs
 * @docs https://replicate.com/
 */
export interface ReplicateConfigs extends AIConfigs {
  baseUrl?: string;
  apiToken: string;
}

/**
 * Replicate provider
 * @docs https://replicate.com/
 */
export class ReplicateProvider implements AIProvider {
  // provider name
  readonly name = 'replicate';
  // provider configs
  configs: ReplicateConfigs;

  client: Replicate;

  // init provider
  constructor(configs: ReplicateConfigs) {
    this.configs = configs;
    this.client = new Replicate({
      auth: this.configs.apiToken,
    });
  }

  // generate task
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { model, prompt, callbackUrl } = params;

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    // build request params
    let input: any = {
      prompt: params.prompt,
    };

    if (params.options) {
      input = {
        ...input,
        ...params.options,
      };
    }

    const isValidCallbackUrl =
      callbackUrl &&
      callbackUrl.startsWith('http') &&
      !callbackUrl.includes('localhost') &&
      !callbackUrl.includes('127.0.0.1');

    const output = await this.client.predictions.create({
      model,
      input,
      webhook: isValidCallbackUrl ? callbackUrl : undefined,
      webhook_events_filter: isValidCallbackUrl ? ['completed'] : undefined,
    });

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: output.id,
      taskInfo: {},
      taskResult: output,
    };
  }

  // query task
  async query({ taskId }: { taskId: string; model?: string }): Promise<AITaskResult> {
    const data = await this.client.predictions.get(taskId);

    const maybeRehostUrl = async (
      url: string | undefined,
      type: 'image' | 'video'
    ): Promise<string | undefined> => {
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

        console.error(`[Replicate] rehost ${type} failed`, upload.error || upload);
        return url;
      } catch (error) {
        console.error(`[Replicate] rehost ${type} failed`, error);
        return url;
      }
    };

    const detectMediaType = (url: string | undefined): 'video' | 'image' => {
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
    };

    let images: AIImage[] | undefined = undefined;
    let videos: AIVideo[] | undefined = undefined;

    if (data.output) {
      const outputs = Array.isArray(data.output) ? data.output : [data.output];
      const rehosted = await Promise.all(
        outputs.map(async (item: any) => {
          if (typeof item === 'string') {
            const type = detectMediaType(item);
            const hosted = await maybeRehostUrl(item, type);
            return hosted;
          }

          if (typeof item === 'object') {
            const hostedVideo = await maybeRehostUrl(
              item.video || item.video_url || item.videoUrl,
              'video'
            );
            const hostedImage = await maybeRehostUrl(item.url || item.image || item.src, 'image');
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

      data.output = Array.isArray(data.output) ? rehosted : rehosted[0];

      rehosted.forEach((item: any) => {
        if (!item) return;

        if (typeof item === 'string') {
          const type = detectMediaType(item);
          if (type === 'video') {
            videos = videos || [];
            videos.push({
              id: '',
              createTime: new Date(data.created_at),
              videoUrl: item,
            });
          } else {
            images = images || [];
            images.push({
              id: '',
              createTime: new Date(data.created_at),
              imageUrl: item,
            });
          }
          return;
        }

        if (typeof item === 'object') {
          const videoUrl = item.video || item.video_url || item.videoUrl;
          const imageUrl = item.url || item.image || item.src;

          if (videoUrl) {
            videos = videos || [];
            videos.push({
              id: '',
              createTime: new Date(data.created_at),
              videoUrl,
              thumbnailUrl: item.thumbnail || item.thumbnail_url,
            });
          } else if (imageUrl) {
            images = images || [];
            images.push({
              id: '',
              createTime: new Date(data.created_at),
              imageUrl,
              imageType: item.content_type || item.contentType || item.mime_type,
            });
          }
        }
      });
    }

    return {
      taskId,
      taskStatus: this.mapStatus(data.status),
      taskInfo: {
        images,
        videos,
        status: data.status,
        errorCode: '',
        errorMessage: data.error as string,
        createTime: new Date(data.created_at),
      },
      taskResult: data,
    };
  }

  // map status
  private mapStatus(status: string): AITaskStatus {
    switch (status) {
      case 'starting':
        return AITaskStatus.PENDING;
      case 'processing':
        return AITaskStatus.PROCESSING;
      case 'succeeded':
        return AITaskStatus.SUCCESS;
      case 'failed':
        return AITaskStatus.FAILED;
      case 'canceled':
        return AITaskStatus.CANCELED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }
}
