import { getAdminNotificationRecipients } from '@/shared/lib/admin-notification';
import type { AdminReportFrequency } from '@/shared/lib/admin-report-period';
import {
  normalizeAdminReportTimezone,
  resolvePreviousCompleteAdminReportWindow,
} from '@/shared/lib/admin-report-period';
import {
  claimAdminReportDelivery,
  markAdminReportDeliveryFailed,
  markAdminReportDeliveryProcessed,
} from '@/shared/models/admin-report-delivery';
import { sendAdminReportDigestEmail } from '@/shared/services/admin-report-email';
import { getAdminReportEmailSummary } from '@/shared/services/admin-report-summary';

export class AdminReportConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminReportConfigurationError';
  }
}

export type AdminReportDispatchResult = {
  status:
    | 'dry_run'
    | 'sent'
    | 'already_processed'
    | 'already_processing'
    | 'failed';
  frequency: AdminReportFrequency;
  periodKey: string;
  timezone: string;
  deliveryRecordId: string | null;
  recipients: string[];
  errorMessage?: string | null;
};

export async function dispatchAdminReportDigest({
  frequency,
  now = new Date(),
  timezone = process.env.ADMIN_REPORT_TIMEZONE,
  dryRun = false,
}: {
  frequency: AdminReportFrequency;
  now?: Date;
  timezone?: string;
  dryRun?: boolean;
}): Promise<AdminReportDispatchResult> {
  const normalizedTimezone = normalizeAdminReportTimezone(timezone);
  const window = resolvePreviousCompleteAdminReportWindow({
    frequency,
    now,
    timezone: normalizedTimezone,
  });
  const summary = await getAdminReportEmailSummary({
    window,
  });
  const recipients = getAdminNotificationRecipients();

  if (dryRun) {
    return {
      status: 'dry_run',
      frequency,
      periodKey: window.periodKey,
      timezone: normalizedTimezone,
      deliveryRecordId: null,
      recipients,
    };
  }

  const claimResult = await claimAdminReportDelivery({
    window,
    targetEmail: recipients.join(','),
    now,
  });

  if (claimResult.status === 'already_processed') {
    return {
      status: 'already_processed',
      frequency,
      periodKey: window.periodKey,
      timezone: normalizedTimezone,
      deliveryRecordId: claimResult.record?.id || null,
      recipients,
    };
  }

  if (claimResult.status === 'already_processing') {
    return {
      status: 'already_processing',
      frequency,
      periodKey: window.periodKey,
      timezone: normalizedTimezone,
      deliveryRecordId: claimResult.record?.id || null,
      recipients,
    };
  }

  try {
    if (recipients.length === 0) {
      throw new AdminReportConfigurationError(
        'ADMIN_NOTIFICATION_EMAIL is missing'
      );
    }

    const sendResult = await sendAdminReportDigestEmail({
      recipients,
      summary,
    });

    if (!sendResult.success) {
      throw new Error(
        sendResult.error || `admin report email failed via ${sendResult.provider}`
      );
    }

    await markAdminReportDeliveryProcessed({
      id: claimResult.record.id,
      provider: sendResult.provider,
      messageId: sendResult.messageId,
      summary,
      sentAt: now,
    });

    return {
      status: 'sent',
      frequency,
      periodKey: window.periodKey,
      timezone: normalizedTimezone,
      deliveryRecordId: claimResult.record.id,
      recipients,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await markAdminReportDeliveryFailed({
      id: claimResult.record.id,
      errorMessage: message,
      summary,
      failedAt: now,
    });

    return {
      status: 'failed',
      frequency,
      periodKey: window.periodKey,
      timezone: normalizedTimezone,
      deliveryRecordId: claimResult.record.id,
      recipients,
      errorMessage: message,
    };
  }
}
