/**
 * Storage upload options interface
 */
export interface StorageUploadOptions {
  body: Buffer | Uint8Array;
  key: string;
  contentType?: string;
  bucket?: string;
  onProgress?: (progress: number) => void;
  disposition?: 'inline' | 'attachment';
}

/**
 * Storage download and upload options interface
 */
export interface StorageDownloadUploadOptions {
  url: string;
  key: string;
  bucket?: string;
  contentType?: string;
  disposition?: 'inline' | 'attachment';
}

/**
 * Storage upload result interface
 */
export interface StorageUploadResult {
  success: boolean;
  location?: string;
  bucket?: string;
  key?: string;
  filename?: string;
  url?: string;
  error?: string;
  provider: string;
}

export interface StorageSignedUploadRequest {
  key: string;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
  expiresAt?: string;
  provider: string;
}

export interface StorageObjectMetadata {
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
}

export interface StorageObjectSample {
  sample: Buffer;
  contentType?: string;
}

/**
 * Storage configs interface
 */
export interface StorageConfigs {
  [key: string]: any;
}

/**
 * Storage delete result interface
 */
export interface StorageDeleteResult {
  success: boolean;
  error?: string;
  provider: string;
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
  // provider name
  readonly name: string;

  // provider configs
  configs: StorageConfigs;

  // upload file
  uploadFile(options: StorageUploadOptions): Promise<StorageUploadResult>;

  // download and upload
  downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult>;

  // 删除文件（可选实现）
  deleteFile?(key: string, bucket?: string): Promise<StorageDeleteResult>;

  createSignedUploadRequest?(
    options: Omit<StorageUploadOptions, 'body' | 'onProgress'>
  ): Promise<StorageSignedUploadRequest>;

  getObjectMetadata?(
    key: string,
    bucket?: string
  ): Promise<StorageObjectMetadata>;

  getObjectSample?({
    key,
    bytes,
    bucket,
  }: {
    key: string;
    bytes: number;
    bucket?: string;
  }): Promise<StorageObjectSample>;
}

/**
 * Storage manager to manage all storage providers
 */
export class StorageManager {
  // storage providers
  private providers: StorageProvider[] = [];
  private defaultProvider?: StorageProvider;

  // add storage provider
  addProvider(provider: StorageProvider, isDefault = false) {
    this.providers.push(provider);
    if (isDefault) {
      this.defaultProvider = provider;
    }
  }

  // get provider by name
  getProvider(name: string): StorageProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  // upload file using default provider
  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    // set default provider if not set
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    return this.defaultProvider.uploadFile(options);
  }

  // upload file using specific provider
  async uploadFileWithProvider(
    options: StorageUploadOptions,
    providerName: string
  ): Promise<StorageUploadResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Storage provider '${providerName}' not found`);
    }
    return provider.uploadFile(options);
  }

  // download and upload using default provider
  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    // set default provider if not set
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    return this.defaultProvider.downloadAndUpload(options);
  }

  // download and upload using specific provider
  async downloadAndUploadWithProvider(
    options: StorageDownloadUploadOptions,
    providerName: string
  ): Promise<StorageUploadResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Storage provider '${providerName}' not found`);
    }
    return provider.downloadAndUpload(options);
  }

  // 删除文件
  async deleteFile(key: string, bucket?: string): Promise<StorageDeleteResult> {
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    if (!this.defaultProvider.deleteFile) {
      return { success: false, error: 'Provider does not support delete', provider: this.defaultProvider.name };
    }

    return this.defaultProvider.deleteFile(key, bucket);
  }

  async createSignedUploadRequest(
    options: Omit<StorageUploadOptions, 'body' | 'onProgress'>
  ): Promise<StorageSignedUploadRequest> {
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    if (!this.defaultProvider.createSignedUploadRequest) {
      throw new Error('Provider does not support signed uploads');
    }

    return this.defaultProvider.createSignedUploadRequest(options);
  }

  async getObjectMetadata(
    key: string,
    bucket?: string
  ): Promise<StorageObjectMetadata> {
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    if (!this.defaultProvider.getObjectMetadata) {
      throw new Error('Provider does not support object metadata inspection');
    }

    return this.defaultProvider.getObjectMetadata(key, bucket);
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
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    if (!this.defaultProvider.getObjectSample) {
      throw new Error('Provider does not support object sampling');
    }

    return this.defaultProvider.getObjectSample({ key, bytes, bucket });
  }

  // get all provider names
  getProviderNames(): string[] {
    return this.providers.map((p) => p.name);
  }
}

// Global storage manager instance
export const storageManager = new StorageManager();

// Export all providers
export * from './s3';
export * from './r2';
