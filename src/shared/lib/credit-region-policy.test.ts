import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const originalRestrictedCountries = process.env.RESTRICTED_CREDIT_COUNTRIES;

describe('credit region policy', () => {
  afterEach(async () => {
    if (originalRestrictedCountries === undefined) {
      delete process.env.RESTRICTED_CREDIT_COUNTRIES;
    } else {
      process.env.RESTRICTED_CREDIT_COUNTRIES = originalRestrictedCountries;
    }

    const { resetRestrictedCountriesForTesting } = await import(
      './credit-region-policy'
    );
    resetRestrictedCountriesForTesting();
    vi.resetModules();
  });

  it('keeps full credit allowances for unrestricted countries', async () => {
    const { resolveCreditRegionPolicy } = await import(
      './credit-region-policy'
    );

    expect(
      resolveCreditRegionPolicy({
        countryCode: 'US',
        signupBonusCredits: 150,
        dailyClaimCredits: 15,
        guestQuotaCredits: 100,
      })
    ).toEqual({
      countryCode: 'US',
      restricted: false,
      signupBonusCredits: 150,
      dailyClaimCredits: 15,
      guestQuotaCredits: 100,
      guestGenerationEnabled: true,
    });
  });

  it('reduces restricted countries to activation-only credits and disables guest generation', async () => {
    const { resolveCreditRegionPolicy } = await import(
      './credit-region-policy'
    );

    expect(
      resolveCreditRegionPolicy({
        countryCode: 'IN',
        signupBonusCredits: 150,
        dailyClaimCredits: 15,
        guestQuotaCredits: 100,
      })
    ).toEqual({
      countryCode: 'IN',
      restricted: true,
      signupBonusCredits: 1,
      dailyClaimCredits: 1,
      guestQuotaCredits: 0,
      guestGenerationEnabled: false,
    });
  });

  it('allows disabling the restricted country list with an empty env value', async () => {
    process.env.RESTRICTED_CREDIT_COUNTRIES = '';
    const { resolveCreditRegionPolicy } = await import(
      './credit-region-policy'
    );

    expect(
      resolveCreditRegionPolicy({
        countryCode: 'IN',
        signupBonusCredits: 150,
        dailyClaimCredits: 15,
        guestQuotaCredits: 100,
      })
    ).toMatchObject({
      restricted: false,
      signupBonusCredits: 150,
      dailyClaimCredits: 15,
      guestQuotaCredits: 100,
      guestGenerationEnabled: true,
    });
  });
});
