import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getRequestViewerInfo: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/services/guest-viewer', () => ({
  getRequestViewerInfo: mocks.getRequestViewerInfo,
}));

describe('/api/user/get-viewer-info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestViewerInfo.mockResolvedValue({
      id: 'guest_1',
      name: 'Guest Viewer',
      email: '',
      isGuest: true,
      imageQueueTier: 'guest',
      quotaTotal: 100,
      credits: null,
      guestQuota: {
        remaining: 100,
        used: 0,
        limit: 100,
        dayKey: '2026-05-03',
        resetAt: '2026-05-04T00:00:00.000Z',
      },
    });
  });

  it('returns the resolved viewer payload with conservative no-store caching', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        id: 'guest_1',
        name: 'Guest Viewer',
        email: '',
        isGuest: true,
        imageQueueTier: 'guest',
        quotaTotal: 100,
        credits: null,
        guestQuota: {
          remaining: 100,
          used: 0,
          limit: 100,
          dayKey: '2026-05-03',
          resetAt: '2026-05-04T00:00:00.000Z',
        },
      },
    });
  });

  it('logs the failing step when viewer info resolution throws', async () => {
    const error = new Error('viewer storage unavailable');
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mocks.getRequestViewerInfo.mockRejectedValueOnce(error);

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[user/get-viewer-info] failed',
      {
        error,
        step: 'get-request-viewer-info',
      }
    );

    consoleErrorSpy.mockRestore();
  });
});
