import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { GuestDailyQuotaStatus } from '@/shared/lib/viewer-quota';

import type * as GuestViewerService from './guest-viewer';

const originalAuthSecret = process.env.AUTH_SECRET;

let getRequestViewerInfo: typeof GuestViewerService.getRequestViewerInfo;
let GUEST_DAILY_QUOTA_LIMIT: typeof GuestViewerService.GUEST_DAILY_QUOTA_LIMIT;
let GUEST_VIEWER_COOKIE_NAME: typeof GuestViewerService.GUEST_VIEWER_COOKIE_NAME;
let isGuestViewerId: typeof GuestViewerService.isGuestViewerId;
let resolveRequestViewer: typeof GuestViewerService.resolveRequestViewer;

const requestState = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  headers: new Headers(),
  setCookie: vi.fn((name: string, value: string) => {
    requestState.cookieJar.set(name, value);
  }),
}));

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  getUserCredits: vi.fn(),
  getGuestQuotaStatus: vi.fn(),
  resolvePaidAccessState: vi.fn(),
  createDefaultGuestQuotaStatus: vi.fn(() => ({
    dateKey: '2026-05-03',
    limit: 100,
    used: 0,
    reserved: 0,
    remaining: 100,
  })),
}));

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: async () => requestState.headers,
  cookies: async () => ({
    get: (name: string) => {
      const value = requestState.cookieJar.get(name);
      return value ? { value } : undefined;
    },
    set: requestState.setCookie,
  }),
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/models/user', () => ({
  getUserCredits: mocks.getUserCredits,
}));

vi.mock('@/shared/models/guest_daily_quota', () => ({
  getGuestQuotaStatus: mocks.getGuestQuotaStatus,
  createDefaultGuestQuotaStatus: mocks.createDefaultGuestQuotaStatus,
}));

vi.mock('@/shared/services/paid-access', () => ({
  resolvePaidAccessState: mocks.resolvePaidAccessState,
}));

vi.mock('@/shared/lib/viewer-quota', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/viewer-quota')>();

  return {
    ...actual,
    createDefaultGuestQuotaStatus: mocks.createDefaultGuestQuotaStatus,
  };
});

