#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = process.env.CF_VARS_ENV_FILE || path.join(PROJECT_DIR, '.env');
const DRY_RUN = process.env.CF_VARS_DRY_RUN === '1';
const WORKER_NAME =
  process.env.CF_VARS_WORKER_NAME || readWorkerName(path.join(PROJECT_DIR, 'wrangler.jsonc'));
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const API_TOKEN =
  process.env.CLOUDFLARE_WORKER_SECRETS_API_TOKEN ||
  process.env.CLOUDFLARE_API_TOKEN ||
  '';

const PLACEHOLDER_VALUES = new Set([
  '',
  'replace',
  'placeholder',
  'changeme',
  'todo',
  'xxx',
  '替换',
  'pk_xxx',
  'sk_xxx',
  'whsec_xxx',
  'paypal_xxx',
  'paypal_secret',
  'creem_xxx',
  'prod_xxx',
  'prod_xxx1',
  'prod_xxx2',
  'prod_xxx3',
  'prod_xxx4',
  'prod_xxx5',
  'prod_xxx6',
  'prod_xxx7',
  'prod_xxx8',
  'prod_xxx9',
  'promo_xxx',
]);

const VAR_KEYS = [
  'AFFONSO_COOKIE_DURATION',
  'AFFONSO_ENABLED',
  'AUTH_URL',
  'CLARITY_ID',
  'CREEM_ENABLED',
  'CREEM_ENVIRONMENT',
  'CREEM_PRODUCT_IDS',
  'CRISP_ENABLED',
  'CRISP_WEBSITE_ID',
  'DAILY_CLAIM_CREDITS_AMOUNT',
  'DATABASE_PROVIDER',
  'DB_MAX_CONNECTIONS',
  'DB_SINGLETON_ENABLED',
  'DEFAULT_PAYMENT_PROVIDER',
  'EMAIL_AUTH_ENABLED',
  'ADMIN_NOTIFICATION_EMAIL',
  'CONTACT_NOTIFICATION_EMAIL',
  'GITHUB_AUTH_ENABLED',
  'GITHUB_CLIENT_ID',
  'GOOGLE_ADS_BEGIN_CHECKOUT_LABEL',
  'GOOGLE_ADS_CONVERSION_ID',
  'GOOGLE_ADS_PURCHASE_LABEL',
  'GOOGLE_ADS_SIGNUP_LABEL',
  'GOOGLE_ANALYTICS_ID',
  'GOOGLE_AUTH_ENABLED',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_ONE_TAP_ENABLED',
  'INITIAL_CREDITS_ENABLED',
  'INITIAL_CREDITS_AMOUNT',
  'INITIAL_CREDITS_VALID_DAYS',
  'INITIAL_CREDITS_DESCRIPTION',
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_APPEARANCE',
  'NEXT_PUBLIC_DEFAULT_LOCALE',
  'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
  'NEXT_PUBLIC_DOMAIN',
  'NEXT_PUBLIC_EMAIL',
  'NEXT_PUBLIC_PLAUSIBLE_DOMAIN',
  'NEXT_PUBLIC_PLAUSIBLE_SCRIPT',
  'NEXT_PUBLIC_PLAUSIBLE_URL',
  'NEXT_PUBLIC_REPOSITORY_URL',
  'NEXT_PUBLIC_THEME',
  'OPENPANEL_CLIENT_ID',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_ENABLED',
  'PAYPAL_ENVIRONMENT',
  'PROMOTEKIT_ENABLED',
  'PROMOTEKIT_ID',
  'RESEND_SENDER_EMAIL',
  'SELECT_PAYMENT_ENABLED',
  'STRIPE_ENABLED',
  'STRIPE_PUBLISHABLE_KEY',
  'TAWK_ENABLED',
  'TAWK_PROPERTY_ID',
  'TAWK_WIDGET_ID',
  'ZEPTOMAIL_SENDER_EMAIL',
  'ZEPTOMAIL_SMTP_HOST',
  'ZEPTOMAIL_SMTP_PORT',
];

const SETTINGS_FIELDS = [
  'annotations',
  'bindings',
  'compatibility_date',
  'compatibility_flags',
  'keep_bindings',
  'limits',
  'logpush',
  'observability',
  'placement',
  'tags',
  'tail_consumers',
  'usage_model',
];

