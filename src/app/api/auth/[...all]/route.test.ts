import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  handlerGET: vi.fn(),
  handlerPOST: vi.fn(),
}));

vi.mock('better-auth/next-js', () => ({
  toNextJsHandler: () => ({
    GET: mocks.handlerGET,
    POST: mocks.handlerPOST,
  }),
}));

vi.mock('@/core/auth', () => ({
  getAuth: mocks.getAuth,
}));

describe('/api/auth/[...all]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getAuth.mockResolvedValue({
      handler: vi.fn(),
    });
    mocks.handlerGET.mockResolvedValue(Response.json(null));
    mocks.handlerPOST.mockResolvedValue(Response.json({ ok: true }));
  });

  it('returns a JSON 500 instead of leaking handler JSON parse failures through Next', async () => {
    const error = new SyntaxError('Unexpected end of JSON input');
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mocks.handlerGET.mockRejectedValueOnce(error);

    const { GET } = await import('./route');
    const response = await GET(
      new Request('https://mogged.games/api/auth/get-session')
    );

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      code: -1,
      message: 'auth request failed',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[auth] request crashed', {
      error,
      method: 'GET',
      path: '/api/auth/get-session',
      step: 'auth-handler',
    });

    consoleErrorSpy.mockRestore();
  });
});
