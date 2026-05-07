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
 * S3 storage provider configs
 * @docs https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
 */
export interface S3Configs extends StorageConfigs {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicDomain?: string;
  publicUrlPrefix?: string;
}

/**
 * S3 storage provider implementation
 * @website https://aws.amazon.com/s3/
 */
export class S3Provider implements StorageProvider {
  readonly name = 's3';
  configs: S3Configs;

  constructor(configs: S3Configs) {
    this.configs = configs;
  }

  private getBucket(bucket?: string) {
    const targetBucket = bucket || this.configs.bucket;
    if (!targetBucket) {
      throw new Error('Bucket is required');
    }

    return targetBucket;
  }

  private getObjectUrl(key: string, bucket?: string) {
    return `${this.configs.endpoint}/${this.getBucket(bucket)}/${key}`;
  }

  private async getAwsClient() {
    const { AwsClient } = await import('aws4fetch');

    return new AwsClient({
      accessKeyId: this.configs.accessKeyId,
      secretAccessKey: this.configs.secretAccessKey,
      region: this.configs.region,
    });
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

      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      return this.uploadFile({
        body,
        key: options.key,
        bucket: options.bucket,
        contentType: options.contentType,
        disposition: options.disposition,
      });
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
 * Create S3 provider with configs
 */
export function createS3Provider(configs: S3Configs): S3Provider {
  return new S3Provider(configs);
}
