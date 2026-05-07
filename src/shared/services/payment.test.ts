import { describe, expect, it, vi } from 'vitest';

import { getPaymentServiceWithConfigs } from './payment';

vi.mock('server-only', () => ({}));

describe('payment service registration', () => {
  it('skips incomplete optional providers even when their enabled flags are true', () => {
    const service = getPaymentServiceWithConfigs({
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
      default_payment_provider: 'paypal',
    } as any);

    expect(service.getProviderNames()).toEqual(['stripe']);
    expect(service.getDefaultProvider()?.name).toBe('stripe');
  });
});
