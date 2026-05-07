import { and, asc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';

import { credit, user, userContextEvent } from '@/config/db/schema';
import { db } from '@/core/db';
import {
  ACTIVATION_SURVEY_EMAIL_SENT_EVENT,
  FIRST_SUCCESSFUL_GENERATION_EVENT,
} from '@/shared/lib/funnel';
import { getUuid } from '@/shared/lib/hash';
import { isPostgresDuplicateKeyError } from '@/shared/lib/postgres-error';
import {
  createCredit,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  findCreditByTransactionNo,
  scheduleCreditGrantNotification,
} from '@/shared/models/credit';
import { findUserById } from '@/shared/models/user';
import {
  getLatestUserContextEventByType,
  safeRecordUserContextEvent,
} from '@/shared/models/user_context_event';

export type ActivationSurveyEmailCandidate = {
  id: string;
  email: string;
  name: string;
  locale: string | null;
  countryCode: string | null;
  regionCode: string | null;
  createdAt: Date;
};

export const DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS = 100;
export const ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION =
  'activation survey reply reward';
export const ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT =
  'activation_survey_reward_granted';
export const ACTIVATION_SURVEY_REWARD_NOT_SENT_STATUS = 'survey-not-sent';
export const ACTIVATION_SURVEY_REWARD_PENDING_STATUS =
  'survey-pending-reward';
export const ACTIVATION_SURVEY_REWARD_GRANTED_STATUS = 'reward-granted';

export type ActivationSurveyRewardListStatus =
  | typeof ACTIVATION_SURVEY_REWARD_NOT_SENT_STATUS
  | typeof ACTIVATION_SURVEY_REWARD_PENDING_STATUS
  | typeof ACTIVATION_SURVEY_REWARD_GRANTED_STATUS;

export type ActivationSurveyRewardStatus = {
  surveyEmailSentAt: Date | null;
  rewardGrantedAt: Date | null;
  firstSuccessfulGenerationAt: Date | null;
  canGrant: boolean;
  reason: 'ready' | 'survey-not-sent' | 'already-granted';
  transactionNo: string;
};

export function getActivationSurveyRewardTransactionNo(userId: string) {
  return `activation-survey-reward:${userId}`;
}

function resolveRewardGrantedAt({
  rewardEvent,
  rewardCredit,
}: {
  rewardEvent?: { createdAt?: Date | null } | null;
  rewardCredit?: { createdAt?: Date | null } | null;
}) {
  return rewardEvent?.createdAt || rewardCredit?.createdAt || null;
}

function isDuplicateTransactionNoError(error: unknown) {
  return isPostgresDuplicateKeyError(error);
}

function normalizeOlderThanHours(value?: number) {
  if (!Number.isFinite(value)) {
    return 24;
  }

  return Math.max(0, Math.floor(value as number));
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(500, Math.max(1, Math.floor(value as number)));
}

function normalizeEmail(value?: string) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || undefined;
}

export async function getActivationSurveyEmailCandidates({
  olderThanHours = 24,
  limit = 50,
  email,
}: {
  olderThanHours?: number;
  limit?: number;
  email?: string;
} = {}): Promise<ActivationSurveyEmailCandidate[]> {
  const normalizedOlderThanHours = normalizeOlderThanHours(olderThanHours);
  const normalizedLimit = normalizeLimit(limit);
  const normalizedEmail = normalizeEmail(email);
  const cutoff = new Date(
    Date.now() - normalizedOlderThanHours * 60 * 60 * 1000
  );

  return db()
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale,
      countryCode: user.countryCode,
      regionCode: user.regionCode,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(
      and(
        lte(user.createdAt, cutoff),
        normalizedEmail ? eq(user.email, normalizedEmail) : undefined,
        sql`not exists (
          select 1
          from ${userContextEvent} as first_success
          where first_success.user_id = ${user.id}
            and first_success.event_type = ${FIRST_SUCCESSFUL_GENERATION_EVENT}
        )`,
        sql`not exists (
          select 1
          from ${userContextEvent} as survey_sent
          where survey_sent.user_id = ${user.id}
            and survey_sent.event_type = ${ACTIVATION_SURVEY_EMAIL_SENT_EVENT}
        )`
      )
    )
    .orderBy(asc(user.createdAt))
    .limit(normalizedLimit);
}

