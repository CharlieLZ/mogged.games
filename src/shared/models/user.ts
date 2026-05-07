import 'server-only';

import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, credit, user, userContextEvent } from '@/config/db/schema';
import { ACTIVATION_SURVEY_EMAIL_SENT_EVENT } from '@/shared/lib/funnel';

import { getDailyClaimStatus } from '../services/daily-claim';
import { Permission, Role } from '../services/rbac';
import { getStorageService } from '../services/storage';
import { getRemainingCredits } from './credit';

export interface UserCredits {
  remainingCredits: number;
  expiresAt: Date | null;
  dailyClaim: {
    claimedToday: boolean;
    creditsAmount: number;
  };
}

export interface UserNotificationPreferences {
  aiTaskCompletionEmailEnabled: boolean;
}

export type User = typeof user.$inferSelect & {
  isAdmin?: boolean;
  credits?: UserCredits;
  roles?: Role[];
  permissions?: Permission[];
  notificationPreferences?: UserNotificationPreferences;
};
export type NewUser = typeof user.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt' | 'email'>>;
export type AdminUserRewardFilter = 'survey-pending-reward';

const ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION =
  'activation survey reply reward';
const ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT =
  'activation_survey_reward_granted';

function getRewardFilterWhere(rewardFilter?: AdminUserRewardFilter) {
  if (rewardFilter !== 'survey-pending-reward') {
    return undefined;
  }

  const rewardDescriptionPrefix = `${ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION}%`;

  return and(
    sql`exists (
      select 1
      from ${userContextEvent} as survey_sent
      where survey_sent.user_id = ${user.id}
        and survey_sent.event_type = ${ACTIVATION_SURVEY_EMAIL_SENT_EVENT}
    )`,
    sql`not exists (
      select 1
      from ${userContextEvent} as reward_granted
      where reward_granted.user_id = ${user.id}
        and reward_granted.event_type = ${ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT}
    )`,
    sql`not exists (
      select 1
      from ${credit} as reward_credit
      where reward_credit.user_id = ${user.id}
        and reward_credit.transaction_type = 'grant'
        and reward_credit.transaction_scene = 'reward'
        and reward_credit.description like ${rewardDescriptionPrefix}
        and reward_credit.deleted_at is null
    )`
  );
}

export async function updateUser(userId: string, updatedUser: UpdateUser) {
  const [result] = await db()
    .update(user)
    .set(updatedUser)
    .where(eq(user.id, userId))
    .returning();

  return result;
}

export async function createUser(newUser: NewUser) {
  const [result] = await db().insert(user).values(newUser).returning();

  return result;
}

export async function findUserById(userId: string) {
  const [result] = await db().select().from(user).where(eq(user.id, userId));

  return result;
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return undefined;
  }

  const [result] = await db()
    .select()
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  return result;
}

export async function getUsers({
  page = 1,
  limit = 30,
  email,
  rewardFilter,
}: {
  email?: string;
  page?: number;
  limit?: number;
  rewardFilter?: AdminUserRewardFilter;
} = {}): Promise<User[]> {
  const result = await db()
    .select()
    .from(user)
    .where(
      and(
        email ? eq(user.email, email) : undefined,
        getRewardFilterWhere(rewardFilter)
      )
    )
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getUsersCount({
  email,
  rewardFilter,
}: {
  email?: string;
  rewardFilter?: AdminUserRewardFilter;
}) {
  const [result] = await db()
    .select({ count: count() })
    .from(user)
    .where(
      and(
        email ? eq(user.email, email) : undefined,
        getRewardFilterWhere(rewardFilter)
      )
    );
  return result?.count || 0;
}

export async function getUserByUserIds(userIds: string[]) {
  const result = await db()
    .select()
    .from(user)
    .where(inArray(user.id, userIds));

  return result;
}

export async function getUserCredits(
  userId: string,
  countryCode?: string | null
) {
  const [remainingCredits, dailyClaim] = await Promise.all([
    getRemainingCredits(userId),
    getDailyClaimStatus(userId, countryCode),
  ]);

  return {
    remainingCredits,
    expiresAt: null,
    dailyClaim,
  };
}

export async function appendUserToResult(result: any) {
  if (!result || !result.length) {
    return result;
  }

  const userIds = result.map((item: any) => item.userId);
  const users = await getUserByUserIds(userIds);

  // Use Map for O(1) lookup instead of O(n) find()
  const userMap = new Map(users.map((u) => [u.id, u]));

  return result.map((item: any) => ({
    ...item,
    user: userMap.get(item.userId),
  }));
}

/**
 * 从 URL 提取 R2 存储 key
 * 例: https://pub-xxx.r2.dev/uploads/123.png → uploads/123.png
 */
function extractR2Key(url: string, publicDomain?: string): string | null {
  if (!url || !publicDomain) return null;
  const domain = publicDomain.replace(/\/$/, '');
  if (!url.startsWith(domain)) return null;
  const key = url.substring(domain.length + 1); // +1 去掉斜杠
  return key || null;
}

/**
 * 从 taskResult JSON 中提取所有可能的文件 URL
 */
function extractUrlsFromTaskResult(taskResult: unknown): string[] {
  if (!taskResult) return [];
  try {
    const data =
      typeof taskResult === 'string' ? JSON.parse(taskResult) : taskResult;
    const urls: string[] = [];
    // 递归提取所有 URL 字符串
    const walk = (obj: unknown) => {
      if (typeof obj === 'string' && obj.startsWith('http')) {
        urls.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(walk);
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(walk);
      }
    };
    walk(data);
    return urls;
  } catch {
    return [];
  }
}

/**
 * 删除用户在 R2 中的所有文件（头像 + AI 任务生成结果）
 * 只删除本站 R2 域名下的文件，外部 URL 忽略
 */
async function cleanupUserFiles(userId: string): Promise<void> {
  try {
    const storageService = await getStorageService();
    const provider = storageService.getProvider('r2');
    if (!provider) return;

    const publicDomain = (provider.configs as any).publicDomain;
    if (!publicDomain) return;

    // 收集所有需要删除的 URL
    const urls: string[] = [];

    // 1. 用户头像
    const [userData] = await db()
      .select({ image: user.image })
      .from(user)
      .where(eq(user.id, userId));
    if (userData?.image) urls.push(userData.image);

    // 2. AI 任务结果中的文件 URL
    const tasks = await db()
      .select({ taskResult: aiTask.taskResult })
      .from(aiTask)
      .where(eq(aiTask.userId, userId));

    for (const task of tasks) {
      urls.push(...extractUrlsFromTaskResult(task.taskResult));
    }

    // 提取 R2 key 并删除
    const keys = urls
      .map((url) => extractR2Key(url, publicDomain))
      .filter((key): key is string => key !== null);

    // 去重
    const uniqueKeys = [...new Set(keys)];

    if (uniqueKeys.length > 0) {
      console.log(
        `[deleteUser] 清理 ${uniqueKeys.length} 个 R2 文件 (userId: ${userId})`
      );
    }

    // 逐个删除，失败不阻断流程
    for (const key of uniqueKeys) {
      try {
        await storageService.deleteFile(key);
      } catch (e) {
        console.error(`[deleteUser] 删除 R2 文件失败: ${key}`, e);
      }
    }
  } catch (error) {
    // 文件清理失败不应阻止用户删除
    console.error('[deleteUser] 清理用户文件失败:', error);
  }
}

export async function deleteUser(userId: string) {
  // 1. 先清理 R2 存储中的文件
  await cleanupUserFiles(userId);

  // 2. 删除数据库记录（级联删除所有关联数据）
  await db().delete(user).where(eq(user.id, userId));
}
