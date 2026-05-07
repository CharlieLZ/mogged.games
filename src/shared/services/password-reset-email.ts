import {
  getPasswordResetEmailHtml,
  getPasswordResetEmailSubject,
  getPasswordResetEmailText,
} from '@/shared/blocks/email/password-reset';
import { getEmailService } from '@/shared/services/email';

export async function sendPasswordResetEmail(params: {
  email: string;
  name?: string | null;
  resetUrl: string;
  locale?: string | null;
}) {
  const { email, name, resetUrl, locale } = params;
  const emailService = await getEmailService();

  const result = await emailService.sendEmail({
    to: email,
    subject: getPasswordResetEmailSubject(locale),
    html: getPasswordResetEmailHtml({ name, resetUrl, locale }),
    text: getPasswordResetEmailText({ name, resetUrl, locale }),
  });

  if (!result.success) {
    throw new Error(
      result.error || `password reset email failed via ${result.provider}`
    );
  }
}
