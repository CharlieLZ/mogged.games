// Load .env files for scripts (tsx/ts-node) - but NOT in Edge Runtime or browser
// This ensures scripts can read DATABASE_URL and other env vars
// Check for real Node.js environment by looking at global 'process' properties
if (
  typeof process !== 'undefined' &&
  typeof process.cwd === 'function' &&
  typeof require === 'function' &&
  !process.env.NEXT_RUNTIME // Skip if in Next.js runtime (already loaded)
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.development' });
    dotenv.config({ path: '.env', override: false });
  } catch {
    // Silently fail - dotenv might not be available in some environments
  }
}

export type ConfigMap = Record<string, string>;

const normalizeEnvValue = (value: string | undefined | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return value.trim();
};

const settingEnvKeys = [
  'initial_credits_enabled',
  'initial_credits_amount',
  'initial_credits_valid_days',
  'initial_credits_description',
  'daily_claim_credits_amount',
  'daily_claim_credits_valid_days',
  'email_auth_enabled',
  'google_auth_enabled',
  'google_one_tap_enabled',
  'google_client_id',
  'google_client_secret',
  'github_auth_enabled',
  'github_client_id',
  'github_client_secret',
  'select_payment_enabled',
  'default_payment_provider',
  'stripe_enabled',
  'stripe_publishable_key',
  'stripe_secret_key',
  'stripe_signing_secret',
  'stripe_payment_methods',
  'stripe_promotion_codes',
  'stripe_allow_promotion_codes',
  'creem_enabled',
  'creem_environment',
  'creem_api_key',
  'creem_signing_secret',
  'creem_product_ids',
  'paypal_enabled',
  'paypal_environment',
  'paypal_client_id',
  'paypal_client_secret',
  'paypal_webhook_id',
  'enable_ads_tracking',
  'google_analytics_id',
  'google_ads_conversion_id',
  'google_ads_signup_label',
  'google_ads_begin_checkout_label',
  'google_ads_purchase_label',
  'google_ads_purchase_tracking_mode',
  'google_ads_developer_token',
  'google_ads_client_id',
  'google_ads_client_secret',
  'google_ads_refresh_token',
  'google_ads_login_customer_id',
  'google_ads_customer_id',
  'google_ads_purchase_upload_conversion_action_id',
  'clarity_id',
  'plausible_domain',
  'plausible_src',
  'openpanel_client_id',
  'vercel_analytics_enabled',
  'resend_api_key',
  'resend_sender_email',
  'zeptomail_api_key',
  'zeptomail_api_url',
  'zeptomail_smtp_api_key',
  'zeptomail_sender_email',
  'zeptomail_smtp_host',
  'zeptomail_smtp_port',
  'r2_account_id',
  'r2_access_key',
  'r2_secret_key',
  'r2_bucket_name',
  'r2_endpoint',
  'r2_domain',
  'openrouter_api_key',
  'volcengine_api_key',
  'apixo_api_key',
  'apixo_api_base_url',
  'apimart_api_key',
  'apimart_api_base_url',
  'evolink_api_key',
  'evolink_api_base_url',
  'seedance_kie_enabled',
  'replicate_api_token',
  'fal_api_key',
  'fal_api_base_url',
  'kie_api_key',
  'kie_api_key_free',
  'kie_api_key_paid',
  'kie_api_base_url',
  'adsense_code',
  'affonso_enabled',
  'affonso_id',
  'affonso_cookie_duration',
  'promotekit_enabled',
  'promotekit_id',
  'crisp_enabled',
  'crisp_website_id',
  'tawk_enabled',
  'tawk_property_id',
  'tawk_widget_id',
];

const settingEnvFallbackKeys: Record<string, string[]> = {
  enable_ads_tracking: ['NEXT_PUBLIC_ENABLE_ADS_TRACKING'],
  google_analytics_id: ['NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'],
  google_ads_conversion_id: ['NEXT_PUBLIC_GOOGLE_ADS_IDS'],
  google_ads_signup_label: ['NEXT_PUBLIC_GADS_SIGNUP_LABEL'],
  google_ads_begin_checkout_label: ['NEXT_PUBLIC_GADS_BEGIN_CHECKOUT_LABEL'],
  google_ads_purchase_label: ['NEXT_PUBLIC_GADS_PURCHASE_LABEL'],
  google_ads_purchase_tracking_mode: [
    'NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_TRACKING_MODE',
  ],
  clarity_id: ['NEXT_PUBLIC_CLARITY_ID'],
  plausible_domain: ['NEXT_PUBLIC_PLAUSIBLE_DOMAIN'],
  plausible_src: ['NEXT_PUBLIC_PLAUSIBLE_SCRIPT'],
};

