import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAuthClientMock: vi.fn(),
  oneTapClientMock: vi.fn(),
  magicLinkClientMock: vi.fn(),
  signInEmailMock: vi.fn(),
  signInSocialMock: vi.fn(),
  signInMagicLinkMock: vi.fn(),
  signUpEmailMock: vi.fn(),
  requestPasswordResetMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  changePasswordMock: vi.fn(),
}));

vi.mock('better-auth/client/plugins', () => ({
  oneTapClient: mocks.oneTapClientMock,
  magicLinkClient: mocks.magicLinkClientMock,
}));

vi.mock('better-auth/react', () => ({
  createAuthClient: mocks.createAuthClientMock,
}));

vi.mock('@/config', () => ({
  envConfigs: {
    auth_url: 'https://auth.example.com',
    app_url: 'https://app.example.com',
  },
}));

describe('getAuthClient', () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.createAuthClientMock.mockReset();
    mocks.oneTapClientMock.mockReset();
    mocks.magicLinkClientMock.mockReset();
    mocks.signInEmailMock.mockReset();
    mocks.signInSocialMock.mockReset();
    mocks.signInMagicLinkMock.mockReset();
    mocks.signUpEmailMock.mockReset();
    mocks.requestPasswordResetMock.mockReset();
    mocks.resetPasswordMock.mockReset();
    mocks.changePasswordMock.mockReset();

    mocks.createAuthClientMock.mockReturnValue({
      useSession: vi.fn(),
      signIn: {
        email: mocks.signInEmailMock,
        social: mocks.signInSocialMock,
        magicLink: mocks.signInMagicLinkMock,
      },
      signUp: {
        email: mocks.signUpEmailMock,
      },
      requestPasswordReset: mocks.requestPasswordResetMock,
      resetPassword: mocks.resetPasswordMock,
      changePassword: mocks.changePasswordMock,
      signOut: vi.fn(),
      getSession: vi.fn(),
    });

    mocks.oneTapClientMock.mockImplementation((options: unknown) => ({
      id: 'one-tap',
      options,
    }));
    mocks.magicLinkClientMock.mockImplementation(() => ({
      id: 'magic-link',
    }));

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://mogged.games',
          pathname: '/sign-in',
        },
      },
    });

    let cookieValue = '';
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        get cookie() {
          return cookieValue;
        },
        set cookie(value: string) {
          cookieValue = value;
        },
      },
    });
  });

  it('registers the one tap client plugin when enabled', async () => {
    const { getAuthClient } = await import('./client');

    getAuthClient({
      google_auth_enabled: 'true',
      google_one_tap_enabled: 'true',
      google_client_id: 'google-client-id',
    });

    expect(mocks.oneTapClientMock).toHaveBeenCalledWith({
      clientId: 'google-client-id',
      autoSelect: false,
      cancelOnTapOutside: false,
      context: 'signin',
      promptOptions: {
        baseDelay: 1000,
        maxAttempts: 1,
      },
    });
    expect(mocks.createAuthClientMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        baseURL: 'https://mogged.games',
        plugins: [
          {
            id: 'magic-link',
          },
          {
            id: 'one-tap',
            options: expect.any(Object),
          },
        ],
      })
    );
  });

  it('reuses the base auth client when the one tap plugin is disabled', async () => {
    const { getAuthClient } = await import('./client');

    getAuthClient({
      google_auth_enabled: 'true',
      google_one_tap_enabled: 'false',
      google_client_id: 'google-client-id',
    });

    expect(mocks.oneTapClientMock).not.toHaveBeenCalled();
    expect(mocks.magicLinkClientMock).toHaveBeenCalled();
    expect(mocks.createAuthClientMock).toHaveBeenCalledTimes(1);
  });

  it('skips the one tap client plugin on local loopback origins', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'http://127.0.0.1:3000',
        },
      },
    });

    const { getAuthClient } = await import('./client');

    getAuthClient({
      google_auth_enabled: 'true',
      google_one_tap_enabled: 'true',
      google_client_id: 'google-client-id',
    });

    expect(mocks.oneTapClientMock).not.toHaveBeenCalled();
    expect(mocks.createAuthClientMock).toHaveBeenCalledTimes(1);
  });

  it('persists the default locale cookie before email sign-up requests', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://mogged.games',
          pathname: '/sign-up',
        },
      },
    });

    const { signUp } = await import('./client');

    await signUp.email({
      email: 'alice@example.com',
      password: 'secret',
      name: 'Alice',
    });

    expect(document.cookie).toContain('NEXT_LOCALE=en');
    expect(mocks.signUpEmailMock).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password: 'secret',
      name: 'Alice',
    });
  });

  it('persists the localized route cookie before social sign-in requests', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://mogged.games',
          pathname: '/zh/sign-in',
        },
      },
    });

    const { signIn } = await import('./client');

    await signIn.social({
      provider: 'google',
      callbackURL: '/zh/activity',
    });

    expect(document.cookie).toContain('NEXT_LOCALE=zh');
    expect(mocks.signInSocialMock).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/zh/activity',
    });
  });

  it('persists the localized route cookie before magic link sign-in requests', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://mogged.games',
          pathname: '/zh/sign-in',
        },
      },
    });

    const { signIn } = await import('./client');

    await signIn.magicLink({
      email: 'alice@example.com',
      callbackURL: '/zh/activity',
    });

    expect(document.cookie).toContain('NEXT_LOCALE=zh');
    expect(mocks.signInMagicLinkMock).toHaveBeenCalledWith({
      email: 'alice@example.com',
      callbackURL: '/zh/activity',
    });
  });

  it('persists the localized route cookie before password reset email requests', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://mogged.games',
          pathname: '/zh/forgot-password',
        },
      },
    });

    const { requestPasswordReset } = await import('./client');

    await requestPasswordReset({
      email: 'alice@example.com',
      redirectTo: '/zh/sign-in',
    });

    expect(document.cookie).toContain('NEXT_LOCALE=zh');
    expect(mocks.requestPasswordResetMock).toHaveBeenCalledWith({
      email: 'alice@example.com',
      redirectTo: '/zh/sign-in',
    });
  });

  it('persists the default locale cookie before password reset submissions', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://mogged.games',
          pathname: '/reset-password/example-token',
        },
      },
    });

    const { resetPassword } = await import('./client');

    await resetPassword({
      newPassword: 'new-secret',
      token: 'example-token',
    });

    expect(document.cookie).toContain('NEXT_LOCALE=en');
    expect(mocks.resetPasswordMock).toHaveBeenCalledWith({
      newPassword: 'new-secret',
      token: 'example-token',
    });
  });

  it('persists the localized route cookie before in-session password changes', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://mogged.games',
          pathname: '/zh/settings/security',
        },
      },
    });

    const { changePassword } = await import('./client');

    await changePassword({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
      revokeOtherSessions: true,
    });

    expect(document.cookie).toContain('NEXT_LOCALE=zh');
    expect(mocks.changePasswordMock).toHaveBeenCalledWith({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
      revokeOtherSessions: true,
    });
  });
});
