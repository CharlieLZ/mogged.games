import type {
  StorageConfigs,
  StorageDeleteResult,
  StorageDownloadUploadOptions,
  StorageObjectMetadata,
  StorageObjectSample,
  StorageProvider,
  StorageSignedUploadRequest,
  StorageUploadOptions,
  StorageUploadResult,
} from '.';

/**
 * R2 storage provider configs
 * @docs https://developers.cloudflare.com/r2/
 */
export interface R2Configs extends StorageConfigs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  publicDomain?: string;
  publicUrlPrefix?: string;
}

/**
 * R2 storage provider implementation
 * @website https://www.cloudflare.com/products/r2/
 */
export class R2Provider implements StorageProvider {
  readonly name = 'r2';
  configs: R2Configs;

  constructor(configs: R2Configs) {
    this.configs = configs;
  }

  private getBucket(bucket?: string) {
    const targetBucket = bucket || this.configs.bucket;
    if (!targetBucket) {
      throw new Error('Bucket is required');
    }

    return targetBucket;
  }

  private getEndpoint() {
    return (
      this.configs.endpoint ||
      `https://${this.configs.accountId}.r2.cloudflarestorage.com`
    );
  }

  private async getAwsClient() {
    const { AwsClient } = await import('aws4fetch');

    return new AwsClient({
      accessKeyId: this.configs.accessKeyId,
      secretAccessKey: this.configs.secretAccessKey,
      region: this.configs.region || 'auto',
    });
  }

  private getObjectUrl(key: string, bucket?: string) {
    return `${this.getEndpoint()}/${this.getBucket(bucket)}/${key}`;
  }

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const uploadBucket = this.getBucket(options.bucket);

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      const url = this.getObjectUrl(options.key, uploadBucket);
      const client = await this.getAwsClient();

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      const request = new Request(url, {
        method: 'PUT',
        headers,
        body: bodyArray as any,
      });

      const response = await client.fetch(request);

      if (!response.ok) {
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`,
          provider: this.name,
        };
      }

      const publicUrl = this.configs.publicDomain
        ? `${this.configs.publicDomain.replace(/\/$/, '')}/${options.key}`
        : this.configs.publicUrlPrefix
          ? `${this.configs.publicUrlPrefix}${encodeURIComponent(options.key)}`
          : url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        key: options.key,
        filename: options.key.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async deleteFile(key: string, bucket?: string): Promise<StorageDeleteResult> {
    try {
      const deleteBucket = this.getBucket(bucket);
      const url = this.getObjectUrl(key, deleteBucket);
      const client = await this.getAwsClient();

      const response = await client.fetch(url, { method: 'DELETE' });

      // R2 DELETE 返回 204 表示成功（文件不存在也返回 204）
      if (response.ok || response.status === 204) {
        return { success: true, provider: this.name };
      }

      return {
        success: false,
        error: `Delete failed: ${response.status} ${response.statusText}`,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
          provider: this.name,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No body in response',
          provider: this.name,
        };
      }

      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const endpoint =
        this.configs.endpoint ||
        `https://${this.configs.accountId}.r2.cloudflarestorage.com`;
      const url = `${endpoint}/${uploadBucket}/${options.key}`;

      const { AwsClient } = await import('aws4fetch');

      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const contentType =
        options.contentType ||
        response.headers.get('content-type') ||
        'application/octet-stream';
      const contentLength = response.headers.get('content-length');

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Disposition': options.disposition || 'inline',
      };

      if (contentLength && Number.isFinite(Number(contentLength))) {
        headers['Content-Length'] = contentLength;
      }

      const uploadResponse = await client.fetch(url, {
        method: 'PUT',
        headers,
        body: response.body as any,
        duplex: 'half',
      } as any);

      if (!uploadResponse.ok) {
        return {
          success: false,
          error: `Upload failed: ${uploadResponse.statusText}`,
          provider: this.name,
        };
      }

      const publicUrl = this.configs.publicDomain
        ? `${this.configs.publicDomain}/${options.key}`
        : url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        key: options.key,
        filename: options.key.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async createSignedUploadRequest(
    options: Omit<StorageUploadOptions, 'body' | 'onProgress'>
  ): Promise<StorageSignedUploadRequest> {
    const client = await this.getAwsClient();
    const signedRequest = await client.sign(this.getObjectUrl(options.key, options.bucket), {
      method: 'PUT',
      headers: {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
      },
      aws: {
        signQuery: true,
      },
    });

    const uploadHeaders: Record<string, string> = {};
    signedRequest.headers.forEach((value, key) => {
      if (!key.toLowerCase().startsWith('x-amz-')) {
        return;
      }
      uploadHeaders[key] = value;
    });

    uploadHeaders['Content-Type'] =
      options.contentType || 'application/octet-stream';
    uploadHeaders['Content-Disposition'] = options.disposition || 'inline';

    return {
      key: options.key,
      uploadUrl: signedRequest.url,
      uploadHeaders,
      provider: this.name,
    };
  }

  async getObjectMetadata(
    key: string,
    bucket?: string
  ): Promise<StorageObjectMetadata> {
    const client = await this.getAwsClient();
    const response = await client.fetch(this.getObjectUrl(key, bucket), {
      method: 'HEAD',
    });

    if (!response.ok) {
      throw new Error(`Inspect failed: ${response.status} ${response.statusText}`);
    }

    return {
      size: Number(response.headers.get('content-length') || 0),
      contentType: response.headers.get('content-type') || undefined,
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined,
    };
  }

  async getObjectSample({
    key,
    bytes,
    bucket,
  }: {
    key: string;
    bytes: number;
    bucket?: string;
  }): Promise<StorageObjectSample> {
    const client = await this.getAwsClient();
    const response = await client.fetch(this.getObjectUrl(key, bucket), {
      method: 'GET',
      headers: {
        Range: `bytes=0-${Math.max(0, bytes - 1)}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Sample failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      sample: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type') || undefined,
    };
  }
}

/**
 * Create R2 provider with configs
 */
export function createR2Provider(configs: R2Configs): R2Provider {
  return new R2Provider(configs);
}
