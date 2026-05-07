export const publicSettingNames = [
  'initial_credits_amount',
  'daily_claim_credits_amount',
  'email_auth_enabled',
  'google_auth_enabled',
  'google_one_tap_enabled',
  'google_client_id',
  'enable_ads_tracking',
  'google_analytics_id',
  'google_ads_conversion_id',
  'google_ads_signup_label',
  'google_ads_begin_checkout_label',
  'google_ads_purchase_label',
  'google_ads_purchase_tracking_mode',
  'github_auth_enabled',
  'github_client_id',
  'select_payment_enabled',
  'default_payment_provider',
  'stripe_enabled',
  'stripe_publishable_key',
  'creem_enabled',
  'paypal_enabled',
  'affonso_enabled',
  'promotekit_enabled',
  'crisp_enabled',
  'tawk_enabled',
] as const;

const publicSettingNameSet = new Set<string>(publicSettingNames);

export function isPublicSettingName(key: string) {
  return publicSettingNameSet.has(key);
}
