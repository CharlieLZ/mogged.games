import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { apikey } from '@/config/db/schema';
import {
  buildApiKeyPrefix,
  buildMaskedApiKeyDisplay,
  hashApiKeySecret,
} from '@/shared/lib/api-key-security';

import { appendUserToResult, User } from './user';

export type Apikey = typeof apikey.$inferSelect & {
  user?: User;
};
export type NewApikey = typeof apikey.$inferInsert;
export type UpdateApikey = Partial<Omit<NewApikey, 'id' | 'createdAt'>>;

export enum ApikeyStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export const createApikey = async (newApikey: NewApikey): Promise<Apikey> => {
  const rawSecret =
    typeof newApikey.key === 'string' ? newApikey.key.trim() : '';
  const keyHash =
    newApikey.keyHash || (rawSecret ? hashApiKeySecret(rawSecret) : '');
  const keyPrefix =
    newApikey.keyPrefix || (rawSecret ? buildApiKeyPrefix(rawSecret) : '');

  if (!keyHash || !keyPrefix) {
    throw new Error('api key secret or hash is required');
  }

  const [result] = await db()
    .insert(apikey)
    .values({
      ...newApikey,
      key: null,
      keyHash,
      keyPrefix,
    })
    .returning();
  return result;
};

export function getApikeyDisplayKey(entry: Pick<Apikey, 'keyPrefix' | 'key'>) {
  const prefix =
    entry.keyPrefix || (entry.key ? buildApiKeyPrefix(entry.key) : null);

  return buildMaskedApiKeyDisplay(prefix);
}

export async function getApikeys({
  getUser,
  userId,
  status,
  page = 1,
  limit = 30,
}: {
  getUser?: boolean;
  userId?: string;
  status?: ApikeyStatus;
  page?: number;
  limit?: number;
}): Promise<Apikey[]> {
  const result = await db()
    .select()
    .from(apikey)
    .where(
      and(
        userId ? eq(apikey.userId, userId) : undefined,
        status ? eq(apikey.status, status) : undefined,
        isNull(apikey.deletedAt)
      )
    )
    .orderBy(desc(apikey.createdAt))
    .offset((page - 1) * limit)
    .limit(limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

export async function getApikeysCount({
  userId,
  status,
}: {
  userId?: string;
  status?: ApikeyStatus;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(apikey)
    .where(
      and(
        userId ? eq(apikey.userId, userId) : undefined,
        status ? eq(apikey.status, status) : undefined,
        isNull(apikey.deletedAt)
      )
    );

  return result?.count || 0;
}

export async function findApikeyById(id: string): Promise<Apikey> {
  const [result] = await db()
    .select()
    .from(apikey)
    .where(and(eq(apikey.id, id), isNull(apikey.deletedAt)));

  return result;
}

export async function findApikeyByKey(key: string): Promise<Apikey> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('api key is required');
  }

  const keyHash = hashApiKeySecret(normalizedKey);
  const [result] = await db()
    .select()
    .from(apikey)
    .where(
      and(
        eq(apikey.keyHash, keyHash),
        eq(apikey.status, ApikeyStatus.ACTIVE),
        isNull(apikey.deletedAt)
      )
    );

  if (result) {
    const [updated] = await db()
      .update(apikey)
      .set({ lastUsedAt: new Date() })
      .where(eq(apikey.id, result.id))
      .returning();

    return updated || result;
  }

  const [legacyResult] = await db()
    .select()
    .from(apikey)
    .where(
      and(
        eq(apikey.key, normalizedKey),
        eq(apikey.status, ApikeyStatus.ACTIVE),
        isNull(apikey.deletedAt)
      )
    );

  if (!legacyResult) {
    return legacyResult;
  }

  const [migrated] = await db()
    .update(apikey)
    .set({
      key: null,
      keyHash,
      keyPrefix: buildApiKeyPrefix(normalizedKey),
      lastUsedAt: new Date(),
    })
    .where(eq(apikey.id, legacyResult.id))
    .returning();

  return migrated || legacyResult;
}

export const updateApikey = async (
  id: string,
  updateApikey: UpdateApikey
): Promise<Apikey> => {
  const [result] = await db()
    .update(apikey)
    .set(updateApikey)
    .where(eq(apikey.id, id))
    .returning();

  return result;
};
