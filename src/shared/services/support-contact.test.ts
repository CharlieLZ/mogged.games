import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildSupportContactEmail,
  sendSupportContactMessage,
} from './support-contact';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/shared/services/email', () => ({
  getEmailService: vi.fn(async () => ({
    sendEmail: mocks.sendEmail,
  })),
}));

describe('support contact email', () => {
  const originalAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@mogged.games';
    mocks.sendEmail.mockReset();
  });

  afterEach(() => {
    if (originalAdminEmail === undefined) {
      delete process.env.ADMIN_NOTIFICATION_EMAIL;
    } else {
      process.env.ADMIN_NOTIFICATION_EMAIL = originalAdminEmail;
    }
  });

  it('builds an admin notification that can be replied to the signed-in user', () => {
    const email = buildSupportContactEmail({
      adminEmail: 'admin@mogged.games',
      appName: 'mogged',
      appUrl: 'https://mogged.games',
      message: 'I need a team plan for twenty users.',
      requestId: 'request-123',
      user: {
        id: 'user-1',
        email: 'casey@example.com',
        name: 'Casey',
      },
    });

    expect(email.to).toBe('admin@mogged.games');
    expect(email.replyTo).toBe('casey@example.com');
    expect(email.subject).toBe('[mogged] Contact request from Casey');
    expect(email.text).toContain('I need a team plan for twenty users.');
    expect(email.text).toContain('email casey@example.com directly');
    expect(email.html).toContain('mailto:casey@example.com');
    expect(email.headers).toMatchObject({
      'X-ImageEditorAi-Email': 'support-contact',
      'X-ImageEditorAi-Request-Id': 'request-123',
      'X-ImageEditorAi-Reply-To-Email': 'casey@example.com',
      'X-ImageEditorAi-User-Id': 'user-1',
    });
  });

  it('sends one email for the first request id and treats repeated submissions as idempotent', async () => {
    mocks.sendEmail.mockResolvedValue({
      success: true,
      provider: 'zeptomail',
      messageId: 'msg-1',
    });

    const input = {
      message: 'Please contact me about enterprise image editing seats.',
      requestId: 'same-request',
      user: {
        id: 'user-1',
        email: 'casey@example.com',
        name: 'Casey',
      },
    };

    const first = await sendSupportContactMessage(input);
    const second = await sendSupportContactMessage(input);

    expect(first).toMatchObject({
      accepted: true,
      provider: 'zeptomail',
      duplicate: false,
    });
    expect(second).toMatchObject({
      accepted: true,
      provider: 'idempotency-cache',
      duplicate: true,
    });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('falls back to the public support email when contact notification recipients are not configured', async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.CONTACT_NOTIFICATION_EMAIL;
    process.env.NEXT_PUBLIC_EMAIL = 'support@mogged.games';
    mocks.sendEmail.mockResolvedValue({
      success: true,
      provider: 'zeptomail',
      messageId: 'msg-2',
    });

    await sendSupportContactMessage({
      message: 'Please contact me about enterprise access.',
      requestId: 'support-email-fallback',
      user: {
        id: 'user-2',
        email: 'casey@example.com',
        name: 'Casey',
      },
    });

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@mogged.games',
      })
    );
  });

  it('uses the default support address when no notification recipient env is set', async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.CONTACT_NOTIFICATION_EMAIL;
    delete process.env.NEXT_PUBLIC_EMAIL;
    mocks.sendEmail.mockResolvedValue({
      success: true,
      provider: 'zeptomail',
      messageId: 'msg-3',
    });

    await sendSupportContactMessage({
      message: 'Please contact me about billing and team setup.',
      requestId: 'default-support-email',
      user: {
        id: 'user-1',
        email: 'casey@example.com',
        name: 'Casey',
      },
    });

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@mogged.games',
      })
    );
  });
});
