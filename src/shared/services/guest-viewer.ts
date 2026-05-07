import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';

import { hasBetterAuthSessionCookie } from '@/shared/lib/auth-session-cookie';
import {
  normalizeCreditCountryCode,
  resolveCreditCountryCodeFromHeaders,
  resolveCreditRegionPolicy,
} from '@/shared/lib/credit-region-policy';
import { getClientIpFromHeaders } from '@/shared/lib/request-context';
import {
  formatGuestQuotaDateKey,
  GUEST_DAILY_QUOTA_LIMIT,
  type GuestDailyQuotaStatus,
} from '@/shared/lib/viewer-quota';
import {
  createDefaultGuestQuotaStatus,
  getGuestQuotaStatus,
} from '@/shared/models/guest_daily_quota';
import { getUserCredits } from '@/shared/models/user';
import { getUserInfo } from '@/shared/services/current-user';
import { resolvePaidAccessState } from '@/shared/services/paid-access';

export { GUEST_DAILY_QUOTA_LIMIT } from '@/shared/lib/viewer-quota';

export const GUEST_VIEWER_COOKIE_NAME = 'imageeditorai_guest_id';

const GUEST_VIEWER_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 180;
const GUEST_QUOTA_SNAPSHOT_CACHE_TTL_MS = 3_000;
const GUEST_VIEWER_COOKIE_VERSION = 1;
const GUEST_VIEWER_ID_PREFIX = 'guest_';
const GUEST_VIEWER_NAME = 'Guest Viewer';
const HASH_LENGTH = 32;

type GuestViewerCookiePayload = {
  gid: string;
  exp: number;
  v: number;
};

type AuthenticatedViewer = NonNullable<Awaited<ReturnType<typeof getUserInfo>>>;
type RequestCookieStore = {
  get: (name: string) => { value?: string } | undefined;
  set?: (
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      maxAge?: number;
      path?: string;
      sameSite?: 'lax' | 'strict' | 'none';
      secure?: boolean;
    }
  ) => void;
};

export type GuestViewer = {
  id: string;
  name: string;
  email: '';
  guestId: string;
  image: null;
  fingerprintHash: string;
  isGuest: true;
  guestIdHash: string;
  ipHash: string;
  userAgentHash: string;
  countryCode: string | null;
};

export type RequestViewer =
  | (AuthenticatedViewer & {
      isGuest: false;
    })
  | GuestViewer;

type GuestQuotaSnapshotCacheEntry = {
  expiresAt: number;
  pending: Promise<GuestDailyQuotaStatus> | null;
  value: GuestDailyQuotaStatus | null;
};

declare global {
  var __imageeditoraiGuestQuotaSnapshots:
    | Map<string, GuestQuotaSnapshotCacheEntry>
    | undefined;
}

function getGuestQuotaSnapshotCache() {
  if (!globalThis.__imageeditoraiGuestQuotaSnapshots) {
    globalThis.__imageeditoraiGuestQuotaSnapshots = new Map();
  }

  return globalThis.__imageeditoraiGuestQuotaSnapshots;
}

function cleanupGuestQuotaSnapshotCache(now: number) {
  const cache = getGuestQuotaSnapshotCache();

  for (const [key, entry] of cache.entries()) {
    if (!entry.pending && entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function getGuestQuotaSnapshotCacheKey(
  viewer: Pick<GuestViewer, 'guestIdHash'>,
  date = new Date()
) {
  return `${viewer.guestIdHash}:${formatGuestQuotaDateKey(date)}`;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required for guest viewer signing');
  }

  return secret;
}

function hmacHex(value: string) {
  return createHmac('sha256', getSecret())
    .update(value)
    .digest('hex')
    .slice(0, HASH_LENGTH);
}

function signValue(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function createGuestViewerCookieValue(guestId: string) {
  const payload: GuestViewerCookiePayload = {
    gid: guestId,
    exp: Math.floor(Date.now() / 1000) + GUEST_VIEWER_COOKIE_TTL_SECONDS,
    v: GUEST_VIEWER_COOKIE_VERSION,
  };
  const encoded = encodeBase64Url(JSON.stringify(payload));

  return `${encoded}.${signValue(encoded)}`;
}

function getCookieValueFromHeader(
  cookieHeader: string | null,
  cookieName: string
) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (rawName === cookieName) {
      return rawValueParts.join('=');
    }
  }

  return undefined;
}

function createReadonlyCookieStoreFromHeaders(
  headersList: Headers
): RequestCookieStore {
  return {
    get: (name: string) => {
      const value = getCookieValueFromHeader(headersList.get('cookie'), name);
      return value ? { value } : undefined;
    },
  };
}

async function resolveCookieStore(
  request?: Request
): Promise<RequestCookieStore> {
  if (!request) {
    return cookies();
  }

  try {
    return await cookies();
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes('outside a request scope')
    ) {
      throw error;
    }

    return createReadonlyCookieStoreFromHeaders(request.headers);
  }
}

