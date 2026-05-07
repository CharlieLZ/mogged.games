import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  oneTapMock: vi.fn(),
  magicLinkMock: vi.fn(),
  sendMagicLinkEmail: vi.fn(),
  sendSignupNotification: vi.fn(),
  grantCreditsForNewUser: vi.fn(),
  buildAcquisitionSnapshotFromRequestContext: vi.fn(() => ({})),
  buildMergedAcquisitionSnapshotFromRequestContext: vi.fn(() => ({})),
  safeUpsertUserAcquisitionSnapshot: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  safeRecordUserContextEvent: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(),
}));

vi.mock('better-auth/plugins', () => ({
  oneTap: mocks.oneTapMock,
  magicLink: mocks.magicLinkMock,
}));

vi.mock('@/core/db', () => ({
  db: vi.fn(),
}));

vi.mock('@/config', () => ({
  envConfigs: {
    app_name: 'mogged',
    auth_secret: 'test-secret',
    auth_url: 'https://auth.example.com',
    app_url: 'https://app.example.com',
    database_url: '',
    database_provider: 'postgresql',
  },
}));

vi.mock('@/config/db/schema', () => ({}));
vi.mock('@/extensions/notification', () => ({
  sendSignupNotification: mocks.sendSignupNotification,
}));
vi.mock('@/shared/services/magic-link-email', () => ({
  sendMagicLinkEmail: mocks.sendMagicLinkEmail,
}));
vi.mock('@/shared/lib/hash', () => ({
  getUuid: vi.fn(() => 'test-uuid'),
}));
vi.mock('@/shared/models/credit', () => ({
  grantCreditsForNewUser: mocks.grantCreditsForNewUser,
}));
vi.mock('@/shared/models/user-acquisition', () => ({
  buildAcquisitionSnapshotFromRequestContext:
    mocks.buildAcquisitionSnapshotFromRequestContext,
  buildMergedAcquisitionSnapshotFromRequestContext:
    mocks.buildMergedAcquisitionSnapshotFromRequestContext,
  safeUpsertUserAcquisitionSnapshot: mocks.safeUpsertUserAcquisitionSnapshot,
}));
vi.mock('@/shared/models/user_context_event', () => ({
  safeRecordUserContextEvent: mocks.safeRecordUserContextEvent,
}));
vi.mock('@/shared/services/welcome-email', () => ({
  sendWelcomeEmail: mocks.sendWelcomeEmail,
}));

