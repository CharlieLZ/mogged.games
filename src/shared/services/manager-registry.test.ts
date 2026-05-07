import { describe, expect, it, vi } from 'vitest';

import {
  applyManagerRegistrations,
  hasConfigValues,
  hasEnabledConfig,
  whenConfigs,
} from './manager-registry';

describe('manager registry', () => {
  it('applies only registrations whose conditions match', () => {
    const manager = {
      registered: [] as string[],
    };

    const result = applyManagerRegistrations(
      manager,
      {
        alpha: '1',
        beta_enabled: 'true',
        beta_id: 'beta-1',
      },
      [
        whenConfigs(hasConfigValues('alpha'), (nextManager) => {
          nextManager.registered.push('alpha');
        }),
        whenConfigs(hasConfigValues('missing'), (nextManager) => {
          nextManager.registered.push('missing');
        }),
        whenConfigs(
          hasEnabledConfig('beta_enabled', 'beta_id'),
          (nextManager) => {
            nextManager.registered.push('beta');
          }
        ),
      ]
    );

    expect(result).toBe(manager);
    expect(manager.registered).toEqual(['alpha', 'beta']);
  });

  it('skips disabled feature registrations', () => {
    const register = vi.fn();

    applyManagerRegistrations(
      {},
      {
        feature_enabled: 'false',
        feature_id: 'feature-1',
      },
      [whenConfigs(hasEnabledConfig('feature_enabled', 'feature_id'), register)]
    );

    expect(register).not.toHaveBeenCalled();
  });
});
