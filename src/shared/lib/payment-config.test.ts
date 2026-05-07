import { describe, expect, it, vi } from 'vitest';

import {
  parsePaymentMethodList,
  parseStringMapConfig,
} from './payment-config';

describe('payment config parsers', () => {
  it('accepts comma-separated payment method lists', () => {
    expect(parsePaymentMethodList('card,wechat_pay, alipay')).toEqual([
      'card',
      'wechat_pay',
      'alipay',
    ]);
  });

  it('accepts json payment method arrays', () => {
    expect(parsePaymentMethodList('["card","wechat_pay"]')).toEqual([
      'card',
      'wechat_pay',
    ]);
  });

  it('accepts escaped json maps', () => {
    expect(parseStringMapConfig('{\\"starter\\":\\"promo_xxx\\"}')).toEqual({
      starter: 'promo_xxx',
    });
  });

  it('returns undefined for invalid map payloads', () => {
    expect(parseStringMapConfig('not-json')).toBeUndefined();
  });

  it('logs the config key once when a json-looking map payload is invalid', () => {
    const logger = {
      warn: vi.fn(),
    };

    expect(
      parseStringMapConfig('{bad-json}', {
        configKey: 'stripe_promotion_codes',
        logger,
      })
    ).toBeUndefined();
    expect(
      parseStringMapConfig('{bad-json}', {
        configKey: 'stripe_promotion_codes',
        logger,
      })
    ).toBeUndefined();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      '[payment-config] invalid JSON map config',
      expect.objectContaining({
        configKey: 'stripe_promotion_codes',
        length: 10,
        reason: expect.stringContaining('JSON'),
      })
    );
  });
});
