import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  getAllConfigs: vi.fn(),
}));

vi.mock('@/shared/services/email', () => ({
  getEmailService: vi.fn(async () => ({
    sendEmail: mocks.sendEmail,
  })),
}));

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

import { sendWelcomeEmail } from './welcome-email';

describe('sendWelcomeEmail', () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset();
    mocks.getAllConfigs.mockReset();
    mocks.getAllConfigs.mockResolvedValue({
      initial_credits_amount: '45',
    });
    mocks.sendEmail.mockResolvedValue({
      success: true,
      provider: 'test',
    });
  });

  it('uses the runtime initial credits amount in the welcome email copy', async () => {
    await sendWelcomeEmail({
      name: 'Casey',
      email: 'casey@example.com',
    });

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

    const [message] = mocks.sendEmail.mock.calls[0] as [
      {
        subject: string;
        html: string;
        text: string;
      },
    ];

    expect(message.subject).toContain('45 free credits are ready');
    expect(message.html).toContain(
      'Your account already includes 45 free credits'
    );
    expect(message.text).toContain('45 free credits');
    expect(message.html).toContain('mogged runs, browser tools, and task history live in the same flow.');
    expect(message.html).not.toContain('Seedance');
    expect(message.text).not.toContain('Seedance');
  });

  it('prefers the acquisition workflow for the first workflow recommendation', async () => {
    await sendWelcomeEmail({
      name: 'Casey',
      email: 'casey@example.com',
      locale: 'zh',
      acquisitionSnapshot: {
        utm_workflow: 'reference-to-video',
        landing_path: '/ai-video-generator/image-to-video',
      },
    });

    const [message] = mocks.sendEmail.mock.calls[0] as [
      {
        subject: string;
        html: string;
        text: string;
      },
    ];

    expect(message.subject).toContain('欢迎来到');
    expect(message.html).toContain('推荐给你');
    expect(message.html).toContain(
      'https://mogged.games/zh/ai-video-generator?mode=reference-to-video'
    );
    expect(message.text).toContain('推荐给你：reference-to-video');
  });

  it('falls back to the landing path workflow when utm_workflow is absent', async () => {
    await sendWelcomeEmail({
      name: 'Casey',
      email: 'casey@example.com',
      acquisitionSnapshot: {
        landing_path: '/ai-video-generator/image-to-video',
      },
    });

    const [message] = mocks.sendEmail.mock.calls[0] as [
      {
        html: string;
        text: string;
      },
    ];

    expect(message.html).toContain('Recommended for you');
    expect(message.html).toContain(
      'https://mogged.games/ai-video-generator?mode=image-to-video'
    );
    expect(message.text).toContain('Recommended for you: image-to-video');
  });
});