function verifyGuestViewerCookieValue(token?: string | null) {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = signValue(encoded);
  const valid =
    signature.length === expectedSignature.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!valid) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(encoded)
    ) as GuestViewerCookiePayload;
    if (
      payload.v !== GUEST_VIEWER_COOKIE_VERSION ||
      !payload.gid ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createGuestViewerForRequest(
  guestId: string,
  headersList: Headers
) {
  const ipAddress = getClientIpFromHeaders(headersList);
  const userAgent = headersList.get('user-agent')?.trim().toLowerCase() || '-';
  const acceptLanguage =
    headersList.get('accept-language')?.trim().toLowerCase() || '-';
  const guestIdHash = hmacHex(`guest:${guestId}`);

  const countryCode = normalizeCreditCountryCode(
    headersList.get('cf-ipcountry') ||
      headersList.get('x-vercel-ip-country') ||
      headersList.get('x-country-code')
  );

  return {
    id: `${GUEST_VIEWER_ID_PREFIX}${guestIdHash}`,
    name: GUEST_VIEWER_NAME,
    email: '',
    guestId,
    image: null,
    fingerprintHash: hmacHex(`fp:${ipAddress}|${userAgent}|${acceptLanguage}`),
    isGuest: true,
    guestIdHash,
    ipHash: hmacHex(`ip:${ipAddress}`),
    userAgentHash: hmacHex(`ua:${userAgent}|${acceptLanguage}`),
    countryCode,
  } satisfies GuestViewer;
}

async function persistGuestViewerCookie(
  cookieStore: RequestCookieStore,
  guestId: string
) {
  const existingPayload = verifyGuestViewerCookieValue(
    cookieStore.get(GUEST_VIEWER_COOKIE_NAME)?.value
  );
  if (existingPayload?.gid === guestId) {
    return;
  }

  if (!cookieStore.set) {
    return;
  }

  cookieStore.set(
    GUEST_VIEWER_COOKIE_NAME,
    createGuestViewerCookieValue(guestId),
    {
      httpOnly: true,
      maxAge: GUEST_VIEWER_COOKIE_TTL_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  );
}

export function isGuestViewerId(userId?: string | null) {
  return Boolean(userId && userId.startsWith(GUEST_VIEWER_ID_PREFIX));
}

function createGuestQuotaStatus(limit: number): GuestDailyQuotaStatus {
  return {
    dateKey: formatGuestQuotaDateKey(),
    limit,
    used: 0,
    reserved: 0,
    remaining: limit,
  };
}

async function getGuestQuotaSnapshot(viewer: GuestViewer) {
  const now = Date.now();
  cleanupGuestQuotaSnapshotCache(now);

  const cacheKey = getGuestQuotaSnapshotCacheKey(viewer);
  const cache = getGuestQuotaSnapshotCache();
  const cached = cache.get(cacheKey);

  if (cached?.pending) {
    return cached.pending;
  }

  if (cached?.value && cached.expiresAt > now) {
    return cached.value;
  }

  const pending = (async () => {
    const policy = resolveCreditRegionPolicy({
      countryCode: viewer.countryCode,
      guestQuotaCredits: GUEST_DAILY_QUOTA_LIMIT,
    });
    if (!policy.guestGenerationEnabled) {
      return createGuestQuotaStatus(policy.guestQuotaCredits);
    }

    try {
      return await getGuestQuotaStatus(viewer);
    } catch (error) {
      console.error('[guest-viewer] guest quota status failed', {
        guestIdHash: viewer.guestIdHash,
        ipHash: viewer.ipHash,
        step: 'read-guest-quota-status',
        error,
      });

      return createDefaultGuestQuotaStatus();
    }
  })();

  cache.set(cacheKey, {
    expiresAt: now + GUEST_QUOTA_SNAPSHOT_CACHE_TTL_MS,
    pending,
    value: cached?.value ?? null,
  });

  const nextValue = await pending;
  cache.set(cacheKey, {
    expiresAt: Date.now() + GUEST_QUOTA_SNAPSHOT_CACHE_TTL_MS,
    pending: null,
    value: nextValue,
  });

  return nextValue;
}

export async function resolveRequestViewer({
  allowGuest = false,
  request,
}: {
  allowGuest?: boolean;
  request?: Request;
} = {}): Promise<RequestViewer | null> {
  const result = await resolveRequestViewerState({ allowGuest, request });

  return result.viewer;
}

async function resolveGuestViewerState({
  request,
  createIfMissing = true,
}: {
  request?: Request;
  createIfMissing?: boolean;
} = {}): Promise<{
  isNewGuest: boolean;
  viewer: GuestViewer | null;
}> {
  const headerStore = request?.headers ?? (await headers());
  const cookieStore = await resolveCookieStore(request);
  const existingGuestPayload = verifyGuestViewerCookieValue(
    cookieStore.get(GUEST_VIEWER_COOKIE_NAME)?.value
  );

  if (!existingGuestPayload && !createIfMissing) {
    return {
      isNewGuest: false,
      viewer: null,
    };
  }

  const guestId = existingGuestPayload?.gid || randomUUID();
  const guestViewer = createGuestViewerForRequest(guestId, headerStore);

  await persistGuestViewerCookie(cookieStore, guestId);

  return {
    isNewGuest: !existingGuestPayload,
    viewer: guestViewer,
  };
}

export async function resolveRequestGuestViewer({
  request,
}: {
  request?: Request;
} = {}) {
  const { viewer } = await resolveGuestViewerState({ request });

  return viewer;
}

async function resolveRequestViewerState({
  allowGuest = false,
  request,
}: {
  allowGuest?: boolean;
  request?: Request;
} = {}): Promise<{
  isNewGuest: boolean;
  viewer: RequestViewer | null;
}> {
  const headerStore = request?.headers ?? (await headers());
  const cookieStore = await resolveCookieStore(request);
  const authenticatedUser = hasBetterAuthSessionCookie({
    headers: headerStore,
    cookies: cookieStore,
  })
    ? await getUserInfo()
    : null;

  if (authenticatedUser) {
    return {
      isNewGuest: false,
      viewer: {
        ...authenticatedUser,
        isGuest: false,
      },
    };
  }

  if (!allowGuest) {
    return {
      isNewGuest: false,
      viewer: null,
    };
  }

  return resolveGuestViewerState({ request });
}

export async function getRequestViewerInfo() {
  const { isNewGuest, viewer } = await resolveRequestViewerState({
    allowGuest: true,
  });
  if (!viewer) {
    return null;
  }

  const resolveGuestQuota = async ({
    guestViewer,
    isNewGuestViewer,
  }: {
    guestViewer: GuestViewer;
    isNewGuestViewer: boolean;
  }) => {
    const policy = resolveCreditRegionPolicy({
      countryCode: guestViewer.countryCode,
      guestQuotaCredits: GUEST_DAILY_QUOTA_LIMIT,
    });
    const guestQuota = !policy.guestGenerationEnabled
      ? createGuestQuotaStatus(policy.guestQuotaCredits)
      : isNewGuestViewer
        ? createDefaultGuestQuotaStatus()
        : await getGuestQuotaSnapshot(guestViewer);

    return {
      guestQuota,
      quotaTotal: policy.guestQuotaCredits,
      geoRestricted: policy.restricted || undefined,
    };
  };

  if (!viewer.isGuest) {
    const requestCountryCode = resolveCreditCountryCodeFromHeaders(
      await headers()
    );
    const [credits, paidAccess, guestState] = await Promise.all([
      getUserCredits(viewer.id, requestCountryCode),
      resolvePaidAccessState(viewer.id).catch((error) => {
        console.warn('[guest-viewer] paid access state failed', {
          userId: viewer.id,
          step: 'resolve-paid-access-state',
          error,
        });

        return null;
      }),
      resolveGuestViewerState({ createIfMissing: true }).catch((error) => {
        console.warn('[guest-viewer] signed-in guest quota state failed', {
          userId: viewer.id,
          step: 'resolve-signed-in-guest-quota-state',
          error,
        });

        return null;
      }),
    ]);
    const guestQuotaState = guestState?.viewer
      ? await resolveGuestQuota({
          guestViewer: guestState.viewer,
          isNewGuestViewer: guestState.isNewGuest,
        })
      : null;

    return {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
      image: viewer.image || null,
      isGuest: false,
      imageQueueTier: paidAccess?.tier ?? 'free',
      credits,
      guestQuota: guestQuotaState?.guestQuota ?? null,
      quotaTotal: guestQuotaState?.quotaTotal,
      geoRestricted: guestQuotaState?.geoRestricted,
    };
  }

  const guestQuotaState = await resolveGuestQuota({
    guestViewer: viewer,
    isNewGuestViewer: isNewGuest,
  });

  return {
    id: viewer.id,
    name: viewer.name,
    email: viewer.email,
    image: null,
    isGuest: true,
    imageQueueTier: 'guest',
    credits: null,
    guestQuota: guestQuotaState.guestQuota,
    quotaTotal: guestQuotaState.quotaTotal,
    geoRestricted: guestQuotaState.geoRestricted,
  };
}
