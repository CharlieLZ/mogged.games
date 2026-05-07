import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

vi.mock('@/core/auth', () => ({
  getAuth: mocks.getAuth,
}));

describe('getSignUser', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getAuth.mockResolvedValue({
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    });
  });

  it('returns null without constructing auth when the request has no session cookie', async () => {
    const { getSignUser } = await import('./current-user');

    await expect(getSignUser()).resolves.toBeNull();
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });

  it('returns null and logs the auth step when session parsing fails', async () => {
    const error = new SyntaxError('Unexpected end of JSON input');
    const getSession = vi.fn().mockRejectedValue(error);
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    mocks.headers.mockResolvedValue(
      new Headers({
        cookie: 'better-auth.session_token=broken-session',
      })
    );
    mocks.getAuth.mockResolvedValue({
      api: {
        getSession,
      },
    });

    const { getSignUser } = await import('./current-user');

    await expect(getSignUser()).resolves.toBeNull();
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[current-user] get session failed',
      {
        error,
        step: 'auth-get-session',
      }
    );

    consoleErrorSpy.mockRestore();
  });
});
