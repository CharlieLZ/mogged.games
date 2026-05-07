import 'server-only';

import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { googleAdsPurchaseUpload } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

const DEFAULT_PROCESSING_LEASE_MS = 10 * 60 * 1000;

export const GoogleAdsPurchaseUploadStatus = {
  PROCESSING: 'processing',
  UPLOADED: 'uploaded',
  FAILED: 'failed',
} as const;

export type GoogleAdsPurchaseUploadStatusValue =
  (typeof GoogleAdsPurchaseUploadStatus)[keyof typeof GoogleAdsPurchaseUploadStatus];

export type GoogleAdsPurchaseUploadClaimResult =
  | {
      status: 'claimed';
      record: typeof googleAdsPurchaseUpload.$inferSelect;
    }
  | {
      status: 'already_uploaded';
      record: typeof googleAdsPurchaseUpload.$inferSelect;
    }
  | {
      status: 'already_processing';
      record: typeof googleAdsPurchaseUpload.$inferSelect | null;
    };

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function getProcessingLeaseMs() {
  const parsed = Number.parseInt(
    process.env.GOOGLE_ADS_PURCHASE_UPLOAD_PROCESSING_LEASE_MS || '',
    10
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_PROCESSING_LEASE_MS;
}

async function findByOrderNo(orderNo: string) {
  const [record] = await db()
    .select()
    .from(googleAdsPurchaseUpload)
    .where(eq(googleAdsPurchaseUpload.orderNo, orderNo))
    .limit(1);

  return record || null;
}

export async function claimGoogleAdsPurchaseUpload(input: {
  userId: string;
  orderNo: string;
  conversionActionId?: string | null;
  clickIdentifierType?: string | null;
}): Promise<GoogleAdsPurchaseUploadClaimResult> {
  const now = new Date();
  const leaseCutoff = new Date(now.getTime() - getProcessingLeaseMs());
  const normalizedOrderNo = normalizeText(input.orderNo, 191);

  if (!normalizedOrderNo) {
    return {
      status: 'already_processing',
      record: null,
    };
  }

  const existing = await findByOrderNo(normalizedOrderNo);
  if (existing?.status === GoogleAdsPurchaseUploadStatus.UPLOADED) {
    return {
      status: 'already_uploaded',
      record: existing,
    };
  }

  if (
    existing?.status === GoogleAdsPurchaseUploadStatus.PROCESSING &&
    existing.processingStartedAt &&
    existing.processingStartedAt >= leaseCutoff
  ) {
    return {
      status: 'already_processing',
      record: existing,
    };
  }

  if (!existing) {
    const [created] = await db()
      .insert(googleAdsPurchaseUpload)
      .values({
        id: getUuid(),
        userId: input.userId,
        orderNo: normalizedOrderNo,
        status: GoogleAdsPurchaseUploadStatus.PROCESSING,
        attemptCount: 1,
        conversionActionId: normalizeText(input.conversionActionId, 191),
        clickIdentifierType: normalizeText(input.clickIdentifierType, 32),
        processingStartedAt: now,
        uploadedAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();

    if (created) {
      return {
        status: 'claimed',
        record: created,
      };
    }
  }

  const [claimed] = await db()
    .update(googleAdsPurchaseUpload)
    .set({
      userId: input.userId,
      status: GoogleAdsPurchaseUploadStatus.PROCESSING,
      attemptCount: sql`${googleAdsPurchaseUpload.attemptCount} + 1`,
      conversionActionId: normalizeText(input.conversionActionId, 191),
      clickIdentifierType: normalizeText(input.clickIdentifierType, 32),
      processingStartedAt: now,
      uploadedAt: null,
      lastError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(googleAdsPurchaseUpload.orderNo, normalizedOrderNo),
        eq(googleAdsPurchaseUpload.status, GoogleAdsPurchaseUploadStatus.FAILED),
        or(
          isNull(googleAdsPurchaseUpload.processingStartedAt),
          lt(googleAdsPurchaseUpload.processingStartedAt, leaseCutoff)
        )
      )
    )
    .returning();

  if (claimed) {
    return {
      status: 'claimed',
      record: claimed,
    };
  }

  const [reclaimed] = await db()
    .update(googleAdsPurchaseUpload)
    .set({
      userId: input.userId,
      status: GoogleAdsPurchaseUploadStatus.PROCESSING,
      attemptCount: sql`${googleAdsPurchaseUpload.attemptCount} + 1`,
      conversionActionId: normalizeText(input.conversionActionId, 191),
      clickIdentifierType: normalizeText(input.clickIdentifierType, 32),
      processingStartedAt: now,
      lastError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(googleAdsPurchaseUpload.orderNo, normalizedOrderNo),
        eq(
          googleAdsPurchaseUpload.status,
          GoogleAdsPurchaseUploadStatus.PROCESSING
        ),
        or(
          isNull(googleAdsPurchaseUpload.processingStartedAt),
          lt(googleAdsPurchaseUpload.processingStartedAt, leaseCutoff)
        )
      )
    )
    .returning();

  if (reclaimed) {
    return {
      status: 'claimed',
      record: reclaimed,
    };
  }

  const latest = await findByOrderNo(normalizedOrderNo);
  if (latest?.status === GoogleAdsPurchaseUploadStatus.UPLOADED) {
    return {
      status: 'already_uploaded',
      record: latest,
    };
  }

  return {
    status: 'already_processing',
    record: latest,
  };
}

export async function markGoogleAdsPurchaseUploadUploaded(input: {
  orderNo: string;
  jobId?: number | null;
}) {
  const normalizedOrderNo = normalizeText(input.orderNo, 191);
  if (!normalizedOrderNo) {
    return null;
  }

  const now = new Date();
  const [record] = await db()
    .update(googleAdsPurchaseUpload)
    .set({
      status: GoogleAdsPurchaseUploadStatus.UPLOADED,
      jobId: typeof input.jobId === 'number' ? input.jobId : null,
      uploadedAt: now,
      processingStartedAt: null,
      lastError: null,
      updatedAt: now,
    })
    .where(eq(googleAdsPurchaseUpload.orderNo, normalizedOrderNo))
    .returning();

  return record || null;
}

export async function markGoogleAdsPurchaseUploadFailed(input: {
  orderNo: string;
  errorMessage?: string | null;
}) {
  const normalizedOrderNo = normalizeText(input.orderNo, 191);
  if (!normalizedOrderNo) {
    return null;
  }

  const now = new Date();
  const [record] = await db()
    .update(googleAdsPurchaseUpload)
    .set({
      status: GoogleAdsPurchaseUploadStatus.FAILED,
      processingStartedAt: null,
      lastError: normalizeText(input.errorMessage, 2000),
      updatedAt: now,
    })
    .where(eq(googleAdsPurchaseUpload.orderNo, normalizedOrderNo))
    .returning();

  return record || null;
}
