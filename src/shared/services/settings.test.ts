import { describe, expect, it } from 'vitest';

import { publicSettingNames } from '@/shared/lib/public-setting-names';

import { getSettings } from './settings';

describe('publicSettingNames', () => {
  it('does not expose internal seedance routing controls to the client', () => {
    expect(publicSettingNames).not.toContain('seedance_default_provider');
    expect(publicSettingNames).not.toContain('seedance_provider_mode');
    expect(publicSettingNames).not.toContain('seedance_kie_enabled');
  });

  it('exposes the Stripe publishable key for embedded checkout initialization', () => {
    expect(publicSettingNames).toContain('stripe_publishable_key');
  });

  it('removes stale Seedance routing controls from the admin settings form', async () => {
    const settings = await getSettings();
    const names = settings.map((setting) => setting.name);

    expect(names).not.toContain('seedance_default_provider');
    expect(names).not.toContain('seedance_provider_mode');
    expect(names).toContain('seedance_kie_enabled');
  });

  it('defaults the admin KIE runtime switch to enabled', async () => {
    const settings = await getSettings();
    const kieToggle = settings.find(
      (setting) => setting.name === 'seedance_kie_enabled'
    );

    expect(kieToggle?.value).toBe('true');
  });
});
