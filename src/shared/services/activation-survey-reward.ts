import { PostgresError } from 'postgres';

import { getUuid } from '@/shared/lib/hash';
import {
  ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION,
  ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT,
  DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
  getActivationSurveyRewardStatus,
  getActivationSurveyRewardTransactionNo,
  type ActivationSurveyRewardStatus,
} from '@/shared/models/activation-survey';
import {
  createCredit,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  scheduleCreditGrantNotification,
} from '@/shared/models/credit';
import { findUserById } from '@/shared/models/user';
import { safeRecordUserContextEvent } from '@/shared/models/user_context_event';

export {
  ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT,
  DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
  getActivationSurveyRewardStatus,
  getActivationSurveyRewardTransactionNo,
};
export type { ActivationSurveyRewardStatus };

type GrantActivationSurveyRewardResult =
  | {
      status: 'granted';
      transactionNo: string;
      credits: number;
    }
  | {
      status: 'already-granted' | 'survey-not-sent' | 'user-not-found';
      transactionNo: string;
      credits: number;
    };

function isDuplicateTransactionNoError(error: unknown) {
  return (
    error instanceof PostgresError &&
    error.code === '23505'
  );
}

export async function grantActivationSurveyReward({
  userId,
  actorUserId,
  credits = DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
  note,
}: {
  userId: string;
  actorUserId: string;
  credits?: number;
  note?: string;
}): Promise<GrantActivationSurveyRewardResult> {
  const transactionNo = getActivationSurveyRewardTransactionNo(userId);
  const user = await findUserById(userId);

  if (!user) {
    return {
      status: 'user-not-found',
      transactionNo,
      credits,
    };
  }

  const rewardStatus = await getActivationSurveyRewardStatus(userId);

  if (!rewardStatus.surveyEmailSentAt) {
    return {
      status: 'survey-not-sent',
      transactionNo,
      credits,
    };
  }

  if (rewardStatus.rewardGrantedAt) {
    return {
      status: 'already-granted',
      transactionNo,
      credits,
    };
  }

  const description = note
    ? `${ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION} - ${note}`
    : ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION;

  const newCredit = {
    id: getUuid(),
    userId: user.id,
    userEmail: user.email,
    orderNo: '',
    subscriptionNo: '',
    transactionNo,
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.REWARD,
    credits,
    remainingCredits: credits,
    description,
    expiresAt: null,
    status: CreditStatus.ACTIVE,
    metadata: {
      source: 'activation_survey_reward',
      actorUserId,
      note: note || null,
    },
  };

  try {
    const createdCredit = await createCredit(newCredit);

    await scheduleCreditGrantNotification({
      credit: createdCredit,
      email: user.email,
      name: user.name,
      source: 'activation_survey_reward',
      context: {
        locale: user.locale || undefined,
        countryCode: user.countryCode || undefined,
        regionCode: user.regionCode || undefined,
      },
    });

    await safeRecordUserContextEvent({
      userId: user.id,
      eventType: ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT,
      locale: user.locale,
      countryCode: user.countryCode,
      regionCode: user.regionCode,
      metadata: {
        credits,
        actorUserId,
        note: note || null,
        transactionNo,
        grantedAt: new Date().toISOString(),
        rewardSource: 'activation_survey_reward',
      },
    });

    return {
      status: 'granted',
      transactionNo,
      credits,
    };
  } catch (error) {
    if (isDuplicateTransactionNoError(error)) {
      return {
        status: 'already-granted',
        transactionNo,
        credits,
      };
    }

    throw error;
  }
}