describe('guest viewer service', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T12:00:00.000Z'));
    process.env.AUTH_SECRET = 'test-auth-secret';

    requestState.cookieJar = new Map();
    requestState.headers = new Headers({
      'accept-language': 'en-US,en;q=0.9',
      'cf-connecting-ip': '203.0.113.9',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36',
    });

    mocks.getUserInfo.mockResolvedValue(null);
    mocks.getUserCredits.mockResolvedValue({
      remainingCredits: 25,
      expiresAt: null,
      dailyClaim: {
        claimedToday: false,
        creditsAmount: 100,
      },
    });
    mocks.resolvePaidAccessState.mockResolvedValue({
      tier: 'free',
      hasPaidCreditHistory: false,
      hasCurrentSubscription: false,
    });

    const guestViewer = await import('./guest-viewer');
    getRequestViewerInfo = guestViewer.getRequestViewerInfo;
    GUEST_DAILY_QUOTA_LIMIT = guestViewer.GUEST_DAILY_QUOTA_LIMIT;
    GUEST_VIEWER_COOKIE_NAME = guestViewer.GUEST_VIEWER_COOKIE_NAME;
    isGuestViewerId = guestViewer.isGuestViewerId;
    resolveRequestViewer = guestViewer.resolveRequestViewer;

    mocks.getGuestQuotaStatus.mockResolvedValue({
      dateKey: '2026-05-03',
      limit: 100,
      used: 12,
      reserved: 0,
      remaining: 88,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it('returns the authenticated user before attempting any guest fallback', async () => {
    requestState.cookieJar.set(
      'better-auth.session_token',
      'session-token-value'
    );
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
    });

    const viewer = await resolveRequestViewer({ allowGuest: true });

    expect(viewer).toMatchObject({
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      isGuest: false,
    });
    expect(requestState.setCookie).not.toHaveBeenCalled();
  });

  it('skips server auth resolution for anonymous guest requests without a session cookie', async () => {
    const viewer = await resolveRequestViewer({ allowGuest: true });

    expect(viewer?.isGuest).toBe(true);
    expect(mocks.getUserInfo).not.toHaveBeenCalled();
    expect(requestState.setCookie).toHaveBeenCalledWith(
      GUEST_VIEWER_COOKIE_NAME,
      expect.any(String),
      expect.any(Object)
    );
  });

  it('creates a signed guest identity without creating a fake user or real credits', async () => {
    const viewer = await resolveRequestViewer({ allowGuest: true });

    expect(viewer).toBeTruthy();
    expect(viewer?.isGuest).toBe(true);
    expect(isGuestViewerId(viewer?.id || '')).toBe(true);
    expect(viewer?.email).toBe('');
    expect(viewer).toMatchObject({
      guestIdHash: expect.any(String),
      ipHash: expect.any(String),
      userAgentHash: expect.any(String),
      fingerprintHash: expect.any(String),
    });
    expect(requestState.setCookie).toHaveBeenCalledWith(
      GUEST_VIEWER_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      })
    );
  });

  it('reports guest daily credits separately from real credits by reading guest quota storage', async () => {
    const viewer = await resolveRequestViewer({ allowGuest: true });
    expect(viewer?.isGuest).toBe(true);
    if (!viewer || !viewer.isGuest) {
      throw new Error('expected guest viewer');
    }

    const viewerInfo = await getRequestViewerInfo();
    expect(viewerInfo).toMatchObject({
      id: viewer?.id,
      isGuest: true,
      imageQueueTier: 'guest',
      quotaTotal: GUEST_DAILY_QUOTA_LIMIT,
      credits: null,
      guestQuota: {
        dateKey: '2026-05-03',
        remaining: 88,
        used: 12,
        limit: 100,
      },
    });
    expect(mocks.getGuestQuotaStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        guestIdHash: viewer.guestIdHash,
        ipHash: viewer.ipHash,
      })
    );
    expect(mocks.createDefaultGuestQuotaStatus).not.toHaveBeenCalled();
    expect(mocks.getUserCredits).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent guest quota reads for the same returning guest', async () => {
    await resolveRequestViewer({ allowGuest: true });

    let resolveQuota: ((value: GuestDailyQuotaStatus) => void) | undefined;

    mocks.getGuestQuotaStatus.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuota = resolve;
        })
    );

    const firstRequest = getRequestViewerInfo();
    const secondRequest = getRequestViewerInfo();
    await vi.waitFor(() => {
      expect(mocks.getGuestQuotaStatus.mock.calls.length).toBeGreaterThan(0);
    });

    expect(mocks.getGuestQuotaStatus).toHaveBeenCalledTimes(1);

    resolveQuota?.({
      dateKey: '2026-05-03',
      limit: 100,
      used: 12,
      reserved: 0,
      remaining: 88,
    });

    await expect(
      Promise.all([firstRequest, secondRequest])
    ).resolves.toMatchObject([
      expect.objectContaining({
        isGuest: true,
        guestQuota: expect.objectContaining({
          remaining: 88,
        }),
      }),
      expect.objectContaining({
        isGuest: true,
        guestQuota: expect.objectContaining({
          remaining: 88,
        }),
      }),
    ]);
  });

  it('reuses the guest quota snapshot for repeated viewer info reads within a short ttl', async () => {
    await resolveRequestViewer({ allowGuest: true });

    await getRequestViewerInfo();
    await getRequestViewerInfo();

    expect(mocks.getGuestQuotaStatus).toHaveBeenCalledTimes(1);
  });

  it('returns the default guest quota without hitting storage for a newly issued guest', async () => {
    const viewerInfo = await getRequestViewerInfo();

    expect(viewerInfo).toMatchObject({
      isGuest: true,
      imageQueueTier: 'guest',
      quotaTotal: GUEST_DAILY_QUOTA_LIMIT,
      credits: null,
      guestQuota: {
        dateKey: '2026-05-03',
        remaining: GUEST_DAILY_QUOTA_LIMIT,
        used: 0,
        reserved: 0,
        limit: GUEST_DAILY_QUOTA_LIMIT,
      },
    });
    expect(mocks.getGuestQuotaStatus).not.toHaveBeenCalled();
    expect(mocks.createDefaultGuestQuotaStatus).toHaveBeenCalled();
  });

  it('returns zero guest quota for restricted countries', async () => {
    requestState.headers.set('cf-ipcountry', 'IN');

    const viewerInfo = await getRequestViewerInfo();

    expect(viewerInfo).toMatchObject({
      isGuest: true,
      quotaTotal: 0,
      geoRestricted: true,
      guestQuota: {
        remaining: 0,
        used: 0,
        reserved: 0,
        limit: 0,
      },
    });
    expect(mocks.getGuestQuotaStatus).not.toHaveBeenCalled();
    expect(mocks.createDefaultGuestQuotaStatus).not.toHaveBeenCalled();
  });

  it('falls back to the default guest quota snapshot when quota storage fails', async () => {
    await resolveRequestViewer({ allowGuest: true });
    mocks.getGuestQuotaStatus.mockRejectedValueOnce(
      new Error('guest quota storage unavailable')
    );

    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const viewerInfo = await getRequestViewerInfo();

    expect(viewerInfo).toMatchObject({
      isGuest: true,
      quotaTotal: GUEST_DAILY_QUOTA_LIMIT,
      credits: null,
      guestQuota: {
        dateKey: '2026-05-03',
        remaining: GUEST_DAILY_QUOTA_LIMIT,
        used: 0,
        reserved: 0,
        limit: GUEST_DAILY_QUOTA_LIMIT,
      },
    });
    expect(mocks.createDefaultGuestQuotaStatus).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[guest-viewer] guest quota status failed',
      expect.objectContaining({
        step: 'read-guest-quota-status',
      })
    );
    consoleError.mockRestore();
  });

  it('reports authenticated viewer credits while preserving browser guest quota', async () => {
    requestState.cookieJar.set(
      'better-auth.session_token',
      'session-token-value'
    );
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-2',
      email: 'paid@example.com',
      name: 'Paid User',
      image: null,
    });

    const viewerInfo = await getRequestViewerInfo();

    expect(viewerInfo).toMatchObject({
      id: 'user-2',
      isGuest: false,
      imageQueueTier: 'free',
      credits: {
        remainingCredits: 25,
      },
      guestQuota: {
        dateKey: '2026-05-03',
        remaining: GUEST_DAILY_QUOTA_LIMIT,
        used: 0,
        reserved: 0,
        limit: GUEST_DAILY_QUOTA_LIMIT,
      },
      quotaTotal: GUEST_DAILY_QUOTA_LIMIT,
    });
    expect(mocks.getUserCredits).toHaveBeenCalledWith('user-2', null);
    expect(mocks.createDefaultGuestQuotaStatus).toHaveBeenCalled();
    expect(mocks.getGuestQuotaStatus).not.toHaveBeenCalled();
  });

  it('passes restricted request countries into authenticated viewer credit status', async () => {
    requestState.cookieJar.set(
      'better-auth.session_token',
      'session-token-value'
    );
    requestState.headers.set('cf-ipcountry', 'IN');
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-2',
      email: 'paid@example.com',
      name: 'Paid User',
      image: null,
    });

    const viewerInfo = await getRequestViewerInfo();

    expect(viewerInfo).toMatchObject({
      id: 'user-2',
      isGuest: false,
      guestQuota: {
        remaining: 0,
        used: 0,
        reserved: 0,
        limit: 0,
      },
      quotaTotal: 0,
      geoRestricted: true,
    });
    expect(mocks.getUserCredits).toHaveBeenCalledWith('user-2', 'IN');
  });

  it('reuses an existing guest quota cookie after sign-in instead of resetting it', async () => {
    await resolveRequestViewer({ allowGuest: true });
    requestState.cookieJar.set(
      'better-auth.session_token',
      'session-token-value'
    );
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-2',
      email: 'paid@example.com',
      name: 'Paid User',
      image: null,
    });
    requestState.setCookie.mockClear();

    const viewerInfo = await getRequestViewerInfo();

    expect(viewerInfo).toMatchObject({
      isGuest: false,
      guestQuota: {
        remaining: 88,
        used: 12,
        limit: 100,
      },
      quotaTotal: GUEST_DAILY_QUOTA_LIMIT,
    });
    expect(requestState.setCookie).not.toHaveBeenCalled();
    expect(mocks.getGuestQuotaStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        guestIdHash: expect.any(String),
        ipHash: expect.any(String),
      })
    );
  });

  it('marks authenticated viewers with paid history as paid queue users', async () => {
    requestState.cookieJar.set(
      'better-auth.session_token',
      'session-token-value'
    );
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-3',
      email: 'vip@example.com',
      name: 'VIP User',
      image: null,
    });
    mocks.resolvePaidAccessState.mockResolvedValueOnce({
      tier: 'paid',
      hasPaidCreditHistory: true,
      hasCurrentSubscription: false,
    });

    const viewerInfo = await getRequestViewerInfo();

    expect(viewerInfo).toMatchObject({
      id: 'user-3',
      isGuest: false,
      imageQueueTier: 'paid',
    });
  });

  it('returns null for anonymous requests when guest fallback is disabled', async () => {
    const viewer = await resolveRequestViewer({ allowGuest: false });

    expect(viewer).toBeNull();
    expect(requestState.setCookie).not.toHaveBeenCalled();
  });
});
