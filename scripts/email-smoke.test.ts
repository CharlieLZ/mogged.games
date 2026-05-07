import { describe, expect, it } from 'vitest';

import { buildEmailSmokeMessage, parseEmailSmokeArgs } from './email-smoke';

describe('email smoke script', () => {
  it('parses recipients, provider, and dry-run flags', () => {
    expect(
      parseEmailSmokeArgs([
        '--to=One@example.com,two@example.com',
        '--to=two@example.com',
        '--provider=resend',
        '--dry-run',
      ])
    ).toEqual(
      expect.objectContaining({
        to: ['one@example.com', 'two@example.com'],
        provider: 'resend',
        dryRun: true,
      })
    );
  });

  it('builds a plain html and text smoke message', () => {
    const message = buildEmailSmokeMessage({
      to: ['user@example.com'],
      subject: 'Smoke',
      code: '654321',
    });

    expect(message.to).toEqual(['user@example.com']);
    expect(message.subject).toBe('Smoke');
    expect(message.text).toContain('654321');
    expect(message.html).toContain('654321');
    expect(message.headers).toMatchObject({
      'X-ImageEditorAi-Smoke-Test': 'true',
    });
  });
});
