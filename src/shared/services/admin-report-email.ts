import type { EmailSendResult } from '@/extensions/email';
import { getEmailService } from '@/shared/services/email';
import { buildAdminReportEmail } from '@/shared/blocks/email/admin-report';
import type { AdminReportEmailSummary } from '@/shared/services/admin-report-summary';

export async function sendAdminReportDigestEmail({
  recipients,
  summary,
}: {
  recipients: string[];
  summary: AdminReportEmailSummary;
}): Promise<EmailSendResult> {
  const message = buildAdminReportEmail({
    to: recipients,
    summary,
  });
  const emailService = await getEmailService();

  return emailService.sendEmail(message);
}
