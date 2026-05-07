import 'server-only';

import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { guestAiTask } from '@/config/db/schema';

export enum GuestQuotaTaskStatus {
  RESERVED = 'reserved',
  USED = 'used',
  RELEASED = 'released',
}

export type GuestAITask = typeof guestAiTask.$inferSelect;
export type NewGuestAITask = typeof guestAiTask.$inferInsert;
export type UpdateGuestAITask = Partial<
  Omit<NewGuestAITask, 'id' | 'createdAt' | 'guestIdHash'>
>;

function normalizeGuestAITaskJsonFields<T extends GuestAITask | undefined>(
  task: T
) {
  return task;
}

export async function createGuestAITask(newTask: NewGuestAITask) {
  const [result] = await db().insert(guestAiTask).values(newTask).returning();

  return normalizeGuestAITaskJsonFields(result);
}

export async function findGuestAITaskById(id: string) {
  const [result] = await db()
    .select()
    .from(guestAiTask)
    .where(eq(guestAiTask.id, id));

  return normalizeGuestAITaskJsonFields(result);
}

export async function findGuestAITaskForViewer({
  id,
  guestIdHash,
}: {
  id: string;
  guestIdHash: string;
}) {
  const [result] = await db()
    .select()
    .from(guestAiTask)
    .where(
      and(eq(guestAiTask.id, id), eq(guestAiTask.guestIdHash, guestIdHash))
    );

  return normalizeGuestAITaskJsonFields(result);
}

export async function updateGuestAITaskById(
  id: string,
  updateTask: UpdateGuestAITask
) {
  const [result] = await db()
    .update(guestAiTask)
    .set(updateTask)
    .where(eq(guestAiTask.id, id))
    .returning();

  return normalizeGuestAITaskJsonFields(result);
}

export async function findGuestAITaskByProviderTaskId({
  provider,
  providerTaskId,
}: {
  provider: string;
  providerTaskId: string;
}) {
  const [result] = await db()
    .select()
    .from(guestAiTask)
    .where(
      and(
        eq(guestAiTask.provider, provider),
        eq(guestAiTask.providerTaskId, providerTaskId)
      )
    );

  return normalizeGuestAITaskJsonFields(result);
}

export async function getGuestCreditsConsumedByDate({
  startAt,
  endAt,
}: {
  startAt: Date;
  endAt: Date;
}) {
  const rows = await db()
    .select({
      date: sql<string>`DATE(${guestAiTask.createdAt})`.as('date'),
      total: sql<number>`coalesce(sum(${guestAiTask.quotaUnits}), 0)`.as(
        'total'
      ),
    })
    .from(guestAiTask)
    .where(
      and(
        eq(guestAiTask.quotaStatus, GuestQuotaTaskStatus.USED),
        gte(guestAiTask.createdAt, startAt),
        lt(guestAiTask.createdAt, endAt)
      )
    )
    .groupBy(sql`DATE(${guestAiTask.createdAt})`);

  return rows.map((row) => ({
    date: row.date,
    total: Number(row.total || 0),
  }));
}

export async function getGuestCreditsConsumedTotal({
  startAt,
  endAt,
}: {
  startAt: Date;
  endAt: Date;
}) {
  const [result] = await db()
    .select({
      total: sql<number>`coalesce(sum(${guestAiTask.quotaUnits}), 0)`.as(
        'total'
      ),
    })
    .from(guestAiTask)
    .where(
      and(
        eq(guestAiTask.quotaStatus, GuestQuotaTaskStatus.USED),
        gte(guestAiTask.createdAt, startAt),
        lt(guestAiTask.createdAt, endAt)
      )
    );

  return Number(result?.total || 0);
}

export async function findRecentGuestCostTasks(limit = 10) {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(50, Math.max(1, Math.trunc(limit)))
    : 10;

  return db()
    .select({
      id: guestAiTask.id,
      guestIdHash: guestAiTask.guestIdHash,
      scene: guestAiTask.scene,
      provider: guestAiTask.provider,
      providerTaskId: guestAiTask.providerTaskId,
      quotaUnits: guestAiTask.quotaUnits,
      createdAt: guestAiTask.createdAt,
    })
    .from(guestAiTask)
    .where(eq(guestAiTask.quotaStatus, GuestQuotaTaskStatus.USED))
    .orderBy(desc(guestAiTask.createdAt))
    .limit(normalizedLimit);
}
