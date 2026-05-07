type EmailProviderConfigs = Record<string, unknown>;

function hasNonEmptyConfigValue(configs: EmailProviderConfigs, key: string) {
  return typeof configs[key] === 'string' && configs[key].trim().length > 0;
}

export function hasZeptoMailProviderConfig(configs: EmailProviderConfigs) {
  return (
    hasNonEmptyConfigValue(configs, 'zeptomail_api_key') ||
    hasNonEmptyConfigValue(configs, 'zeptomail_smtp_api_key')
  );
}

export function hasResendProviderConfig(configs: EmailProviderConfigs) {
  return hasNonEmptyConfigValue(configs, 'resend_api_key');
}

export function hasEmailProviderConfigured(configs: EmailProviderConfigs) {
  return (
    hasZeptoMailProviderConfig(configs) || hasResendProviderConfig(configs)
  );
}
