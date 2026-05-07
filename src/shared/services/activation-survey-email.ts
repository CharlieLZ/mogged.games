import type { EmailSendResult } from '@/extensions/email';
import {
  DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS,
  getActivationSurveyEmailHtml,
  getActivationSurveyEmailSubject,
  getActivationSurveyEmailText,
} from '@/shared/blocks/email/activation-survey';
import { getSupportEmail } from '@/shared/lib/brand';
import { getEmailService } from '@/shared/services/email';

export async function sendActivationSurveyEmail(params: {
  name?: string;
  email: string;
  locale?: string | null;
  rewardCredits?: number;
  provider?: string;
}): Promise<EmailSendResult> {
  const {
    name,
    email,
    locale,
    rewardCredits = DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS,
    provider,
  } = params;
  const displayName = name || 'there';
  const message = {
    to: email,
    subject: getActivationSurveyEmailSubject(displayName, {
      locale,
      rewardCredits,
    }),
    html: getActivationSurveyEmailHtml(displayName, {
      locale,
      rewardCredits,
    }),
    text: getActivationSurveyEmailText(displayName, {
      locale,
      rewardCredits,
    }),
    replyTo: getSupportEmail(),
    headers: {
      'X-ImageEditorAi-Email': 'activation-survey',
    },
    tags: ['activation-survey'],
  };

  try {
    const emailService = await getEmailService();
    const result = provider
      ? await emailService.sendEmailWithProvider(message, provider)
      : await emailService.sendEmail(message);

    if (result.success) {
      console.log(
        `activation survey email sent to ${email} via ${result.provider}`
      );
    } else {
      console.error(
        `activation survey email failed for ${email}: ${result.error} (provider: ${result.provider})`
      );
    }

    return result;
  } catch (error) {
    console.error('activation survey email error:', {
      email,
      locale,
      provider,
      error,
    });

    return {
      success: false,
      provider: provider || 'unknown',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
