import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSupportEmail } from '@/shared/lib/brand';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  sendEmailWithProvider: vi.fn(),
}));

vi.mock('@/shared/services/email', () => ({
  getEmailService: vi.fn(async () => ({
    sendEmail: mocks.sendEmail,
    sendEmailWithProvider: mocks.sendEmailWithProvider,
  })),
}));

import { sendActivationSurveyEmail } from './activation-survey-email';

describe('sendActivationSurveyEmail', () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset();
    mocks.sendEmailWithProvider.mockReset();
    mocks.sendEmail.mockResolvedValue({
      success: true,
      provider: 'test',
    });
    mocks.sendEmailWithProvider.mockResolvedValue({
      success: true,
      provider: 'resend',
    });
  });

  it('sends the activation survey with reply-to, tags, and friendly copy', async () => {
    await sendActivationSurveyEmail({
      name: 'Casey',
      email: 'casey@example.com',
      locale: 'en',
    });

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

    const [message] = mocks.sendEmail.mock.calls[0] as [
      {
        subject: string;
        html: string;
        text: string;
        replyTo: string;
        tags: string[];
        headers: Record<string, string>;
      },
    ];

    expect(message.subject).toContain('what are you trying to make');
    expect(message.html).toContain('Reply and get 100 credits');
    expect(message.text).toContain('Messy answers count');
    expect(message.replyTo).toBe(getSupportEmail());
    expect(message.tags).toEqual(['activation-survey']);
    expect(message.headers).toMatchObject({
      'X-ImageEditorAi-Email': 'activation-survey',
    });
  });

  it('uses the requested provider when one is specified', async () => {
    await sendActivationSurveyEmail({
      name: 'Casey',
      email: 'casey@example.com',
      locale: 'zh',
      provider: 'resend',
    });

    expect(mocks.sendEmailWithProvider).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmailWithProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('先别让我们瞎猜'),
      }),
      'resend'
    );
  });
});
