import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createUploadClaimToken } from '@/shared/lib/storage-upload-claim';

import { POST } from './route';

const testGlobals = globalThis as typeof globalThis & {
  __imageeditoraiRateLimitStore?: Map<string, unknown>;
};

const originalAuthSecret = process.env.AUTH_SECRET;

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  getUserInfo: vi.fn(),
  getStorageService: vi.fn(),
  getAllConfigs: vi.fn(),
  deleteFile: vi.fn(),
  getObjectMetadata: vi.fn(),
  getObjectSample: vi.fn(),
}));

vi.mock('@/shared/lib/api/request-security', () => ({
  createApiPreflightResponse: vi.fn(() => new Response(null, { status: 204 })),
  enforceApiWriteSecurity: mocks.enforceApiWriteSecurity,
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/services/storage', () => ({
  getStorageService: mocks.getStorageService,
}));

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

describe('/api/storage/complete contract', () => {
  beforeEach(() => {
    testGlobals.__imageeditoraiRateLimitStore?.clear();
    vi.clearAllMocks();

    process.env.AUTH_SECRET = 'test-auth-secret';
    mocks.enforceApiWriteSecurity.mockResolvedValue(null);
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
    });
    mocks.deleteFile.mockResolvedValue(undefined);
    mocks.getObjectMetadata.mockResolvedValue({
      size: 8,
    });
    mocks.getObjectSample.mockResolvedValue({
      sample: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      contentType: 'image/png',
    });
    mocks.getStorageService.mockResolvedValue({
      deleteFile: mocks.deleteFile,
      getObjectMetadata: mocks.getObjectMetadata,
      getObjectSample: mocks.getObjectSample,
    });
    mocks.getAllConfigs.mockResolvedValue({
      r2_domain: 'https://cdn.example.com',
      s3_domain: '',
      app_url: 'https://mogged.games',
    });
  });

  afterAll(() => {
    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it('rejects invalid or expired verification tokens', async () => {
    const response = await POST(
      new Request('https://example.com/api/storage/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          key: 'uploads/image/test.png',
          verifyToken: 'bad-token',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: -1,
      message: 'Upload verification token is invalid or expired',
    });
    expect(mocks.getStorageService).not.toHaveBeenCalled();
  });

  it('deletes the uploaded object when the sampled file signature does not match the declared type', async () => {
    const { token } = createUploadClaimToken({
      userId: 'user-1',
      key: 'uploads/image/test.png',
      mimeType: 'image/png',
      fileSize: 8,
      fileName: 'test.png',
    });

    mocks.getObjectSample.mockResolvedValue({
      sample: Buffer.from('not-a-png'),
      contentType: 'image/png',
    });

    const response = await POST(
      new Request('https://example.com/api/storage/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          key: 'uploads/image/test.png',
          verifyToken: token,
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: -1,
      message: 'Uploaded object content does not match declared type',
    });
    expect(mocks.deleteFile).toHaveBeenCalledWith('uploads/image/test.png');
  });

  it('returns the resolved public asset url after a successful verification pass', async () => {
    const { token } = createUploadClaimToken({
      userId: 'user-1',
      key: 'uploads/image/test.png',
      mimeType: 'image/png',
      fileSize: 8,
      fileName: 'test.png',
    });

    const response = await POST(
      new Request('https://example.com/api/storage/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          key: 'uploads/image/test.png',
          verifyToken: token,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        key: 'uploads/image/test.png',
        url: 'https://cdn.example.com/uploads/image/test.png',
        mimeType: 'image/png',
        fileSize: 8,
      },
    });
    expect(mocks.deleteFile).not.toHaveBeenCalled();
  });
});
