import 'server-only';

import { and, eq, sql, sum } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { guestDailyQuota } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { withOptionalDbFallback } from '@/shared/lib/optional-db';
import { isPostgresUndefinedTableError } from '@/shared/lib/postgres-error';
import {
  createDefaultGuestQuotaStatus,
  formatGuestQuotaDateKey as formatViewerQuotaDateKey,
  GUEST_DAILY_IP_LIMIT,
  GUEST_DAILY_QUOTA_LIMIT,
  type GuestDailyQuotaStatus,
} from '@/shared/lib/viewer-quota';

export type GuestQuotaIdentity = {
  guestIdHash: string;
  ipHash: string;
  userAgentHash?: string | null;
};

export type { GuestDailyQuotaStatus };
export { createDefaultGuestQuotaStatus };

export class GuestQuotaExceededError extends Error {
  constructor(
    message = 'daily free image generation limit reached',
    readonly reason: 'guest_limit' | 'ip_limit' = 'guest_limit'
  ) {
    super(message);
    this.name = 'GuestQuotaExceededError';
  }
}

type GuestQuotaExecutor = Pick<ReturnType<typeof db>, 'insert' | 'select'>;

export function formatGuestQuotaDateKey(date = new Date()) {
  return formatViewerQuotaDateKey(date);
}

function normalizeGuestQuotaUnits(units: number) {
  if (!Number.isFinite(units) || units <= 0) {
    throw new Error('guest quota units must be a positive number');
  }

  return Math.max(1, Math.floor(units));
}

function mapQuotaRow(row: typeof guestDailyQuota.$inferSelect) {
  const used = row.usedCount || 0;
  const reserved = row.reservedCount || 0;
  const limit = row.limitCount || GUEST_DAILY_QUOTA_LIMIT;

  return {
    dateKey: row.dateKey,
    limit,
    used,
    reserved,
    remaining: Math.max(0, limit - used - reserved),
  };
}

async function upsertGuestQuotaRow(
  executor: GuestQuotaExecutor,
  identity: GuestQuotaIdentity,
  dateKey: string
) {
  const now = new Date();

  await executor
    .insert(guestDailyQuota)
    .values({
      id: getUuid(),
      guestIdHash: identity.guestIdHash,
      ipHash: identity.ipHash,
      userAgentHash: identity.userAgentHash || null,
      dateKey,
      usedCount: 0,
      reservedCount: 0,
      limitCount: GUEST_DAILY_QUOTA_LIMIT,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [guestDailyQuota.guestIdHash, guestDailyQuota.dateKey],
      set: {
        ipHash: identity.ipHash,
        userAgentHash: identity.userAgentHash || null,
        limitCount: GUEST_DAILY_QUOTA_LIMIT,
        lastSeenAt: now,
      },
    });
}

async function findGuestQuotaRow(
  executor: GuestQuotaExecutor,
  identity: GuestQuotaIdentity,
  dateKey: string,
  options: {
    forUpdate?: boolean;
  } = {}
) {
  let query = executor
    .select()
    .from(guestDailyQuota)
    .where(
      and(
        eq(guestDailyQuota.guestIdHash, identity.guestIdHash),
        eq(guestDailyQuota.dateKey, dateKey)
      )
    )
    .limit(1);

  if (options.forUpdate) {
    query = query.for('update') as typeof query;
  }

  const [row] = await query;

  return row;
}

export async function getGuestQuotaStatus(
  identity: GuestQuotaIdentity,
  date = new Date()
): Promise<GuestDailyQuotaStatus> {
  if (!envConfigs.database_url) {
    return createDefaultGuestQuotaStatus(date);
  }

  const dateKey = formatGuestQuotaDateKey(date);
  const executor = db();
  let row;

  try {
    row = await withOptionalDbFallback({
      fallback: null,
      operation: async () => findGuestQuotaRow(executor, identity, dateKey),
      scope: 'guest-quota/read-status',
    });
  } catch (error) {
    if (!isPostgresUndefinedTableError(error)) {
      throw error;
    }

    return createDefaultGuestQuotaStatus(date);
  }

  return row ? mapQuotaRow(row) : createDefaultGuestQuotaStatus(date);
}

export async function reserveGuestQuota(
  identity: GuestQuotaIdentity,
  units = 1,
  date = new Date()
) {
  const normalizedUnits = normalizeGuestQuotaUnits(units);
  const dateKey = formatGuestQuotaDateKey(date);

  return db().transaction(async (tx) => {
    await upsertGuestQuotaRow(tx, identity, dateKey);

    const row = await findGuestQuotaRow(tx, identity, dateKey, {
      forUpdate: true,
    });
    if (!row) {
      throw new Error('guest quota row not found for reservation');
    }

    if (row.usedCount + row.reservedCount + normalizedUnits > row.limitCount) {
      throw new GuestQuotaExceededError();
    }

    const [ipUsage] = await tx
      .select({
        total: sum(
          sql`${guestDailyQuota.usedCount} + ${guestDailyQuota.reservedCount}`
        ),
      })
      .from(guestDailyQuota)
      .where(
        and(
          eq(guestDailyQuota.ipHash, identity.ipHash),
          eq(guestDailyQuota.dateKey, dateKey)
        )
      );

    const ipTotal = Number(ipUsage?.total || 0);
    if (ipTotal + normalizedUnits > GUEST_DAILY_IP_LIMIT) {
      throw new GuestQuotaExceededError(
        'daily free image generation limit reached for this network',
        'ip_limit'
      );
    }

    const [updated] = await tx
      .update(guestDailyQuota)
      .set({
        reservedCount: sql`${guestDailyQuota.reservedCount} + ${normalizedUnits}`,
        lastSeenAt: new Date(),
      })
      .where(eq(guestDailyQuota.id, row.id))
      .returning();

    return mapQuotaRow(updated);
  });
}

export async function consumeGuestQuotaReservation(
  identity: GuestQuotaIdentity,
  dateKey: string,
  units = 1
) {
  const normalizedUnits = normalizeGuestQuotaUnits(units);
  const [updated] = await db()
    .update(guestDailyQuota)
    .set({
      reservedCount: sql`greatest(${guestDailyQuota.reservedCount} - ${normalizedUnits}, 0)`,
      usedCount: sql`${guestDailyQuota.usedCount} + ${normalizedUnits}`,
      lastSeenAt: new Date(),
    })
    .where(
      and(
        eq(guestDailyQuota.guestIdHash, identity.guestIdHash),
        eq(guestDailyQuota.dateKey, dateKey)
      )
    )
    .returning();

  return updated ? mapQuotaRow(updated) : null;
}

export async function releaseGuestQuotaReservation(
  identity: GuestQuotaIdentity,
  dateKey: string,
  units = 1
) {
  const normalizedUnits = normalizeGuestQuotaUnits(units);
  const [updated] = await db()
    .update(guestDailyQuota)
    .set({
      reservedCount: sql`greatest(${guestDailyQuota.reservedCount} - ${normalizedUnits}, 0)`,
      lastSeenAt: new Date(),
    })
    .where(
      and(
        eq(guestDailyQuota.guestIdHash, identity.guestIdHash),
        eq(guestDailyQuota.dateKey, dateKey)
      )
    )
    .returning();

  return updated ? mapQuotaRow(updated) : null;
}