const loadSettingsEnv = (base: ConfigMap = {}): ConfigMap => {
  const envs: ConfigMap = {};

  for (const key of settingEnvKeys) {
    const envKeyCandidates = [
      key.toUpperCase(),
      key,
      ...(settingEnvFallbackKeys[key] || []),
    ];
    const envValue = envKeyCandidates
      .map((envKey) => normalizeEnvValue(process.env[envKey]))
      .find((value) => value !== undefined && value !== null && value !== '');

    if (envValue !== undefined && envValue !== null && envValue !== '') {
      envs[key] = envValue;
    } else if (!(key in base)) {
      envs[key] = '';
    }
  }

  return envs;
};

const baseEnvConfigs: ConfigMap = {
  app_url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://mogged.games',
  app_name: process.env.NEXT_PUBLIC_APP_NAME ?? 'mogged',
  indexnow_key:
    process.env.INDEXNOW_KEY ?? process.env.NEXT_PUBLIC_INDEXNOW_KEY ?? '',
  theme: process.env.NEXT_PUBLIC_THEME ?? 'default',
  appearance: process.env.NEXT_PUBLIC_APPEARANCE ?? 'system',
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en',
  default_locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en',
  // `plausible_*` are the internal canonical config keys used by services and
  // DB-backed runtime settings. By default they map from the public
  // `NEXT_PUBLIC_*` env names, so most deployments only need to maintain the
  // public pair unless they intentionally want a server-side override.
  plausible_domain:
    process.env.PLAUSIBLE_DOMAIN ?? process.env.NEXT_PUBLIC_DOMAIN ?? '',
  plausible_src:
    process.env.PLAUSIBLE_SRC ??
    process.env.NEXT_PUBLIC_PLAUSIBLE_URL ??
    process.env.NEXT_PUBLIC_Plausible_URL ??
    '',
  database_url: process.env.DATABASE_URL ?? '',
  database_provider: process.env.DATABASE_PROVIDER ?? 'postgresql',
  db_singleton_enabled: process.env.DB_SINGLETON_ENABLED || 'false',
  db_max_connections: process.env.DB_MAX_CONNECTIONS || '1',
  db_connect_timeout: process.env.DB_CONNECT_TIMEOUT || '10',
  db_connect_max_retries: process.env.DB_CONNECT_MAX_RETRIES || '2',
  // Keep auth base URL explicit. Falling back to the public site URL makes
  // local auth flows accidentally talk to production.
  auth_url: process.env.AUTH_URL ?? '',
  auth_secret: process.env.AUTH_SECRET ?? '', // openssl rand -base64 32
  openrouter_api_key: process.env.OPENROUTER_API_KEY ?? '',
  volcengine_api_key:
    process.env.VOLCENGINE_API_KEY ?? process.env.ARK_API_KEY ?? '',
  apixo_api_key: process.env.APIXO_API_KEY ?? '',
  apixo_api_base_url: process.env.APIXO_API_BASE_URL ?? 'https://api.apixo.ai',
  apimart_api_key: process.env.APIMART_API_KEY ?? '',
  apimart_api_base_url:
    process.env.APIMART_API_BASE_URL ?? 'https://api.apimart.ai',
  evolink_api_key: process.env.EVOLINK_API_KEY ?? '',
  evolink_api_base_url:
    process.env.EVOLINK_API_BASE_URL ?? 'https://api.evolink.ai',
  seedance_kie_enabled: process.env.SEEDANCE_KIE_ENABLED ?? 'true',
  replicate_api_token: process.env.REPLICATE_API_TOKEN ?? '',
  fal_api_key: process.env.FAL_API_KEY ?? '',
  fal_api_base_url: process.env.FAL_API_BASE_URL ?? '',
  kie_api_key: process.env.KIE_API_KEY_TEST ?? '',
  kie_api_key_free: process.env.KIE_API_KEY_FREE ?? '',
  kie_api_key_paid: process.env.KIE_API_KEY_PAID ?? '',
  kie_api_base_url: process.env.KIE_API_BASE_URL ?? 'https://api.kie.ai',
  restricted_credit_countries:
    process.env.RESTRICTED_CREDIT_COUNTRIES ?? '',
  // Cloudflare R2 storage
  r2_account_id: process.env.R2_ACCOUNT_ID ?? '',
  r2_access_key: process.env.R2_ACCESS_KEY ?? '',
  r2_secret_key: process.env.R2_SECRET_KEY ?? '',
  r2_bucket_name: process.env.R2_BUCKET_NAME ?? '',
  r2_endpoint: process.env.R2_ENDPOINT ?? '',
  r2_domain: process.env.R2_DOMAIN ?? '',
};

export const envConfigs: ConfigMap = {
  ...baseEnvConfigs,
  ...loadSettingsEnv(baseEnvConfigs),
};
