import { describe, expect, it } from 'vitest';

import {
  hasEmailProviderConfigured,
  hasResendProviderConfig,
  hasZeptoMailProviderConfig,
} from './email-config';

describe('email config', () => {
  it('treats whitespace-only values as missing provider config', () => {
    expect(
      hasZeptoMailProviderConfig({
        zeptomail_smtp_api_key: '   ',
      })
    ).toBe(false);
    expect(
      hasResendProviderConfig({
        resend_api_key: '\n',
      })
    ).toBe(false);
  });

  it('enables email delivery when either provider is configured', () => {
    expect(
      hasEmailProviderConfigured({
        resend_api_key: 're_123',
      })
    ).toBe(true);
    expect(
      hasEmailProviderConfigured({
        zeptomail_smtp_api_key: 'zepto_123',
      })
    ).toBe(true);
    expect(
      hasEmailProviderConfigured({
        zeptomail_api_key: 'zepto_api_123',
      })
    ).toBe(true);
    expect(hasEmailProviderConfigured({})).toBe(false);
  });
});
