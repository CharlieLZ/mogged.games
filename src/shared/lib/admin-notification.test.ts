import { afterEach, describe, expect, it } from 'vitest';

import {
  getAdminNotificationRecipients,
  getContactNotificationRecipients,
  parseNotificationRecipients,
} from './admin-notification';

describe('admin notification recipients', () => {
  const originalAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const originalContactEmail = process.env.CONTACT_NOTIFICATION_EMAIL;

  afterEach(() => {
    if (originalAdminEmail === undefined) {
      delete process.env.ADMIN_NOTIFICATION_EMAIL;
    } else {
      process.env.ADMIN_NOTIFICATION_EMAIL = originalAdminEmail;
    }

    if (originalContactEmail === undefined) {
      delete process.env.CONTACT_NOTIFICATION_EMAIL;
    } else {
      process.env.CONTACT_NOTIFICATION_EMAIL = originalContactEmail;
    }
  });

  it('parses comma and semicolon separated notification recipients', () => {
    expect(
      parseNotificationRecipients(
        ' Ops@example.com ; finance@example.com, invalid,ops@example.com '
      )
    ).toEqual(['ops@example.com', 'finance@example.com']);
  });

  it('reads admin notification recipients from env', () => {
    process.env.ADMIN_NOTIFICATION_EMAIL =
      'ops@example.com,owner@example.com';

    expect(getAdminNotificationRecipients()).toEqual([
      'ops@example.com',
      'owner@example.com',
    ]);
  });

  it('prefers contact-specific recipients before falling back to admin recipients', () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = 'ops@example.com';
    process.env.CONTACT_NOTIFICATION_EMAIL =
      'support@example.com;care@example.com';

    expect(getContactNotificationRecipients()).toEqual([
      'support@example.com',
      'care@example.com',
    ]);

    delete process.env.CONTACT_NOTIFICATION_EMAIL;

    expect(getContactNotificationRecipients()).toEqual(['ops@example.com']);
  });
});
