import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ZeptoMailProvider } from './zeptomail';

describe('ZeptoMailProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends mail through the ZeptoMail HTTP API without bundling nodemailer', async () => {
    const source = readFileSync(new URL('./zeptomail.ts', import.meta.url), {
      encoding: 'utf8',
    });
    expect(source).not.toContain('nodemailer');

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          request_id: 'request-123',
          data: [
            {
              additional_info: [{ message_id: 'message-123' }],
            },
          ],
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new ZeptoMailProvider({
      apiKey: 'zepto-token',
      defaultFrom: 'mogged <hello@example.com>',
    });

    const result = await provider.sendEmail({
      to: ['alice@example.com', 'Bob <bob@example.com>'],
      cc: 'cc@example.com',
      bcc: ['bcc@example.com'],
      replyTo: 'Support <support@example.com>',
      subject: 'Welcome',
      html: '<p>Hello</p>',
      text: 'Hello',
      attachments: [
        {
          filename: 'note.txt',
          content: Buffer.from('hello attachment'),
          contentType: 'text/plain',
        },
      ],
      headers: {
        'X-ImageEditorAi-Email': 'welcome',
      },
      priority: 'high',
    });

    expect(result).toEqual({
      success: true,
      messageId: 'message-123',
      provider: 'zeptomail',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();

    const [url, init] = call as [RequestInfo | URL, RequestInit];
    expect(url).toBe('https://api.zeptomail.com/v1.1/email');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Zoho-enczapikey zepto-token',
      },
    });

    expect(JSON.parse(String(init.body))).toEqual({
      from: {
        address: 'hello@example.com',
        name: 'mogged',
      },
      to: [
        { email_address: { address: 'alice@example.com' } },
        { email_address: { address: 'bob@example.com', name: 'Bob' } },
      ],
      cc: [{ email_address: { address: 'cc@example.com' } }],
      bcc: [{ email_address: { address: 'bcc@example.com' } }],
      reply_to: [{ address: 'support@example.com', name: 'Support' }],
      subject: 'Welcome',
      htmlbody: '<p>Hello</p>',
      attachments: [
        {
          name: 'note.txt',
          content: Buffer.from('hello attachment').toString('base64'),
          mime_type: 'text/plain',
        },
      ],
      mime_headers: {
        'X-ImageEditorAi-Email': 'welcome',
        'X-Priority': '1',
        Importance: 'high',
      },
    });
  });

  it('omits cross-domain reply-to values that ZeptoMail can reject', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          request_id: 'request-456',
          data: [
            {
              additional_info: [{ message_id: 'message-456' }],
            },
          ],
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new ZeptoMailProvider({
      apiKey: 'zepto-token',
      defaultFrom: 'mogged <hello@example.com>',
    });

    await provider.sendEmail({
      to: 'admin@example.com',
      replyTo: 'Casey <casey@gmail.com>',
      subject: 'Contact request',
      text: 'Please reply to the user email in the message body.',
    });

    const [, init] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit,
    ];
    const payload = JSON.parse(String(init.body));

    expect(payload.reply_to).toBeUndefined();
  });
});
