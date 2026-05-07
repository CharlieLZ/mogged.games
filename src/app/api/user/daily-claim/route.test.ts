import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  claimDailyCredits: vi.fn(),
}));

vi.mock('@/shared/lib/api/secure-json-route', () => ({
  createSecurePostRoute: ({
    handler,
  }: {
    handler: (context: {
      request: Request;
      user: { id: string; email: string; name: string };
    }) => Promise<Response>;
  }) => ({
    OPTIONS: vi.fn(),
    POST: (request: Request) =>
      handler({
        request,
        user: {
          id: 'user-1',
          email: 'charlie0simmon@gmail.com',
          name: 'Charlie Simmon',
        },
      }),
  }),
}));

vi.mock('@/shared/services/daily-claim', () => ({
  claimDailyCredits: mocks.claimDailyCredits,
}));

import { POST } from './route';

describe('/api/user/daily-claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.claimDailyCredits.mockResolvedValue({
      alreadyClaimed: false,
      credits: 15,
    });
  });

  it('passes the request country to daily claim policy resolution', async () => {
    mocks.claimDailyCredits.mockResolvedValueOnce({
      alreadyClaimed: false,
      credits: 1,
    });

    const response = await POST(
      new Request('https://example.com/api/user/daily-claim', {
        method: 'POST',
        headers: {
          'cf-ipcountry': 'IN',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.claimDailyCredits).toHaveBeenCalledWith(
      {
        id: 'user-1',
        email: 'charlie0simmon@gmail.com',
        name: 'Charlie Simmon',
      },
      'IN'
    );
    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        success: true,
        credits: 1,
      },
    });
  });

  it('returns conflict when the daily claim has already been used', async () => {
    mocks.claimDailyCredits.mockResolvedValueOnce({
      alreadyClaimed: true,
      credits: 1,
    });

    const response = await POST(
      new Request('https://example.com/api/user/daily-claim', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(409);
  });
});
