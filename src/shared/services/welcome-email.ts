import {
  getWelcomeEmailSubject,
  getWelcomeEmailHtml,
  getWelcomeEmailText,
} from '../blocks/email/welcome';
import {
  DEFAULT_VIDEO_GENERATOR_MODE,
  parseVideoGeneratorMode,
  type VideoGeneratorMode,
} from '@/shared/blocks/generator/video-generator-mode';
import { getInitialCreditsAmount } from '@/shared/lib/brand';
import { getAllConfigs } from '@/shared/models/config';
import { getEmailService } from '@/shared/services/email';

type WelcomeEmailAcquisitionContext = {
  utm_workflow?: string | null;
  landing_path?: string | null;
};

function resolveWorkflowFromLandingPath(path?: string | null) {
  if (!path) {
    return null;
  }

  if (path.includes('/reference-to-video')) {
    return 'reference-to-video';
  }

  if (path.includes('/image-to-video')) {
    return 'image-to-video';
  }

  if (path.includes('/text-to-video')) {
    return 'text-to-video';
  }

  return null;
}

export function resolveWelcomeEmailRecommendedWorkflow(
  acquisitionSnapshot?: WelcomeEmailAcquisitionContext
): VideoGeneratorMode {
  return parseVideoGeneratorMode(
    acquisitionSnapshot?.utm_workflow ||
      resolveWorkflowFromLandingPath(acquisitionSnapshot?.landing_path) ||
      undefined,
    DEFAULT_VIDEO_GENERATOR_MODE
  );
}

/**
 * 发送新用户欢迎邮件（通过 Zoho ZeptoMail）
 * 失败不抛异常，仅打印日志
 */
export async function sendWelcomeEmail(params: {
  name?: string;
  email: string;
  locale?: string | null;
  acquisitionSnapshot?: WelcomeEmailAcquisitionContext;
}): Promise<void> {
  const { name, email, locale, acquisitionSnapshot } = params;
  const displayName = name || 'there';
  const recommendedWorkflow =
    resolveWelcomeEmailRecommendedWorkflow(acquisitionSnapshot);

  try {
    const emailService = await getEmailService();
    const configs = await getAllConfigs();
    const initialCreditsAmount = getInitialCreditsAmount(configs);

    const message = {
      to: email,
      subject: getWelcomeEmailSubject(displayName, {
        initialCreditsAmount,
        locale,
        recommendedWorkflow,
      }),
      html: getWelcomeEmailHtml(displayName, {
        initialCreditsAmount,
        locale,
        recommendedWorkflow,
      }),
      text: getWelcomeEmailText(displayName, {
        initialCreditsAmount,
        locale,
        recommendedWorkflow,
      }),
    };

    const result = await emailService.sendEmail(message);

    if (result.success) {
      console.log(`welcome email sent to ${email} via ${result.provider}`);
    } else {
      console.error(
        `welcome email failed for ${email}: ${result.error} (provider: ${result.provider})`
      );
    }
  } catch (error) {
    console.error('welcome email error:', {
      email,
      locale,
      recommendedWorkflow,
      error,
    });
  }
}
