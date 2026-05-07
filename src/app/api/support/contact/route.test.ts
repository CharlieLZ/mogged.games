import { describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  sendSupportContactMessage: vi.fn(),
}));

vi.mock('@/shared/lib/api/secure-json-route', () => ({
  createSecureJsonPostRoute: ({
    schema,
    parseErrorMessage,
    handler,
  }: {
    schema: {
      safeParse: (value: unknown) => {
        success: boolean;
        data?: unknown;
      };
    };
    parseErrorMessage: string;
    handler: (context: {
      request: Request;
      user: { id: string; email: string; name: string };
      body: { message: string; requestId: string };
    }) => Promise<Response>;
  }) => ({
    OPTIONS: vi.fn(),
    POST: async (request: Request) => {
      const rawBody = await request.json();
      const parsed = schema.safeParse(rawBody);

      if (!parsed.success) {
        return Response.json(
          {
            code: -1,
            message: parseErrorMessage,
          },
          { status: 400 }
        );
      }

      return handler({
        request,
        user: {
          id: 'user-1',
          email: 'casey@example.com',
          name: 'Casey',
        },
        body: parsed.data as { message: string; requestId: string },
      });
    },
  }),
}));

vi.mock('@/shared/services/support-contact', () => ({
  sendSupportContactMessage: mocks.sendSupportContactMessage,
}));

describe('/api/support/contact', () => {
  it('rejects empty or too-short messages before sending email', async () => {
    const response = await POST(
      new Request('https://example.com/api/support/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: 'request-1',
          message: 'hi',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.sendSupportContactMessage).not.toHaveBeenCalled();
  });

  it('sends the signed-in user contact request through the support service', async () => {
    mocks.sendSupportContactMessage.mockResolvedValue({
      accepted: true,
      provider: 'zeptomail',
      messageId: 'msg-1',
      duplicate: false,
    });

    const response = await POST(
      new Request('https://example.com/api/support/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: 'request-1',
          message: 'Please contact me about enterprise seats.',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.sendSupportContactMessage).toHaveBeenCalledWith({
      user: {
        id: 'user-1',
        email: 'casey@example.com',
        name: 'Casey',
      },
      message: 'Please contact me about enterprise seats.',
      requestId: 'request-1',
    });
    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        accepted: true,
        provider: 'zeptomail',
      },
    });
  });
});
