const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmailCandidate(value: string) {
  const normalized = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : '';
}

export function parseNotificationRecipients(value?: string | null) {
  if (!value) {
    return [];
  }

  const recipients = value
    .split(/[;,]/)
    .map((item) => normalizeEmailCandidate(item))
    .filter(Boolean);

  return Array.from(new Set(recipients));
}

export function getAdminNotificationRecipients() {
  return parseNotificationRecipients(process.env.ADMIN_NOTIFICATION_EMAIL);
}

export function getContactNotificationRecipients() {
  return parseNotificationRecipients(
    process.env.CONTACT_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL
  );
}

export function toEmailRecipientField(recipients: string[]) {
  return recipients.length <= 1 ? (recipients[0] || '') : recipients;
}
