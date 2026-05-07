import { Buffer } from 'node:buffer';

import type {
  EmailAttachment,
  EmailConfigs,
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '.';

const DEFAULT_ZEPTOMAIL_API_URL = 'https://api.zeptomail.com/v1.1/email';

export interface ZeptoMailConfigs extends EmailConfigs {
  apiKey: string;
  defaultFrom?: string;
  apiUrl?: string;
  host?: string;
  port?: number;
}

type ZeptoMailAddress = {
  address: string;
  name?: string;
};

type ZeptoMailRecipient = {
  email_address: ZeptoMailAddress;
};

type ZeptoMailAttachment = {
  name: string;
  content: string;
  mime_type?: string;
};

type ZeptoMailPayload = {
  from: ZeptoMailAddress;
  to: ZeptoMailRecipient[];
  subject: string;
  htmlbody?: string;
  textbody?: string;
  cc?: ZeptoMailRecipient[];
  bcc?: ZeptoMailRecipient[];
  reply_to?: ZeptoMailAddress[];
  attachments?: ZeptoMailAttachment[];
  mime_headers?: Record<string, string>;
};

type ZeptoMailResponse = {
  request_id?: string;
  data?: Array<{
    additional_info?: Record<string, unknown> | Array<Record<string, unknown>>;
    message?: string;
  }>;
  message?: string;
  error?: {
    message?: string;
    details?: Array<{
      message?: string;
      target?: string;
    }>;
  };
};

function cleanAddressName(value?: string | null) {
  const normalized = value?.trim().replace(/^"|"$/g, '');
  return normalized || undefined;
}

function parseEmailAddress(value: string): ZeptoMailAddress {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:"?([^"<>]*)"?\s*)?<([^<>]+)>$/);

  if (!match) {
    return { address: trimmed };
  }

  const name = cleanAddressName(match[1]);

  return {
    address: match[2].trim(),
    ...(name ? { name } : {}),
  };
}

function toEmailValues(value?: string | string[]) {
  if (!value) {
    return [];
  }

  return (Array.isArray(value) ? value : [value])
    .map((item) => item.trim())
    .filter(Boolean);
}

function toRecipients(value?: string | string[]): ZeptoMailRecipient[] {
  return toEmailValues(value).map((address) => ({
    email_address: parseEmailAddress(address),
  }));
}

function toReplyTo(value?: string | string[]): ZeptoMailAddress[] {
  return toEmailValues(value).map(parseEmailAddress);
}

function getEmailDomain(address?: string) {
  const domain = address?.split('@')[1]?.trim().toLowerCase();

  return domain || '';
}

function toVerifiedDomainReplyTo(
  value: string | string[] | undefined,
  fromAddress: string
) {
  const fromDomain = getEmailDomain(fromAddress);
  if (!fromDomain) {
    return [];
  }

  return toReplyTo(value).filter(
    (replyTo) => getEmailDomain(replyTo.address) === fromDomain
  );
}

function encodeAttachmentContent(attachment: EmailAttachment) {
  if (Buffer.isBuffer(attachment.content)) {
    return attachment.content.toString('base64');
  }

  return Buffer.from(attachment.content).toString('base64');
}

function toAttachments(attachments?: EmailAttachment[]) {
  return attachments?.map((attachment) => ({
    name: attachment.filename,
    content: encodeAttachmentContent(attachment),
    ...(attachment.contentType ? { mime_type: attachment.contentType } : {}),
  }));
}

function getPriorityHeaders(priority?: EmailMessage['priority']) {
  if (priority === 'high') {
    return {
      'X-Priority': '1',
      Importance: 'high',
    };
  }

  if (priority === 'low') {
    return {
      'X-Priority': '5',
      Importance: 'low',
    };
  }

  return {};
}

