import { beforeEach, describe, expect, it, vi } from 'vitest';

import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { resetOptionalDbCooldownForTest } from '@/shared/lib/optional-db';

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock('@/core/db', () => ({
  db: vi.fn(),
}));

vi.mock('@/config/db/schema', () => ({
  config: {},
}));

vi.mock('@/config', () => ({
  envConfigs: {
    database_url: '',
    github_auth_enabled: 'true',
    github_client_id: 'github-client-id',
    github_client_secret: 'github-client-secret',
    google_auth_enabled: 'false',
    google_client_id: '',
    email_auth_enabled: 'true',
    stripe_enabled: 'true',
    stripe_publishable_key: 'pk_test_123',
    stripe_secret_key: 'sk_test_123',
    stripe_signing_secret: 'whsec_test_123',
    paypal_enabled: 'true',
    paypal_client_id: 'paypal-client-id',
    paypal_client_secret: '',
    paypal_webhook_id: '',
    creem_enabled: 'true',
    creem_api_key: '',
    creem_signing_secret: '',
    creem_product_ids: '',
  },
}));

describe('getPublicConfigs', () => {
  beforeEach(() => {
    vi.mocked(db).mockReset();
    envConfigs.database_url = '';
    envConfigs.github_auth_enabled = 'true';
    envConfigs.github_client_id = 'github-client-id';
    envConfigs.github_client_secret = 'github-client-secret';
    envConfigs.google_auth_enabled = 'false';
    envConfigs.google_one_tap_enabled = '';
    envConfigs.google_client_id = '';
    envConfigs.google_client_secret = '';
    envConfigs.email_auth_enabled = 'true';
    envConfigs.stripe_enabled = 'true';
    envConfigs.stripe_publishable_key = 'pk_test_123';
    envConfigs.stripe_secret_key = 'sk_test_123';
    envConfigs.stripe_signing_secret = 'whsec_test_123';
    envConfigs.paypal_enabled = 'true';
    envConfigs.paypal_client_id = 'paypal-client-id';
    envConfigs.paypal_client_secret = '';
    envConfigs.paypal_webhook_id = '';
    envConfigs.creem_enabled = 'true';
    envConfigs.creem_api_key = '';
    envConfigs.creem_signing_secret = '';
    envConfigs.creem_product_ids = '';
    resetOptionalDbCooldownForTest();
  });

  it('includes the github client id while keeping the secret server-only', async () => {
    const { getPublicConfigs } = await import('./config');

    const configs = await getPublicConfigs();

    expect(configs.github_client_id).toBe('github-client-id');
    expect(configs).not.toHaveProperty('github_client_secret');
  });

  it('derives Google auth public flags from complete runtime credentials', async () => {
    envConfigs.google_auth_enabled = '';
    envConfigs.google_one_tap_enabled = '';
    envConfigs.google_client_id = 'google-client-id';
    envConfigs.google_client_secret = 'google-client-secret';

    const { getPublicConfigs } = await import('./config');

    const configs = await getPublicConfigs();

    expect(configs.google_auth_enabled).toBe('true');
    expect(configs.google_one_tap_enabled).toBe('true');
    expect(configs.google_client_id).toBe('google-client-id');
    expect(configs).not.toHaveProperty('google_client_secret');
  });

  it('suppresses incomplete payment providers from public configs', async () => {
    const { getPublicConfigs } = await import('./config');

    const configs = await getPublicConfigs();

    expect(configs.stripe_enabled).toBe('true');
    expect(configs.paypal_enabled).toBe('false');
    expect(configs.creem_enabled).toBe('false');
  });

  it('falls back to env configs when the config table is missing', async () => {
    envConfigs.database_url = 'postgres://example.com/db';

    vi.mocked(db).mockReturnValue({
      select: () => ({
        from: vi.fn().mockRejectedValue(
          Object.assign(new Error('Failed query'), {
            cause: {
              code: '42P01',
            },
          })
        ),
      }),
    } as unknown as ReturnType<typeof db>);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getConfigs } = await import('./config');

    await expect(getConfigs()).resolves.toEqual({});
    expect(warnSpy).toHaveBeenCalledWith(
      '[config] config table is unavailable, using env configs only'
    );
  });

  it('enters cooldown after connectivity failures so optional config reads stop retrying immediately', async () => {
    envConfigs.database_url = 'postgres://example.com/db';

    const from = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('Failed query'), {
          cause: {
            code: 'CONNECT_TIMEOUT',
          },
        })
      );

    vi.mocked(db).mockReturnValue({
      select: () => ({
        from,
      }),
    } as unknown as ReturnType<typeof db>);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getConfigs } = await import('./config');

    await expect(getConfigs()).resolves.toEqual({});
    await expect(getConfigs()).resolves.toEqual({});

    expect(from).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[optional-db] optional database access failed, entering cooldown',
      expect.objectContaining({
        scope: 'config/getConfigs',
      })
    );
  });
});
