import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getUserCredits: vi.fn(),
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

vi.mock('@/shared/models/user', async () => {
  return {
    getUserCredits: mocks.getUserCredits,
  };
});

vi.mock('@/shared/models/credit', () => ({
  getRemainingCredits: vi.fn().mockResolvedValue(88),
}));

import { POST } from './route';

describe('/api/user/get-user-credits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getUserCredits.mockResolvedValue({
      remainingCredits: 88,
      expiresAt: null,
      dailyClaim: {
        claimedToday: true,
        creditsAmount: 15,
      },
    });
  });

  it('returns the current balance and daily claim status together', async () => {
    const response = await POST(
      new Request('https://example.com/api/user/get-user-credits', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: {
        remainingCredits: 88,
        expiresAt: null,
        dailyClaim: {
          claimedToday: true,
          creditsAmount: 15,
        },
      },
    });
    expect(mocks.getUserCredits).toHaveBeenCalledWith('user-1', null);
  });

  it('passes the request country to user credit status resolution', async () => {
    const response = await POST(
      new Request('https://example.com/api/user/get-user-credits', {
        method: 'POST',
        headers: {
          'cf-ipcountry': 'IN',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.getUserCredits).toHaveBeenCalledWith('user-1', 'IN');
  });
});