function mergeMimeHeaders(email: EmailMessage) {
  const headers = {
    ...(email.headers || {}),
  };

  for (const [key, value] of Object.entries(
    getPriorityHeaders(email.priority)
  )) {
    if (!headers[key]) {
      headers[key] = value;
    }
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

function buildZeptoMailPayload(
  email: EmailMessage,
  defaultFrom?: string
): ZeptoMailPayload | { error: string } {
  const fromValue = (email.from || defaultFrom || '').trim();
  const to = toRecipients(email.to);

  if (!fromValue) {
    return { error: 'ZeptoMail from address is missing' };
  }

  if (to.length === 0) {
    return { error: 'ZeptoMail recipient is missing' };
  }

  if (!email.subject?.trim()) {
    return { error: 'ZeptoMail subject is missing' };
  }

  if (!email.html && !email.text) {
    return { error: 'ZeptoMail email body is missing' };
  }

  const payload: ZeptoMailPayload = {
    from: parseEmailAddress(fromValue),
    to,
    subject: email.subject,
  };

  if (email.html) {
    payload.htmlbody = email.html;
  } else if (email.text) {
    payload.textbody = email.text;
  }

  const cc = toRecipients(email.cc);
  if (cc.length > 0) {
    payload.cc = cc;
  }

  const bcc = toRecipients(email.bcc);
  if (bcc.length > 0) {
    payload.bcc = bcc;
  }

  const replyTo = toVerifiedDomainReplyTo(email.replyTo, payload.from.address);
  if (replyTo.length > 0) {
    payload.reply_to = replyTo;
  }

  const attachments = toAttachments(email.attachments);
  if (attachments?.length) {
    payload.attachments = attachments;
  }

  const mimeHeaders = mergeMimeHeaders(email);
  if (mimeHeaders) {
    payload.mime_headers = mimeHeaders;
  }

  return payload;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function getStringRecordValue(
  value: Record<string, unknown> | undefined,
  key: string
) {
  const entry = value?.[key];
  return typeof entry === 'string' && entry.trim() ? entry.trim() : undefined;
}

function extractMessageId(body: ZeptoMailResponse) {
  for (const item of body.data || []) {
    const additionalInfo = Array.isArray(item.additional_info)
      ? item.additional_info
      : [item.additional_info];

    for (const info of additionalInfo) {
      const record = asRecord(info);
      const messageId =
        getStringRecordValue(record, 'message_id') ||
        getStringRecordValue(record, 'messageId');

      if (messageId) {
        return messageId;
      }
    }
  }

  return body.request_id;
}

function extractErrorMessage(body: ZeptoMailResponse, fallback: string) {
  const detailMessages = body.error?.details
    ?.map((detail) =>
      [detail.target, detail.message].filter(Boolean).join(': ')
    )
    .filter(Boolean);

  return (
    detailMessages?.join('; ') ||
    body.error?.message ||
    body.message ||
    fallback
  );
}

async function readZeptoMailResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as ZeptoMailResponse;
  } catch {
    return { message: text } satisfies ZeptoMailResponse;
  }
}

export class ZeptoMailProvider implements EmailProvider {
  readonly name = 'zeptomail';
  configs: ZeptoMailConfigs;

  constructor(configs: ZeptoMailConfigs) {
    this.configs = configs;
  }

  async sendEmail(email: EmailMessage): Promise<EmailSendResult> {
    try {
      const payload = buildZeptoMailPayload(email, this.configs.defaultFrom);

      if ('error' in payload) {
        return {
          success: false,
          error: payload.error,
          provider: this.name,
        };
      }

      const response = await fetch(
        this.configs.apiUrl || DEFAULT_ZEPTOMAIL_API_URL,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Zoho-enczapikey ${this.configs.apiKey}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const responseBody = await readZeptoMailResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: extractErrorMessage(
            responseBody,
            `ZeptoMail API request failed with ${response.status}`
          ),
          provider: this.name,
        };
      }

      return {
        success: true,
        messageId: extractMessageId(responseBody),
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

export function createZeptoMailProvider(
  configs: ZeptoMailConfigs
): ZeptoMailProvider {
  return new ZeptoMailProvider(configs);
}