function readWorkerName(configPath) {
  if (!fs.existsSync(configPath)) {
    return '';
  }

  const source = fs.readFileSync(configPath, 'utf8');
  const match = source.match(/"name"\s*:\s*"([^"]+)"/);

  return match?.[1]?.trim() || '';
}

function isPlaceholderValue(value) {
  if (!value) {
    return true;
  }

  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  if (PLACEHOLDER_VALUES.has(normalized) || PLACEHOLDER_VALUES.has(normalized.toLowerCase())) {
    return true;
  }

  const lower = normalized.toLowerCase();

  return (
    lower.startsWith('your') ||
    lower.includes('_xxx') ||
    lower.includes('-xxx')
  );
}

function sanitizeAnnotations(annotations) {
  if (!annotations || typeof annotations !== 'object') {
    return undefined;
  }

  const next = { ...annotations };
  delete next['workers/triggered_by'];

  return Object.keys(next).length > 0 ? next : undefined;
}

function buildSettingsPayload(currentSettings, nextBindings) {
  const payload = {};

  for (const field of SETTINGS_FIELDS) {
    if (!(field in currentSettings)) {
      continue;
    }

    if (field === 'annotations') {
      const annotations = sanitizeAnnotations(currentSettings.annotations);
      if (annotations) {
        payload.annotations = annotations;
      }
      continue;
    }

    if (field === 'bindings') {
      payload.bindings = nextBindings;
      continue;
    }

    payload[field] = currentSettings[field];
  }

  if (!('bindings' in payload)) {
    payload.bindings = nextBindings;
  }

  return payload;
}

async function fetchWorkerSettings() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/settings`,
    {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    }
  );

  const body = await response.json();

  if (!response.ok || !body?.success) {
    const errorText = JSON.stringify(body?.errors || body, null, 2);
    throw new Error(`failed to fetch worker settings: ${errorText}`);
  }

  return body.result || {};
}

async function patchWorkerSettings(settings) {
  const form = new FormData();
  form.set(
    'settings',
    new Blob([JSON.stringify(settings)], { type: 'application/json' }),
    'settings.json'
  );

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/settings`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: form,
    }
  );

  const body = await response.json();

  if (!response.ok || !body?.success) {
    const errorText = JSON.stringify(body?.errors || body, null, 2);
    throw new Error(`failed to patch worker settings: ${errorText}`);
  }
}

async function main() {
  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(`missing env file: ${ENV_FILE}`);
  }

  if (!API_TOKEN) {
    throw new Error(
      'missing CLOUDFLARE_WORKER_SECRETS_API_TOKEN or CLOUDFLARE_API_TOKEN'
    );
  }

  if (!ACCOUNT_ID) {
    throw new Error('missing CLOUDFLARE_ACCOUNT_ID');
  }

  if (!WORKER_NAME) {
    throw new Error('missing worker name; set CF_VARS_WORKER_NAME');
  }

  const env = parse(fs.readFileSync(ENV_FILE, 'utf8'));
  const desiredBindings = VAR_KEYS.filter((key) => !isPlaceholderValue(env[key])).map((key) => ({
    name: key,
    text: env[key].trim(),
    type: 'plain_text',
  }));

  const currentSettings = await fetchWorkerSettings();
  const currentBindings = Array.isArray(currentSettings.bindings) ? currentSettings.bindings : [];
  const bindingNames = new Set(currentBindings.map((binding) => binding.name));
  const missingBindings = desiredBindings.filter((binding) => !bindingNames.has(binding.name));

  console.log(`Reading plain-text vars from ${ENV_FILE}...`);
  console.log(`Worker name: ${WORKER_NAME}`);

  if (missingBindings.length === 0) {
    console.log('No missing plain-text vars to upload.');
    return;
  }

  console.log(`Missing vars: ${missingBindings.length}`);
  for (const binding of missingBindings) {
    console.log(` - ${binding.name}`);
  }

  if (DRY_RUN) {
    console.log('Dry run enabled; no changes uploaded.');
    return;
  }

  const nextBindings = [...currentBindings, ...missingBindings];
  const patchPayload = buildSettingsPayload(currentSettings, nextBindings);

  await patchWorkerSettings(patchPayload);
  console.log(`Uploaded ${missingBindings.length} plain-text vars.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
