import { adminReportDelivery } from '@/config/db/schema';
import { db } from '@/core/db';
import { getUuid } from '@/shared/lib/hash';
import type { AdminReportWindow } from '@/shared/lib/admin-report-period';
import {
  and,
  eq,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';

export const AdminReportDeliveryStatus = {
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const;

export type AdminReportDelivery = typeof adminReportDelivery.$inferSelect;

type StoredSummary = Record<string, unknown> | null;

export type ClaimAdminReportDeliveryResult =
  | {
      status: 'claimed';
      record: AdminReportDelivery;
    }
  | {
      status: 'already_processed';
      record: AdminReportDelivery | null;
    }
  | {
      status: 'already_processing';
      record: AdminReportDelivery | null;
    };

const DEFAULT_ADMIN_REPORT_DELIVERY_LEASE_MS = 10 * 60 * 1000;

function getDeliveryLeaseMs() {
  const parsed = Number.parseInt(
    process.env.ADMIN_REPORT_DELIVERY_LEASE_MS || '',
    10
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_ADMIN_REPORT_DELIVERY_LEASE_MS;
}

function serializeSummary(summary?: unknown): StoredSummary {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(summary)) as StoredSummary;
  } catch {
    return {
      serializationError: true,
    };
  }
}

async function findDeliveryByUniqueKey({
  frequency,
  periodKey,
  timezone,
}: {
  frequency: string;
  periodKey: string;
  timezone: string;
}) {
  const [record] = await db()
    .select()
    .from(adminReportDelivery)
    .where(
      and(
        eq(adminReportDelivery.frequency, frequency),
        eq(adminReportDelivery.periodKey, periodKey),
        eq(adminReportDelivery.timezone, timezone)
      )
    )
    .limit(1);

  return record || null;
}

export async function claimAdminReportDelivery({
  window,
  targetEmail,
  now = new Date(),
}: {
  window: AdminReportWindow;
  targetEmail?: string | null;
  now?: Date;
}): Promise<ClaimAdminReportDeliveryResult> {
  const target = targetEmail?.trim() || null;

  const [inserted] = await db()
    .insert(adminReportDelivery)
    .values({
      id: getUuid(),
      frequency: window.frequency,
      periodKey: window.periodKey,
      timezone: window.timezone,
      windowStart: window.startAt,
      windowEnd: window.endAt,
      targetEmail: target,
      status: AdminReportDeliveryStatus.PROCESSING,
      attemptCount: 1,
      claimedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return {
      status: 'claimed',
      record: inserted,
    };
  }

  const existing = await findDeliveryByUniqueKey({
    frequency: window.frequency,
    periodKey: window.periodKey,
    timezone: window.timezone,
  });

  if (existing?.status === AdminReportDeliveryStatus.PROCESSED) {
    return {
      status: 'already_processed',
      record: existing,
    };
  }

  const leaseExpiredAt = new Date(now.getTime() - getDeliveryLeaseMs());
  const [updated] = await db()
    .update(adminReportDelivery)
    .set({
      targetEmail: target,
      status: AdminReportDeliveryStatus.PROCESSING,
      attemptCount: sql`${adminReportDelivery.attemptCount} + 1`,
      claimedAt: now,
      errorMessage: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(adminReportDelivery.frequency, window.frequency),
        eq(adminReportDelivery.periodKey, window.periodKey),
        eq(adminReportDelivery.timezone, window.timezone),
        or(
          ne(
            adminReportDelivery.status,
            AdminReportDeliveryStatus.PROCESSING
          ),
          isNull(adminReportDelivery.claimedAt),
          lt(adminReportDelivery.claimedAt, leaseExpiredAt)
        )
      )
    )
    .returning();

  if (updated) {
    return {
      status: 'claimed',
      record: updated,
    };
  }

  const current = await findDeliveryByUniqueKey({
    frequency: window.frequency,
    periodKey: window.periodKey,
    timezone: window.timezone,
  });

  if (current?.status === AdminReportDeliveryStatus.PROCESSED) {
    return {
      status: 'already_processed',
      record: current,
    };
  }

  return {
    status: 'already_processing',
    record: current,
  };
}

export async function markAdminReportDeliveryProcessed({
  id,
  provider,
  messageId,
  summary,
  sentAt = new Date(),
}: {
  id: string;
  provider?: string | null;
  messageId?: string | null;
  summary?: unknown;
  sentAt?: Date;
}) {
  const [record] = await db()
    .update(adminReportDelivery)
    .set({
      status: AdminReportDeliveryStatus.PROCESSED,
      provider: provider?.trim() || null,
      messageId: messageId?.trim() || null,
      summary: serializeSummary(summary),
      sentAt,
      errorMessage: null,
      updatedAt: sentAt,
    })
    .where(eq(adminReportDelivery.id, id))
    .returning();

  return record || null;
}

export async function markAdminReportDeliveryFailed({
  id,
  errorMessage,
  summary,
  failedAt = new Date(),
}: {
  id: string;
  errorMessage?: string | null;
  summary?: unknown;
  failedAt?: Date;
}) {
  const [record] = await db()
    .update(adminReportDelivery)
    .set({
      status: AdminReportDeliveryStatus.FAILED,
      summary: serializeSummary(summary),
      errorMessage: errorMessage?.trim() || 'admin report delivery failed',
      updatedAt: failedAt,
    })
    .where(eq(adminReportDelivery.id, id))
    .returning();

  return record || null;
}
