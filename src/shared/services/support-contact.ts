import type { EmailMessage, EmailSendResult } from '@/extensions/email';
import {
  getContactNotificationRecipients,
  toEmailRecipientField,
} from '@/shared/lib/admin-notification';
import { getAppName, getAppUrl, getSupportEmail } from '@/shared/lib/brand';
import { getEmailService } from '@/shared/services/email';

type SupportContactUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

type BuildSupportContactEmailInput = {
  adminEmail: string | string[];
  appName: string;
  appUrl: string;
  message: string;
  requestId: string;
  user: SupportContactUser;
};

type SendSupportContactMessageInput = {
  message: string;
  requestId: string;
  user: SupportContactUser;
};

type SupportContactSendResult = {
  accepted: true;
  provider: string;
  messageId?: string;
  duplicate: boolean;
};

type CachedSupportContactResult = {
  expiresAt: number;
  result: SupportContactSendResult;
};

const CONTACT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

declare global {
  var __imageeditoraiSupportContactRequests:
    | Map<string, CachedSupportContactResult>
    | undefined;
}

export class SupportContactConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupportContactConfigurationError';
  }
}

export class SupportContactDeliveryError extends Error {
  provider?: string;

  constructor(message: string, provider?: string) {
    super(message);
    this.name = 'SupportContactDeliveryError';
    this.provider = provider;
  }
}

function getSupportContactCache() {
  if (!globalThis.__imageeditoraiSupportContactRequests) {
    globalThis.__imageeditoraiSupportContactRequests = new Map();
  }

  return globalThis.__imageeditoraiSupportContactRequests;
}

function cleanupSupportContactCache(now: number) {
  const cache = getSupportContactCache();

  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function normalizeEmail(value?: string | null) {
  const email = value?.trim().toLowerCase() || '';

  return EMAIL_PATTERN.test(email) ? email : '';
}

function normalizeDisplayName(value?: string | null) {
  return value?.replace(/[\r\n]+/g, ' ').trim() || 'mogged user';
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildMailtoHref(email: string, subject: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

function buildIdempotencyKey(userId: string, requestId: string) {
  return `${userId}:${requestId}`;
}

function getCachedResult(userId: string, requestId: string) {
  const now = Date.now();
  cleanupSupportContactCache(now);

  const cached = getSupportContactCache().get(
    buildIdempotencyKey(userId, requestId)
  );

  if (!cached || cached.expiresAt <= now) {
    return null;
  }

  return {
    ...cached.result,
    provider: 'idempotency-cache',
    duplicate: true,
  } satisfies SupportContactSendResult;
}

function setCachedResult(
  userId: string,
  requestId: string,
  result: SupportContactSendResult
) {
  getSupportContactCache().set(buildIdempotencyKey(userId, requestId), {
    expiresAt: Date.now() + CONTACT_IDEMPOTENCY_TTL_MS,
    result,
  });
}

export function buildSupportContactEmail({
  adminEmail,
  appName,
  appUrl,
  message,
  requestId,
  user,
}: BuildSupportContactEmailInput): EmailMessage {
  const userEmail = normalizeEmail(user.email);
  if (!userEmail) {
    throw new SupportContactConfigurationError(
      'signed-in user email is missing'
    );
  }

  const userName = normalizeDisplayName(user.name);
  const trimmedMessage = message.trim();
  const subject = `[${appName}] Contact request from ${userName}`;
  const replyHref = buildMailtoHref(userEmail, `Re: ${subject}`);
  const text = [
    `New contact request from ${appName}`,
    '',
    `Name: ${userName}`,
    `Email: ${userEmail}`,
    `User ID: ${user.id}`,
    `Request ID: ${requestId}`,
    `Site: ${appUrl}`,
    '',
    'Message:',
    trimmedMessage,
    '',
    `Reply path: use your email client reply button when available, or email ${userEmail} directly.`,
  ].join('\n');
  const escapedMessage = escapeHtml(trimmedMessage).replaceAll('\n', '<br />');

  return {
    to: adminEmail,
    replyTo: userEmail,
    subject,
    text,
    html: [
      `<h1>${escapeHtml(appName)} contact request</h1>`,
      '<dl>',
      `<dt>Name</dt><dd>${escapeHtml(userName)}</dd>`,
      `<dt>Email</dt><dd>${escapeHtml(userEmail)}</dd>`,
      `<dt>User ID</dt><dd>${escapeHtml(user.id)}</dd>`,
      `<dt>Request ID</dt><dd>${escapeHtml(requestId)}</dd>`,
      `<dt>Site</dt><dd>${escapeHtml(appUrl)}</dd>`,
      '</dl>',
      `<p>${escapedMessage}</p>`,
      `<p><a href="${escapeHtml(replyHref)}">Reply to ${escapeHtml(userEmail)}</a></p>`,
    ].join(''),
    priority: 'normal',
    headers: {
      'X-ImageEditorAi-Email': 'support-contact',
      'X-ImageEditorAi-Request-Id': requestId,
      'X-ImageEditorAi-Reply-To-Email': userEmail,
      'X-ImageEditorAi-User-Id': user.id,
    },
  };
}

function ensureSuccessfulEmailResult(result: EmailSendResult) {
  if (!result.success) {
    throw new SupportContactDeliveryError(
      result.error || `support contact email failed via ${result.provider}`,
      result.provider
    );
  }
}

export async function sendSupportContactMessage({
  message,
  requestId,
  user,
}: SendSupportContactMessageInput): Promise<SupportContactSendResult> {
  const cachedResult = getCachedResult(user.id, requestId);
  if (cachedResult) {
    return cachedResult;
  }

  const recipients = getContactNotificationRecipients();
  const fallbackSupportEmail = normalizeEmail(getSupportEmail());
  const resolvedRecipients =
    recipients.length > 0 ? recipients : [fallbackSupportEmail].filter(Boolean);

  if (resolvedRecipients.length === 0) {
    throw new SupportContactConfigurationError(
      'support contact recipient is missing'
    );
  }

  const email = buildSupportContactEmail({
    adminEmail: toEmailRecipientField(resolvedRecipients),
    appName: getAppName(),
    appUrl: getAppUrl(),
    message,
    requestId,
    user,
  });
  const emailService = await getEmailService();
  const sendResult = await emailService.sendEmail(email);

  ensureSuccessfulEmailResult(sendResult);

  const result = {
    accepted: true,
    provider: sendResult.provider,
    messageId: sendResult.messageId,
    duplicate: false,
  } satisfies SupportContactSendResult;

  setCachedResult(user.id, requestId, result);

  return result;
}
