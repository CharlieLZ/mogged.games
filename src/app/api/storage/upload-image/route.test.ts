import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const testGlobals = globalThis as typeof globalThis & {
  __imageeditoraiRateLimitStore?: Map<string, unknown>;
};

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  getUserInfo: vi.fn(),
  getStorageService: vi.fn(),
  uploadFile: vi.fn(),
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

describe('/api/storage/upload-image contract', () => {
  beforeEach(() => {
    testGlobals.__imageeditoraiRateLimitStore?.clear();
    vi.clearAllMocks();

    mocks.enforceApiWriteSecurity.mockResolvedValue(null);
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
    });
    mocks.uploadFile.mockResolvedValue({
      success: true,
      url: 'https://cdn.example.com/uploads/horse.png',
      key: 'uploads/horse.png',
    });
    mocks.getStorageService.mockResolvedValue({
      uploadFile: mocks.uploadFile,
    });
  });

  it('rejects non-image uploads', async () => {
    const formData = new FormData();
    formData.append(
      'files',
      new File([Buffer.from('hello')], 'note.txt', {
        type: 'text/plain',
      })
    );

    const response = await POST(
      new Request('https://example.com/api/storage/upload-image', {
        method: 'POST',
        headers: {
          Origin: 'https://example.com',
          Cookie: 'better-auth.session_token=session-token-value',
        },
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: -1,
      message:
        'File note.txt is not an allowed image type (image/jpeg, image/png, image/webp, image/gif, image/avif)',
    });
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it('uploads valid image files and returns their public urls', async () => {
    const formData = new FormData();
    formData.append(
      'files',
      new File(
        [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        'horse.png',
        {
          type: 'image/png',
        }
      )
    );

    const response = await POST(
      new Request('https://example.com/api/storage/upload-image', {
        method: 'POST',
        headers: {
          Origin: 'https://example.com',
          Cookie: 'better-auth.session_token=session-token-value',
        },
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        urls: ['https://cdn.example.com/uploads/horse.png'],
        results: [
          {
            url: 'https://cdn.example.com/uploads/horse.png',
            key: 'uploads/horse.png',
            filename: 'horse.png',
          },
        ],
      },
    });
    expect(mocks.uploadFile).toHaveBeenCalledTimes(1);
  });
});