export async function getActivationSurveyRewardStatus(
  userId: string
): Promise<ActivationSurveyRewardStatus> {
  const transactionNo = getActivationSurveyRewardTransactionNo(userId);
  const [surveyEmailEvent, rewardEvent, firstSuccessEvent, rewardCredit] =
    await Promise.all([
      getLatestUserContextEventByType(userId, ACTIVATION_SURVEY_EMAIL_SENT_EVENT),
      getLatestUserContextEventByType(
        userId,
        ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT
      ),
      getLatestUserContextEventByType(userId, FIRST_SUCCESSFUL_GENERATION_EVENT),
      findCreditByTransactionNo(transactionNo),
    ]);

  const rewardGrantedAt = resolveRewardGrantedAt({
    rewardEvent,
    rewardCredit,
  });
  const surveyEmailSentAt = surveyEmailEvent?.createdAt || null;
  const firstSuccessfulGenerationAt = firstSuccessEvent?.createdAt || null;
  const canGrant = Boolean(surveyEmailSentAt && !rewardGrantedAt);

  return {
    surveyEmailSentAt,
    rewardGrantedAt,
    firstSuccessfulGenerationAt,
    canGrant,
    reason: rewardGrantedAt
      ? 'already-granted'
      : surveyEmailSentAt
        ? 'ready'
        : 'survey-not-sent',
    transactionNo,
  };
}

export async function getActivationSurveyRewardStatusesByUserIds(
  userIds: string[]
): Promise<Map<string, ActivationSurveyRewardListStatus>> {
  const statuses = new Map<string, ActivationSurveyRewardListStatus>();

  if (userIds.length === 0) {
    return statuses;
  }

  const transactionNos = userIds.map((userId) =>
    getActivationSurveyRewardTransactionNo(userId)
  );

  const [surveySentRows, rewardEventRows, rewardCreditRows] = await Promise.all([
    db()
      .select({
        userId: userContextEvent.userId,
      })
      .from(userContextEvent)
      .where(
        and(
          inArray(userContextEvent.userId, userIds),
          eq(userContextEvent.eventType, ACTIVATION_SURVEY_EMAIL_SENT_EVENT)
        )
      ),
    db()
      .select({
        userId: userContextEvent.userId,
      })
      .from(userContextEvent)
      .where(
        and(
          inArray(userContextEvent.userId, userIds),
          eq(
            userContextEvent.eventType,
            ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT
          )
        )
      ),
    db()
      .select({
        userId: credit.userId,
      })
      .from(credit)
      .where(
        and(
          inArray(credit.transactionNo, transactionNos),
          isNull(credit.deletedAt)
        )
      ),
  ]);

  const surveySentUserIds = new Set(surveySentRows.map((item) => item.userId));
  const rewardGrantedUserIds = new Set(rewardEventRows.map((item) => item.userId));

  rewardCreditRows.forEach((item) => {
    if (item.userId) {
      rewardGrantedUserIds.add(item.userId);
    }
  });

  userIds.forEach((userId) => {
    if (rewardGrantedUserIds.has(userId)) {
      statuses.set(userId, ACTIVATION_SURVEY_REWARD_GRANTED_STATUS);
      return;
    }

    if (surveySentUserIds.has(userId)) {
      statuses.set(userId, ACTIVATION_SURVEY_REWARD_PENDING_STATUS);
      return;
    }

    statuses.set(userId, ACTIVATION_SURVEY_REWARD_NOT_SENT_STATUS);
  });

  return statuses;
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
}) {
  const transactionNo = getActivationSurveyRewardTransactionNo(userId);
  const userRecord = await findUserById(userId);

  if (!userRecord) {
    return {
      status: 'user-not-found' as const,
      transactionNo,
      credits,
    };
  }

  const rewardStatus = await getActivationSurveyRewardStatus(userId);

  if (!rewardStatus.surveyEmailSentAt) {
    return {
      status: 'survey-not-sent' as const,
      transactionNo,
      credits,
    };
  }

  if (rewardStatus.rewardGrantedAt) {
    return {
      status: 'already-granted' as const,
      transactionNo,
      credits,
    };
  }

  const description = note
    ? `${ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION} - ${note}`
    : ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION;

  const newCredit = {
    id: getUuid(),
    userId: userRecord.id,
    userEmail: userRecord.email,
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
      email: userRecord.email,
      name: userRecord.name,
      source: 'activation_survey_reward',
      context: {
        locale: userRecord.locale || undefined,
        countryCode: userRecord.countryCode || undefined,
        regionCode: userRecord.regionCode || undefined,
      },
    });

    await safeRecordUserContextEvent({
      userId: userRecord.id,
      eventType: ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT,
      locale: userRecord.locale,
      countryCode: userRecord.countryCode,
      regionCode: userRecord.regionCode,
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
      status: 'granted' as const,
      transactionNo,
      credits,
    };
  } catch (error) {
    if (isDuplicateTransactionNoError(error)) {
      return {
        status: 'already-granted' as const,
        transactionNo,
        credits,
      };
    }

    throw error;
  }
}
