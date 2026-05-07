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

describe('/api/storage/upload-media contract', () => {
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
      url: 'https://cdn.example.com/uploads/clip.mp4',
      key: 'uploads/clip.mp4',
    });
    mocks.getStorageService.mockResolvedValue({
      uploadFile: mocks.uploadFile,
    });
  });

  it('rejects unsupported media types', async () => {
    const formData = new FormData();
    formData.append(
      'files',
      new File([Buffer.from('hello')], 'note.txt', {
        type: 'text/plain',
      })
    );

    const response = await POST(
      new Request('https://example.com/api/storage/upload-media', {
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
      message: 'File note.txt is not an allowed media type.',
    });
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it('uploads valid media files and returns their public urls', async () => {
    const formData = new FormData();
    formData.append(
      'files',
      new File([Buffer.from('fake-video')], 'clip.mp4', {
        type: 'video/mp4',
      })
    );

    const response = await POST(
      new Request('https://example.com/api/storage/upload-media', {
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
        urls: ['https://cdn.example.com/uploads/clip.mp4'],
        results: [
          {
            url: 'https://cdn.example.com/uploads/clip.mp4',
            key: 'uploads/clip.mp4',
            filename: 'clip.mp4',
          },
        ],
      },
    });
    expect(mocks.uploadFile).toHaveBeenCalledTimes(1);
  });
});
