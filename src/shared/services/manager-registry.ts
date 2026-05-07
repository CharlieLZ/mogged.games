import type { Configs } from '@/shared/models/config';

export type ManagerRegistration<TManager> = (
  manager: TManager,
  configs: Configs
) => void;

export function applyManagerRegistrations<TManager>(
  manager: TManager,
  configs: Configs,
  registrations: readonly ManagerRegistration<TManager>[]
) {
  for (const registration of registrations) {
    registration(manager, configs);
  }

  return manager;
}

export function whenConfigs<TManager>(
  predicate: (configs: Configs) => boolean,
  registration: ManagerRegistration<TManager>
): ManagerRegistration<TManager> {
  return (manager, configs) => {
    if (!predicate(configs)) {
      return;
    }

    registration(manager, configs);
  };
}

export function hasConfigValues(...keys: string[]) {
  return (configs: Configs) => keys.every((key) => Boolean(configs[key]));
}

export function hasEnabledConfig(flagKey: string, ...keys: string[]) {
  return (configs: Configs) =>
    configs[flagKey] === 'true' && keys.every((key) => Boolean(configs[key]));
}
