import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyUploadClaimToken } from '@/shared/lib/storage-upload-claim';

const testGlobals = globalThis as typeof globalThis & {
  __imageeditoraiRateLimitStore?: Map<string, unknown>;
};

const originalAuthSecret = process.env.AUTH_SECRET;
const requestState = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  headers: new Headers(),
  setCookie: vi.fn((name: string, value: string) => {
    requestState.cookieJar.set(name, value);
  }),
}));

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  getUserInfo: vi.fn(),
  getStorageService: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => requestState.headers,
  cookies: async () => ({
    get: (name: string) => {
      const value = requestState.cookieJar.get(name);
      return value ? { value } : undefined;
    },
    set: requestState.setCookie,
  }),
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

describe('/api/storage/presign contract', () => {
  beforeEach(() => {
    vi.resetModules();
    testGlobals.__imageeditoraiRateLimitStore?.clear();
    vi.clearAllMocks();

    process.env.AUTH_SECRET = 'test-auth-secret';
    requestState.cookieJar = new Map();
    requestState.headers = new Headers({
      'accept-language': 'en-US,en;q=0.9',
      'cf-connecting-ip': '203.0.113.9',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36',
    });
    mocks.enforceApiWriteSecurity.mockResolvedValue(null);
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
    });
    mocks.getStorageService.mockResolvedValue({
      createSignedUploadRequest: vi.fn().mockResolvedValue({
        key: 'uploads/image/123-horse-photo.png',
        uploadUrl: 'https://storage.example.com/upload',
        uploadHeaders: {
          'x-upload-token': 'upload-1',
        },
      }),
    });
  });

  async function callPost(request: Request) {
    const { POST } = await import('./route');
    return POST(request);
  }

  afterAll(() => {
    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it('rejects unsupported upload mime types', async () => {
    const response = await callPost(
      new Request('https://example.com/api/storage/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          fileName: 'horse.svg',
          mimeType: 'image/svg+xml',
          fileSize: 1024,
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: -1,
      message: 'File type not supported',
    });
    expect(mocks.getStorageService).not.toHaveBeenCalled();
  });

  it('returns a signed upload envelope and verification token for valid files', async () => {
    const response = await callPost(
      new Request('https://example.com/api/storage/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          fileName: 'horse photo.png',
          mimeType: 'image/png',
          fileSize: 2048,
        }),
      })
    );
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        key: 'uploads/image/123-horse-photo.png',
        fileName: 'horse-photo.png',
        uploadUrl: 'https://storage.example.com/upload',
        uploadHeaders: {
          'x-upload-token': 'upload-1',
        },
        expected: {
          mimeType: 'image/png',
          fileSize: 2048,
        },
      },
    });

    const claim = verifyUploadClaimToken(payload.data.verifyToken);
    expect(claim).toMatchObject({
      uid: 'user-1',
      key: 'uploads/image/123-horse-photo.png',
      mime: 'image/png',
      size: 2048,
      fileName: 'horse-photo.png',
    });
  });

  it('rejects anonymous viewers on the account signed upload route', async () => {
    mocks.getUserInfo.mockResolvedValue(null);

    const response = await callPost(
      new Request('https://example.com/api/storage/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          fileName: 'guest-reference.png',
          mimeType: 'image/png',
          fileSize: 2048,
        }),
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'Unauthorized',
    });
    expect(mocks.getStorageService).not.toHaveBeenCalled();
  });
});
