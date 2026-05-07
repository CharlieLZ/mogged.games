import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { userAcquisition } from '@/config/db/schema';
import {
  mergeAdsAttributionSnapshots,
  readAdsAttributionCookieFromHeader,
} from '@/shared/lib/ads-attribution';
import { getAppUrl } from '@/shared/lib/brand';
import { getUuid } from '@/shared/lib/hash';
import type { RequestContextSnapshot } from '@/shared/lib/request-context';

type MaybeString = string | null | undefined;

type AcquisitionMetadata = Record<string, unknown> & {
  acquisitionVersion?: number;
  attributionMode?: string;
  firstTouchSnapshot?: Record<string, unknown>;
  lastTouchSnapshot?: Record<string, unknown>;
};

type StoredUserAcquisitionRecord = typeof userAcquisition.$inferSelect;

export type AcquisitionSnapshot = {
  source?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_batch?: string;
  utm_objective?: string;
  utm_campaign?: string;
  utm_adgroup?: string;
  utm_content?: string;
  utm_term?: string;
  utm_match?: string;
  utm_lang?: string;
  utm_device?: string;
  utm_workflow?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  msclkid?: string;
  landing_path?: string;
  landing_url?: string;
  locale?: string;
  countryCode?: string;
  regionCode?: string;
  deviceType?: string;
  deviceLabelZh?: string;
  metadata?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(
  value: MaybeString,
  maxLength: number
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function parseUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function readParam(url: URL | null, key: string, maxLength: number) {
  return normalizeText(url?.searchParams.get(key) || undefined, maxLength);
}

export function buildOrderAttributionSnapshot(snapshot: AcquisitionSnapshot) {
  return Object.fromEntries(
    Object.entries({
      source: snapshot.source,
      referrer: snapshot.referrer,
      utm_source: snapshot.utm_source,
      utm_medium: snapshot.utm_medium,
      utm_batch: snapshot.utm_batch,
      utm_objective: snapshot.utm_objective,
      utm_campaign: snapshot.utm_campaign,
      utm_adgroup: snapshot.utm_adgroup,
      utm_content: snapshot.utm_content,
      utm_term: snapshot.utm_term,
      utm_match: snapshot.utm_match,
      utm_lang: snapshot.utm_lang,
      utm_device: snapshot.utm_device,
      utm_workflow: snapshot.utm_workflow,
      gclid: snapshot.gclid,
      gbraid: snapshot.gbraid,
      wbraid: snapshot.wbraid,
      fbclid: snapshot.fbclid,
      msclkid: snapshot.msclkid,
      landing_path: snapshot.landing_path,
      landing_url: snapshot.landing_url,
      locale: snapshot.locale,
      countryCode: snapshot.countryCode,
      regionCode: snapshot.regionCode,
      deviceType: snapshot.deviceType,
      deviceLabelZh: snapshot.deviceLabelZh,
    }).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

function buildAcquisitionMetadata({
  existing,
  snapshot,
}: {
  existing?: Record<string, unknown> | null;
  snapshot: AcquisitionSnapshot;
}): AcquisitionMetadata {
  const existingMetadata = isRecord(existing)
    ? (existing as AcquisitionMetadata)
    : {};
  const nextSnapshot = buildOrderAttributionSnapshot(snapshot);
  const firstTouchSnapshot = isRecord(existingMetadata.firstTouchSnapshot)
    ? existingMetadata.firstTouchSnapshot
    : nextSnapshot;

  return {
    ...existingMetadata,
    ...(snapshot.metadata || {}),
    acquisitionVersion: 2,
    attributionMode: 'first_touch_fields_with_last_touch_snapshot',
    firstTouchSnapshot,
    lastTouchSnapshot: nextSnapshot,
  };
}

function readStoredFirstTouchSnapshot(
  existing?: StoredUserAcquisitionRecord | null
): AcquisitionSnapshot | null {
  if (!existing) {
    return null;
  }

  const metadata = isRecord(existing.metadata)
    ? (existing.metadata as AcquisitionMetadata)
    : null;
  const storedSnapshot = metadata?.firstTouchSnapshot;

  if (isRecord(storedSnapshot)) {
    return {
      source: normalizeText(storedSnapshot.source as MaybeString, 128),
      referrer: normalizeText(storedSnapshot.referrer as MaybeString, 512),
      utm_source: normalizeText(storedSnapshot.utm_source as MaybeString, 128),
      utm_medium: normalizeText(storedSnapshot.utm_medium as MaybeString, 128),
      utm_batch: normalizeText(storedSnapshot.utm_batch as MaybeString, 128),
      utm_objective: normalizeText(
        storedSnapshot.utm_objective as MaybeString,
        128
      ),
      utm_campaign: normalizeText(
        storedSnapshot.utm_campaign as MaybeString,
        255
      ),
      utm_adgroup: normalizeText(
        storedSnapshot.utm_adgroup as MaybeString,
        255
      ),
      utm_content: normalizeText(storedSnapshot.utm_content as MaybeString, 255),
      utm_term: normalizeText(storedSnapshot.utm_term as MaybeString, 255),
      utm_match: normalizeText(storedSnapshot.utm_match as MaybeString, 64),
      utm_lang: normalizeText(storedSnapshot.utm_lang as MaybeString, 24),
      utm_device: normalizeText(storedSnapshot.utm_device as MaybeString, 24),
      utm_workflow: normalizeText(
        storedSnapshot.utm_workflow as MaybeString,
        64
      ),
      gclid: normalizeText(storedSnapshot.gclid as MaybeString, 255),
      gbraid: normalizeText(storedSnapshot.gbraid as MaybeString, 255),
      wbraid: normalizeText(storedSnapshot.wbraid as MaybeString, 255),
      fbclid: normalizeText(storedSnapshot.fbclid as MaybeString, 255),
      msclkid: normalizeText(storedSnapshot.msclkid as MaybeString, 255),
      landing_path: normalizeText(
        storedSnapshot.landing_path as MaybeString,
        255
      ),
      landing_url: normalizeText(
        storedSnapshot.landing_url as MaybeString,
        512
      ),
      locale: normalizeText(storedSnapshot.locale as MaybeString, 24),
      countryCode: normalizeText(
        storedSnapshot.countryCode as MaybeString,
        8
      ),
      regionCode: normalizeText(storedSnapshot.regionCode as MaybeString, 16),
      deviceType: normalizeText(storedSnapshot.deviceType as MaybeString, 24),
      deviceLabelZh: normalizeText(
        storedSnapshot.deviceLabelZh as MaybeString,
        64
      ),
    };
  }

  return {
    source: normalizeText(existing.source, 128),
    referrer: normalizeText(existing.referrer, 512),
    utm_source: normalizeText(existing.utmSource, 128),
    utm_medium: normalizeText(existing.utmMedium, 128),
    utm_batch: normalizeText(existing.utmBatch, 128),
    utm_objective: normalizeText(existing.utmObjective, 128),
    utm_campaign: normalizeText(existing.utmCampaign, 255),
    utm_adgroup: normalizeText(existing.utmAdgroup, 255),
    utm_content: normalizeText(existing.utmContent, 255),
    utm_term: normalizeText(existing.utmTerm, 255),
    utm_match: normalizeText(existing.utmMatch, 64),
    utm_lang: normalizeText(existing.utmLang, 24),
    utm_device: normalizeText(existing.utmDevice, 24),
    utm_workflow: normalizeText(existing.utmWorkflow, 64),
    gclid: normalizeText(existing.gclid, 255),
    gbraid: normalizeText(existing.gbraid, 255),
    wbraid: normalizeText(existing.wbraid, 255),
    fbclid: normalizeText(existing.fbclid, 255),
    msclkid: normalizeText(existing.msclkid, 255),
    landing_path: normalizeText(existing.landingPath, 255),
    landing_url: normalizeText(existing.landingUrl, 512),
    locale: normalizeText(existing.locale, 24),
    countryCode: normalizeText(existing.countryCode, 8),
    regionCode: normalizeText(existing.regionCode, 16),
    deviceType: normalizeText(existing.deviceType, 24),
    deviceLabelZh: normalizeText(existing.deviceLabelZh, 64),
  };
}

export function resolveStoredAcquisitionSnapshot(params: {
  existing?: StoredUserAcquisitionRecord | null;
  snapshot: AcquisitionSnapshot;
}): AcquisitionSnapshot {
  const firstTouchSnapshot = readStoredFirstTouchSnapshot(params.existing);

  if (!firstTouchSnapshot) {
    return params.snapshot;
  }

  return {
    ...params.snapshot,
    source: firstTouchSnapshot.source ?? params.snapshot.source,
    referrer: firstTouchSnapshot.referrer ?? params.snapshot.referrer,
    utm_source: firstTouchSnapshot.utm_source ?? params.snapshot.utm_source,
    utm_medium: firstTouchSnapshot.utm_medium ?? params.snapshot.utm_medium,
    utm_batch: firstTouchSnapshot.utm_batch ?? params.snapshot.utm_batch,
    utm_objective:
      firstTouchSnapshot.utm_objective ?? params.snapshot.utm_objective,
    utm_campaign:
      firstTouchSnapshot.utm_campaign ?? params.snapshot.utm_campaign,
    utm_adgroup: firstTouchSnapshot.utm_adgroup ?? params.snapshot.utm_adgroup,
    utm_content: firstTouchSnapshot.utm_content ?? params.snapshot.utm_content,
    utm_term: firstTouchSnapshot.utm_term ?? params.snapshot.utm_term,
    utm_match: firstTouchSnapshot.utm_match ?? params.snapshot.utm_match,
    utm_lang: firstTouchSnapshot.utm_lang ?? params.snapshot.utm_lang,
    utm_device: firstTouchSnapshot.utm_device ?? params.snapshot.utm_device,
    utm_workflow:
      firstTouchSnapshot.utm_workflow ?? params.snapshot.utm_workflow,
    gclid: firstTouchSnapshot.gclid ?? params.snapshot.gclid,
    gbraid: firstTouchSnapshot.gbraid ?? params.snapshot.gbraid,
    wbraid: firstTouchSnapshot.wbraid ?? params.snapshot.wbraid,
    fbclid: firstTouchSnapshot.fbclid ?? params.snapshot.fbclid,
    msclkid: firstTouchSnapshot.msclkid ?? params.snapshot.msclkid,
    landing_path:
      firstTouchSnapshot.landing_path ?? params.snapshot.landing_path,
    landing_url: firstTouchSnapshot.landing_url ?? params.snapshot.landing_url,
    locale: firstTouchSnapshot.locale ?? params.snapshot.locale,
    countryCode: firstTouchSnapshot.countryCode ?? params.snapshot.countryCode,
    regionCode: firstTouchSnapshot.regionCode ?? params.snapshot.regionCode,
    deviceType: firstTouchSnapshot.deviceType ?? params.snapshot.deviceType,
    deviceLabelZh:
      firstTouchSnapshot.deviceLabelZh ?? params.snapshot.deviceLabelZh,
  };
}

function buildPersistedAcquisitionColumns(snapshot: AcquisitionSnapshot) {
  return {
    source: snapshot.source || null,
    referrer: snapshot.referrer || null,
    utmSource: snapshot.utm_source || null,
    utmMedium: snapshot.utm_medium || null,
    utmBatch: snapshot.utm_batch || null,
    utmObjective: snapshot.utm_objective || null,
    utmCampaign: snapshot.utm_campaign || null,
    utmAdgroup: snapshot.utm_adgroup || null,
    utmContent: snapshot.utm_content || null,
    utmTerm: snapshot.utm_term || null,
    utmMatch: snapshot.utm_match || null,
    utmLang: snapshot.utm_lang || null,
    utmDevice: snapshot.utm_device || null,
    utmWorkflow: snapshot.utm_workflow || null,
    gclid: snapshot.gclid || null,
    gbraid: snapshot.gbraid || null,
    wbraid: snapshot.wbraid || null,
    fbclid: snapshot.fbclid || null,
    msclkid: snapshot.msclkid || null,
    landingPath: snapshot.landing_path || null,
    landingUrl: snapshot.landing_url || null,
    locale: snapshot.locale || null,
    countryCode: snapshot.countryCode || null,
    regionCode: snapshot.regionCode || null,
    deviceType: snapshot.deviceType || null,
    deviceLabelZh: snapshot.deviceLabelZh || null,
  };
}

function isMissingRelationError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown };
  if (maybeError.code === '42P01') {
    return true;
  }

  return (
    typeof maybeError.message === 'string' &&
    maybeError.message.includes('user_acquisition') &&
    maybeError.message.includes('does not exist')
  );
}

export function buildAcquisitionSnapshotFromRequestContext(params: {
  requestContext: Pick<
    RequestContextSnapshot,
    'deviceType' | 'locale' | 'countryCode' | 'regionCode' | 'path' | 'referer'
  >;
}): AcquisitionSnapshot {
  const refererUrl = parseUrl(params.requestContext.referer);
  const utmSource = readParam(refererUrl, 'utm_source', 128);
  const utmMedium = readParam(refererUrl, 'utm_medium', 128);
  const utmBatch = readParam(refererUrl, 'utm_batch', 128);
  const utmObjective = readParam(refererUrl, 'utm_objective', 128);
  const utmCampaign = readParam(refererUrl, 'utm_campaign', 255);
  const utmAdgroup = readParam(refererUrl, 'utm_adgroup', 255);
  const utmContent = readParam(refererUrl, 'utm_content', 255);
  const utmTerm = readParam(refererUrl, 'utm_term', 255);
  const utmMatch = readParam(refererUrl, 'utm_match', 64);
  const utmLang = readParam(refererUrl, 'utm_lang', 24);
  const utmDevice = readParam(refererUrl, 'utm_device', 24);
  const utmWorkflow = readParam(refererUrl, 'utm_workflow', 64);
  const gclid = readParam(refererUrl, 'gclid', 255);
  const gbraid = readParam(refererUrl, 'gbraid', 255);
  const wbraid = readParam(refererUrl, 'wbraid', 255);
  const fbclid = readParam(refererUrl, 'fbclid', 255);
  const msclkid = readParam(refererUrl, 'msclkid', 255);
  const landingPath =
    normalizeText(params.requestContext.path, 255) ||
    normalizeText(refererUrl?.pathname || undefined, 255);
  const landingUrl =
    landingPath && landingPath.startsWith('/')
      ? `${getAppUrl()}${landingPath}`
      : landingPath
        ? `${getAppUrl()}/${landingPath}`
        : getAppUrl();

  return {
    source:
      utmSource ||
      normalizeText(refererUrl?.hostname || undefined, 128) ||
      'direct',
    referrer: normalizeText(params.requestContext.referer, 512),
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_batch: utmBatch,
    utm_objective: utmObjective,
    utm_campaign: utmCampaign,
    utm_adgroup: utmAdgroup,
    utm_content: utmContent,
    utm_term: utmTerm,
    utm_match: utmMatch,
    utm_lang: utmLang,
    utm_device: utmDevice,
    utm_workflow: utmWorkflow,
    gclid,
    gbraid,
    wbraid,
    fbclid,
    msclkid,
    landing_path: landingPath,
    landing_url: normalizeText(landingUrl, 512),
    locale: normalizeText(params.requestContext.locale, 24),
    countryCode: normalizeText(params.requestContext.countryCode, 8),
    regionCode: normalizeText(params.requestContext.regionCode, 16),
    deviceType: normalizeText(params.requestContext.deviceType, 24),
    metadata: {
      refererHost: refererUrl?.hostname || null,
    },
  };
}

export function buildMergedAcquisitionSnapshotFromRequestContext(params: {
  requestContext: Pick<
    RequestContextSnapshot,
    'deviceType' | 'locale' | 'countryCode' | 'regionCode' | 'path' | 'referer'
  >;
  cookieHeader?: string | null;
}): AcquisitionSnapshot {
  const requestSnapshot = buildAcquisitionSnapshotFromRequestContext({
    requestContext: params.requestContext,
  });
  const cookieSnapshot = readAdsAttributionCookieFromHeader(params.cookieHeader);
  const mergedSnapshot = mergeAdsAttributionSnapshots({
    cookieSnapshot,
    requestSnapshot,
  });

  return {
    ...requestSnapshot,
    ...mergedSnapshot,
    metadata: requestSnapshot.metadata,
    deviceLabelZh: requestSnapshot.deviceLabelZh,
  };
}

export async function upsertUserAcquisitionSnapshot(params: {
  userId: string;
  snapshot: AcquisitionSnapshot;
  touchedAt?: Date;
}) {
  const touchedAt = params.touchedAt || new Date();
  const now = new Date();
  const [existing] = await db()
    .select()
    .from(userAcquisition)
    .where(eq(userAcquisition.userId, params.userId))
    .limit(1);

  if (!existing) {
    await db()
      .insert(userAcquisition)
      .values({
        id: getUuid(),
        userId: params.userId,
        firstTouchAt: touchedAt,
        lastTouchAt: touchedAt,
        ...buildPersistedAcquisitionColumns(params.snapshot),
        metadata: buildAcquisitionMetadata({
          snapshot: params.snapshot,
        }),
        createdAt: now,
        updatedAt: now,
      });
    return;
  }

  const persistedSnapshot = resolveStoredAcquisitionSnapshot({
    existing,
    snapshot: params.snapshot,
  });

  await db()
    .update(userAcquisition)
    .set({
      lastTouchAt: touchedAt,
      ...buildPersistedAcquisitionColumns(persistedSnapshot),
      metadata: buildAcquisitionMetadata({
        existing:
          (existing.metadata as Record<string, unknown> | undefined) || {},
        snapshot: params.snapshot,
      }),
      updatedAt: now,
    })
    .where(eq(userAcquisition.userId, params.userId));
}

export async function safeUpsertUserAcquisitionSnapshot(params: {
  userId: string;
  snapshot: AcquisitionSnapshot;
  touchedAt?: Date;
}) {
  try {
    await upsertUserAcquisitionSnapshot(params);
  } catch (error) {
    if (isMissingRelationError(error)) {
      console.warn('[user-acquisition] relation missing, skip snapshot write');
      return;
    }

    console.warn('[user-acquisition] failed to persist acquisition snapshot', {
      userId: params.userId,
      error,
    });
  }
}