describe('getAuthOptions', () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.oneTapMock.mockReset();
    mocks.magicLinkMock.mockReset();
    mocks.sendMagicLinkEmail.mockReset();
    mocks.sendSignupNotification.mockReset();
    mocks.grantCreditsForNewUser.mockReset();
    mocks.buildAcquisitionSnapshotFromRequestContext.mockReset();
    mocks.buildMergedAcquisitionSnapshotFromRequestContext.mockReset();
    mocks.safeUpsertUserAcquisitionSnapshot.mockReset();
    mocks.sendWelcomeEmail.mockReset();
    mocks.safeRecordUserContextEvent.mockReset();
    mocks.oneTapMock.mockImplementation((options: unknown) => ({
      id: 'one-tap',
      options,
    }));
    mocks.magicLinkMock.mockImplementation((options: unknown) => ({
      id: 'magic-link',
      options,
    }));
    mocks.sendSignupNotification.mockResolvedValue({
      code: 0,
      msg: 'ok',
    });
    mocks.grantCreditsForNewUser.mockResolvedValue(undefined);
    mocks.buildAcquisitionSnapshotFromRequestContext.mockReturnValue({});
    mocks.buildMergedAcquisitionSnapshotFromRequestContext.mockReturnValue({});
    mocks.safeUpsertUserAcquisitionSnapshot.mockResolvedValue(undefined);
    mocks.sendWelcomeEmail.mockResolvedValue(undefined);
  });

  it('fails fast when the auth secret is missing', async () => {
    const { envConfigs } = await import('@/config');
    const originalAuthSecret = envConfigs.auth_secret;
    envConfigs.auth_secret = '';

    const { getAuthOptions } = await import('./config');

    try {
      await expect(getAuthOptions({})).rejects.toThrow(
        'AUTH_SECRET is required for auth runtime'
      );
    } finally {
      envConfigs.auth_secret = originalAuthSecret;
    }
  });

  it('enables the one tap server plugin when configured', async () => {
    const { getAuthOptions } = await import('./config');

    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      resend_api_key: 'resend-test-key',
      google_auth_enabled: 'true',
      google_one_tap_enabled: 'true',
      google_client_id: 'google-client-id',
      google_client_secret: 'google-client-secret',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
    });

    expect(mocks.oneTapMock).toHaveBeenCalledWith({
      clientId: 'google-client-id',
    });
    expect(options.plugins).toEqual([
      {
        id: 'magic-link',
        options: expect.any(Object),
      },
      {
        id: 'one-tap',
        options: {
          clientId: 'google-client-id',
        },
      },
    ]);
  });

  it('derives Google auth and one tap when credentials are complete and flags are unset', async () => {
    const { getAuthOptions } = await import('./config');

    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      resend_api_key: 'resend-test-key',
      google_auth_enabled: '',
      google_one_tap_enabled: '',
      google_client_id: 'google-client-id',
      google_client_secret: 'google-client-secret',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
    });

    expect(options.socialProviders.google).toEqual({
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
    });
    expect(mocks.oneTapMock).toHaveBeenCalledWith({
      clientId: 'google-client-id',
    });
  });

  it('skips the one tap server plugin when the feature is disabled', async () => {
    const { getAuthOptions } = await import('./config');

    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      resend_api_key: 'resend-test-key',
      google_auth_enabled: 'true',
      google_one_tap_enabled: 'false',
      google_client_id: 'google-client-id',
      google_client_secret: 'google-client-secret',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
    });

    expect(mocks.oneTapMock).not.toHaveBeenCalled();
    expect(mocks.magicLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sendMagicLink: expect.any(Function),
      })
    );
    expect(options.plugins).toEqual([
      {
        id: 'magic-link',
        options: expect.any(Object),
      },
    ]);
  });

  it('skips the magic link plugin when no email provider is configured', async () => {
    const { getAuthOptions } = await import('./config');

    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      google_auth_enabled: 'false',
      google_client_id: '',
      google_client_secret: '',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
      resend_api_key: '',
      zeptomail_smtp_api_key: '',
    });

    expect(mocks.magicLinkMock).not.toHaveBeenCalled();
    expect(options.plugins).toEqual([]);
  });

  it('waits for signup notification delivery in the user create hook', async () => {
    vi.doMock('next/headers', () => ({
      headers: vi.fn().mockRejectedValue(new Error('no request headers')),
    }));

    let resolveNotification:
      | ((value: { code: number; msg: string }) => void)
      | undefined;
    const notificationPromise = new Promise<{ code: number; msg: string }>(
      (resolve) => {
        resolveNotification = resolve;
      }
    );
    mocks.sendSignupNotification.mockReturnValue(notificationPromise);

    const { getAuthOptions } = await import('./config');
    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      google_auth_enabled: 'false',
      google_client_id: '',
      google_client_secret: '',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
    });

    let settled = false;
    const hookPromise = options.databaseHooks.user.create
      .after({
        id: 'user_123',
        email: 'alice@example.com',
        name: 'Alice',
        locale: 'en',
      })
      .then(() => {
        settled = true;
      });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mocks.sendSignupNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        email: 'alice@example.com',
        source: 'auth_signup',
      })
    );
    expect(settled).toBe(false);

    resolveNotification?.({
      code: 0,
      msg: 'ok',
    });
    await hookPromise;

    expect(settled).toBe(true);
  });

  it('merges the ads attribution cookie into the signup acquisition snapshot', async () => {
    vi.doMock('next/headers', () => ({
      headers: vi.fn().mockResolvedValue(
        new Headers({
          cookie:
            'hh_ads_attribution=%7B%22utm_source%22%3A%22google%22%2C%22utm_campaign%22%3A%22hh0414-zh-r2v-pc-exa%22%2C%22utm_term%22%3A%22happy-horse%22%2C%22gclid%22%3A%22test-gclid%22%7D',
          referer: 'https://mogged.games/zh/sign-up',
        })
      ),
    }));

    mocks.buildMergedAcquisitionSnapshotFromRequestContext.mockReturnValue({
      utm_source: 'google',
      utm_campaign: 'hh0414-zh-r2v-pc-exa',
      utm_term: 'happy-horse',
      gclid: 'test-gclid',
    });

    const { getAuthOptions } = await import('./config');
    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      google_auth_enabled: 'false',
      google_client_id: '',
      google_client_secret: '',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
    });

    await options.databaseHooks.user.create.after({
      id: 'user_234',
      email: 'alice@example.com',
      name: 'Alice',
      locale: 'zh',
    });

    expect(
      mocks.buildMergedAcquisitionSnapshotFromRequestContext
    ).toHaveBeenCalledWith({
      requestContext: expect.objectContaining({
        path: '/zh/sign-up',
        referer: 'https://mogged.games/zh/sign-up',
        deviceType: 'unknown',
      }),
      cookieHeader:
        'hh_ads_attribution=%7B%22utm_source%22%3A%22google%22%2C%22utm_campaign%22%3A%22hh0414-zh-r2v-pc-exa%22%2C%22utm_term%22%3A%22happy-horse%22%2C%22gclid%22%3A%22test-gclid%22%7D',
    });
    expect(mocks.safeUpsertUserAcquisitionSnapshot).toHaveBeenCalledWith({
      userId: 'user_234',
      snapshot: {
        utm_source: 'google',
        utm_campaign: 'hh0414-zh-r2v-pc-exa',
        utm_term: 'happy-horse',
        gclid: 'test-gclid',
      },
    });
  });

  it('passes locale and acquisition context into the welcome email', async () => {
    vi.doMock('next/headers', () => ({
      headers: vi.fn().mockResolvedValue(
        new Headers({
          cookie:
            'hh_ads_attribution=%7B%22utm_workflow%22%3A%22reference-to-video%22%2C%22landing_path%22%3A%22%2Fai-video-generator%2Freference-to-video%22%7D',
          referer:
            'https://mogged.games/zh/ai-video-generator/image-to-video?utm_workflow=image-to-video',
        })
      ),
    }));

    mocks.buildMergedAcquisitionSnapshotFromRequestContext.mockReturnValue({
      utm_workflow: 'reference-to-video',
      landing_path: '/ai-video-generator/reference-to-video',
    });

    const { getAuthOptions } = await import('./config');
    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      google_auth_enabled: 'false',
      google_client_id: '',
      google_client_secret: '',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
    });

    await options.databaseHooks.user.create.after({
      id: 'user_345',
      email: 'alice@example.com',
      name: 'Alice',
      locale: 'zh',
    });

    expect(mocks.sendWelcomeEmail).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      locale: 'zh',
      acquisitionSnapshot: {
        utm_workflow: 'reference-to-video',
        landing_path: '/ai-video-generator/reference-to-video',
      },
    });
  });

  it('prefers the explicit site locale over a mismatched created user locale', async () => {
    vi.doMock('next/headers', () => ({
      headers: vi.fn().mockResolvedValue(
        new Headers({
          cookie: 'NEXT_LOCALE=en',
          referer: 'https://accounts.google.com/',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        })
      ),
    }));

    const { getAuthOptions } = await import('./config');
    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      google_auth_enabled: 'false',
      google_client_id: '',
      google_client_secret: '',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
    });

    await options.databaseHooks.user.create.after({
      id: 'user_456',
      email: 'alice@example.com',
      name: 'Alice',
      locale: 'zh',
    });

    expect(mocks.grantCreditsForNewUser).toHaveBeenCalledWith(
      expect.objectContaining({
        requestContext: expect.objectContaining({
          locale: 'en',
        }),
      })
    );
    expect(mocks.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
      })
    );
    expect(mocks.sendSignupNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
      })
    );
  });

  it('refreshes the stored user context locale when a session is created', async () => {
    vi.doMock('next/headers', () => ({
      headers: vi.fn().mockResolvedValue(
        new Headers({
          cookie: 'NEXT_LOCALE=en',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          referer: 'https://mogged.games/activity',
        })
      ),
    }));

    const { getAuthOptions } = await import('./config');
    const options = await getAuthOptions({
      email_auth_enabled: 'true',
      google_auth_enabled: 'false',
      google_client_id: '',
      google_client_secret: '',
      github_auth_enabled: 'false',
      github_client_id: '',
      github_client_secret: '',
    });

    await options.databaseHooks.session.create.after({
      id: 'session_123',
      userId: 'user_123',
      ipAddress: '203.0.113.10',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36',
    });

    expect(mocks.safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        locale: 'en',
        markSignIn: true,
      })
    );
  });
});
