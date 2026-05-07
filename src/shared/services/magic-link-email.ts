import {
  getMagicLinkEmailHtml,
  getMagicLinkEmailSubject,
  getMagicLinkEmailText,
} from '@/shared/blocks/email/magic-link';
import { getSupportEmail } from '@/shared/lib/brand';
import { getEmailService } from '@/shared/services/email';

export async function sendMagicLinkEmail(params: {
  email: string;
  magicLinkUrl: string;
  locale?: string | null;
}) {
  const { email, magicLinkUrl, locale } = params;
  const emailService = await getEmailService();

  const result = await emailService.sendEmail({
    to: email,
    subject: getMagicLinkEmailSubject(locale),
    html: getMagicLinkEmailHtml({ magicLinkUrl, locale }),
    text: getMagicLinkEmailText({ magicLinkUrl, locale }),
    replyTo: getSupportEmail(),
    headers: {
      'X-ImageEditorAi-Email': 'magic-link',
    },
  });

  if (!result.success) {
    throw new Error(
      result.error || `magic link email failed via ${result.provider}`
    );
  }
}
