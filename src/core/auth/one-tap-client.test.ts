import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthClientMock: vi.fn(),
  persistAuthLocalePreferenceMock: vi.fn(),
  oneTapMock: vi.fn(),
  infoMock: vi.fn(),
  warnMock: vi.fn(),
}));

vi.mock('./client', () => ({
  getAuthClient: mocks.getAuthClientMock,
  persistAuthLocalePreference: mocks.persistAuthLocalePreferenceMock,
}));

import { triggerGoogleOneTap } from './one-tap-client';

describe('triggerGoogleOneTap', () => {
  beforeEach(() => {
    mocks.getAuthClientMock.mockReset();
    mocks.persistAuthLocalePreferenceMock.mockReset();
    mocks.oneTapMock.mockReset();
    mocks.infoMock.mockReset();
    mocks.warnMock.mockReset();

    vi.spyOn(console, 'info').mockImplementation(mocks.infoMock);
    vi.spyOn(console, 'warn').mockImplementation(mocks.warnMock);
  });

  it('calls the better-auth one tap client plugin without a hard redirect', async () => {
    const onSuccess = vi.fn();
    const onPromptNotification = vi.fn();

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        document: {},
        location: {
          origin: 'https://mogged.games',
        },
      },
    });

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {},
    });

    mocks.oneTapMock.mockImplementation(async (options) => {
      await options.fetchOptions.onSuccess();
    });
    mocks.getAuthClientMock.mockReturnValue({
      oneTap: mocks.oneTapMock,
    });

    expect(
      await triggerGoogleOneTap({
        configs: {
          google_auth_enabled: 'true',
          google_one_tap_enabled: 'true',
          google_client_id: 'google-client-id',
        },
        onSuccess,
        onPromptNotification,
      })
    ).toBe(true);

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(mocks.oneTapMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'signin',
        autoSelect: false,
        cancelOnTapOutside: false,
        onPromptNotification: expect.any(Function),
        fetchOptions: expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      })
    );
    expect(mocks.persistAuthLocalePreferenceMock).toHaveBeenCalledTimes(1);
    const oneTapOptions = mocks.oneTapMock.mock.calls[0]?.[0];
    oneTapOptions?.onPromptNotification?.({
      getMomentType: () => 'skipped',
    });
    expect(onPromptNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        getMomentType: expect.any(Function),
      })
    );
  });

  it('logs a clear error when the one tap plugin is unavailable', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        document: {},
        location: {
          origin: 'https://mogged.games',
        },
      },
    });

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {},
    });

    mocks.getAuthClientMock.mockReturnValue({});

    expect(
      await triggerGoogleOneTap({
        configs: {
          google_auth_enabled: 'true',
          google_one_tap_enabled: 'true',
          google_client_id: 'google-client-id',
        },
      })
    ).toBe(false);

    expect(mocks.warnMock).toHaveBeenCalledWith(
      '[auth][one-tap] failed',
      expect.objectContaining({
        step: 'initialize',
      })
    );
  });

  it('skips one tap on local loopback origins', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        document: {},
        location: {
          origin: 'http://127.0.0.1:3000',
        },
      },
    });

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {},
    });

    expect(
      await triggerGoogleOneTap({
        configs: {
          google_auth_enabled: 'true',
          google_one_tap_enabled: 'true',
          google_client_id: 'google-client-id',
        },
      })
    ).toBe(false);

    expect(mocks.getAuthClientMock).not.toHaveBeenCalled();
    expect(mocks.infoMock).toHaveBeenCalledWith(
      '[auth][one-tap] skipped on unsupported origin',
      expect.objectContaining({
        origin: 'http://127.0.0.1:3000',
      })
    );
  });
});
