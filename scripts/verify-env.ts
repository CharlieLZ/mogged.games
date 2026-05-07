import { parseStringMapConfig } from '@/shared/lib/payment-config';
import { preloadLocalEnvFiles } from './lib/local-env';

type CheckResult = {
  errors: string[];
  warnings: string[];
};

type EnvConfigMap = Record<string, string>;

const PLACEHOLDER_VALUES = new Set([
  '',
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

function isMissing(value?: string) {
  return !value || PLACEHOLDER_VALUES.has(value.trim());
}

function getOrigin(value?: string) {
  if (!value) {
    return '';
  }

  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  try {
    return new URL(normalized).origin;
  } catch {
    return normalized;
  }
}

function getRawEnv(name: string) {
  return process.env[name] ?? '';
}

function isValidTimeZone(value?: string) {
  if (!value) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', {
      timeZone: value,
    }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function addOptionalServiceWarning(
  result: CheckResult,
  enabled: boolean,
  serviceName: string,
  fields: Array<[label: string, value?: string]>
) {
  if (!enabled) {
    return;
  }

  const missingFields = fields
    .filter(([, value]) => isMissing(value))
    .map(([label]) => label);

  if (missingFields.length > 0) {
    result.warnings.push(
      `${serviceName} 已启用，但这些配置看起来还是占位值：${missingFields.join('、')}`
    );
  }
}

function addEnabledServiceError(
  result: CheckResult,
  enabled: boolean,
  serviceName: string,
  fields: Array<[label: string, value?: string]>
) {
  if (!enabled) {
    return;
  }

  const missingFields = fields
    .filter(([, value]) => isMissing(value))
    .map(([label]) => label);

  if (missingFields.length > 0) {
    result.errors.push(
      `${serviceName} 已启用，但这些配置缺失或仍是占位值：${missingFields.join('、')}`
    );
  }
}

const quietLogger = {
  warn() {},
};

function addJsonMapConfigError(
  result: CheckResult,
  label: string,
  value: string | undefined,
  message: string
) {
  if (isMissing(value)) {
    return;
  }

  const parsed = parseStringMapConfig(value, {
    configKey: label.toLowerCase(),
    logger: quietLogger,
  });

  if (!parsed || Object.keys(parsed).length === 0) {
    result.errors.push(message);
  }
}

function addJsonMapConfigWarning(
  result: CheckResult,
  label: string,
  value: string | undefined,
  message: string
) {
  if (isMissing(value)) {
    return;
  }

  const parsed = parseStringMapConfig(value, {
    configKey: label.toLowerCase(),
    logger: quietLogger,
  });

  if (!parsed || Object.keys(parsed).length === 0) {
    result.warnings.push(message);
  }
}

export function validateEnv(
  configs: EnvConfigMap,
  rawEnv: NodeJS.ProcessEnv = process.env
): CheckResult {
  const result: CheckResult = {
    errors: [],
    warnings: [],
  };

  const requiredFields: Array<[label: string, value?: string]> = [
    ['NEXT_PUBLIC_APP_URL', configs.app_url],
    ['NEXT_PUBLIC_APP_NAME', configs.app_name],
    ['DATABASE_URL', configs.database_url],
    ['DATABASE_PROVIDER', configs.database_provider],
    ['AUTH_SECRET', configs.auth_secret],
  ];

  for (const [label, value] of requiredFields) {
    if (isMissing(value)) {
      result.errors.push(`${label} 缺失，或仍是占位值`);
    }
  }

  const appOrigin = getOrigin(configs.app_url);
  const authOrigin = getOrigin(configs.auth_url);

  if (isMissing(configs.auth_url)) {
    result.warnings.push(
      'AUTH_URL 未设置；本地开发可以依赖当前请求域名推断，但生产 OAuth / 邮件回跳强烈建议显式设置，例如 https://mogged.games。Preview 环境通常保持留空更稳。'
    );
  } else if (appOrigin && authOrigin && appOrigin !== authOrigin) {
    result.warnings.push(
      `AUTH_URL(${authOrigin}) 与 NEXT_PUBLIC_APP_URL(${appOrigin}) 不一致；除非你明确把认证部署在独立域名，否则这会增加 OAuth 回调和 Cookie 链路风险。`
    );
  }

  if (
    configs.database_provider &&
    !['postgresql', 'sqlite', 'mysql', 'turso', 'singlestore', 'gel'].includes(
      configs.database_provider
    )
  ) {
    result.errors.push(
      `DATABASE_PROVIDER=${configs.database_provider} 不在 drizzle-kit 支持列表里`
    );
  }

  addOptionalServiceWarning(
    result,
    configs.google_auth_enabled === 'true',
    'Google 登录',
    [
      ['GOOGLE_CLIENT_ID', configs.google_client_id],
      ['GOOGLE_CLIENT_SECRET', configs.google_client_secret],
    ]
  );

  addEnabledServiceError(
    result,
    configs.stripe_enabled === 'true',
    'Stripe 支付',
    [
      ['STRIPE_PUBLISHABLE_KEY', configs.stripe_publishable_key],
      ['STRIPE_SECRET_KEY', configs.stripe_secret_key],
      ['STRIPE_SIGNING_SECRET', configs.stripe_signing_secret],
    ]
  );

  addEnabledServiceError(
    result,
    configs.paypal_enabled === 'true',
    'PayPal 支付',
    [
      ['PAYPAL_CLIENT_ID', configs.paypal_client_id],
      ['PAYPAL_CLIENT_SECRET', configs.paypal_client_secret],
      ['PAYPAL_WEBHOOK_ID', configs.paypal_webhook_id],
    ]
  );

  addEnabledServiceError(
    result,
    configs.creem_enabled === 'true',
    'Creem 支付',
    [
      ['CREEM_API_KEY', configs.creem_api_key],
      ['CREEM_SIGNING_SECRET', configs.creem_signing_secret],
      ['CREEM_PRODUCT_IDS', configs.creem_product_ids],
    ]
  );
  if (configs.creem_enabled === 'true') {
    addJsonMapConfigError(
      result,
      'CREEM_PRODUCT_IDS',
      configs.creem_product_ids,
      'CREEM_PRODUCT_IDS 必须是 JSON 对象映射，例如 {"try-onetime":"prod_xxx"}'
    );
  }

  if (configs.stripe_enabled === 'true') {
    addJsonMapConfigWarning(
      result,
      'STRIPE_PROMOTION_CODES',
      configs.stripe_promotion_codes,
      'STRIPE_PROMOTION_CODES 格式不是 JSON 对象映射；Stripe 结账会跳过预设促销码，但不影响普通支付。'
    );
  }

  addOptionalServiceWarning(
    result,
    configs.crisp_enabled === 'true',
    'Crisp 客服',
    [['CRISP_WEBSITE_ID', configs.crisp_website_id]]
  );

  addOptionalServiceWarning(
    result,
    configs.tawk_enabled === 'true',
    'Tawk 客服',
    [
      ['TAWK_PROPERTY_ID', configs.tawk_property_id],
      ['TAWK_WIDGET_ID', configs.tawk_widget_id],
    ]
  );

  if (
    configs.indexnow_key &&
    configs.indexnow_key.trim() &&
    !/^[A-Za-z0-9-]{8,128}$/.test(configs.indexnow_key.trim())
  ) {
    result.warnings.push(
      'INDEXNOW_KEY 已配置，但格式不合法；会回退到项目内置 key，或导致你以为改了 key 实际没生效。'
    );
  }

  const getRawValue = (name: string) => rawEnv[name] ?? getRawEnv(name);
  const initialCreditsAmount = Number.parseInt(
    configs.initial_credits_amount || getRawValue('INITIAL_CREDITS_AMOUNT') || '',
    10
  );
  if (
    Number.isFinite(initialCreditsAmount) &&
    initialCreditsAmount > 0 &&
    configs.initial_credits_enabled !== 'true'
  ) {
    result.errors.push(
      `INITIAL_CREDITS_AMOUNT 已配置为 ${initialCreditsAmount}，但 INITIAL_CREDITS_ENABLED 不是 true；新用户注册赠送积分会被跳过。`
    );
  }

  const stripeManualReviewEnabled = configs.stripe_enabled === 'true';
  const adminNotificationEmail = getRawValue('ADMIN_NOTIFICATION_EMAIL');

  if (stripeManualReviewEnabled && isMissing(adminNotificationEmail)) {
    result.errors.push(
      'Stripe payment webhook 人工审核已启用，但 ADMIN_NOTIFICATION_EMAIL 缺失或仍是占位值；风险退款、争议、欺诈事件将无人接收告警。'
    );
  }

  const adminReportTimezone = getRawValue('ADMIN_REPORT_TIMEZONE');
  if (isMissing(adminReportTimezone)) {
    result.warnings.push(
      'ADMIN_REPORT_TIMEZONE 未设置；管理员日报/周报/月报会按 UTC 切日和切周。若你的运营口径不是 UTC，建议显式设置，例如 Asia/Shanghai。'
    );
  } else if (!isValidTimeZone(adminReportTimezone)) {
    result.errors.push(
      `ADMIN_REPORT_TIMEZONE=${adminReportTimezone} 不是合法 IANA 时区，例如 Asia/Shanghai 或 UTC`
    );
  }

  const gscServiceAccountJson = getRawValue('GSC_SERVICE_ACCOUNT_JSON');
  const gscServiceAccountFile = getRawValue('GSC_SERVICE_ACCOUNT_FILE');
  if (isMissing(gscServiceAccountJson) && isMissing(gscServiceAccountFile)) {
    result.warnings.push(
      'GSC service account 凭据未配置；管理员报表里的 Google 搜索模块会降级为异常卡片。线上 Worker 建议使用 GSC_SERVICE_ACCOUNT_JSON，本地脚本可用 GSC_SERVICE_ACCOUNT_FILE。'
    );
  } else if (!isMissing(gscServiceAccountFile) && isMissing(gscServiceAccountJson)) {
    result.warnings.push(
      '检测到仅配置了 GSC_SERVICE_ACCOUNT_FILE。它适合本地脚本，但 Cloudflare Worker 线上环境建议改用 GSC_SERVICE_ACCOUNT_JSON。'
    );
  }

  const cruxApiKey = getRawValue('CRUX_API_KEY');
  const pageSpeedApiKey =
    getRawValue('GOOGLE_PAGESPEED_API_KEY') || getRawValue('PAGESPEED_API_KEY');
  if (isMissing(cruxApiKey) && isMissing(pageSpeedApiKey)) {
    result.warnings.push(
      'CRUX_API_KEY / GOOGLE_PAGESPEED_API_KEY 都未配置；Core Web Vitals 会尽量回退到无 key 的 PSI 调用，但高频自动报表稳定性会更差。'
    );
  }

  const orderWebhookConfigured = !isMissing(getRawValue('ORDER_FEISHU_WEBHOOK_URL'));
  const signupWebhookConfigured = !isMissing(
    getRawValue('SIGNUPS_FEISHU_WEBHOOK_URL')
  );
  const creditsWebhookConfigured = !isMissing(
    getRawValue('CREDITS_FEISHU_WEBHOOK_URL')
  );

  if (orderWebhookConfigured && !signupWebhookConfigured) {
    result.warnings.push(
      'ORDER_FEISHU_WEBHOOK_URL 已配置，但 SIGNUPS_FEISHU_WEBHOOK_URL 缺失；新用户注册通知会被直接跳过。'
    );
  }

  if (orderWebhookConfigured && !creditsWebhookConfigured) {
    result.warnings.push(
      'ORDER_FEISHU_WEBHOOK_URL 已配置，但 CREDITS_FEISHU_WEBHOOK_URL 缺失；积分变动通知会被直接跳过。'
    );
  }

  return result;
}

function printResult(result: CheckResult) {
  console.log('\n[verify:env] 环境变量预检开始');

  if (result.errors.length === 0) {
    console.log('[verify:env] 核心配置通过');
  } else {
    console.error('[verify:env] 发现阻断问题：');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.warn('[verify:env] 发现非阻断提醒：');
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  if (result.errors.length > 0) {
    console.error(
      '\n[verify:env] 已终止。先把核心配置补齐，再继续执行 bootstrap。'
    );
    process.exit(1);
  }

  console.log('[verify:env] 预检完成\n');
}

async function main() {
  preloadLocalEnvFiles(process.cwd());
  const { envConfigs } = await import('@/config');
  printResult(validateEnv(envConfigs));
}

if (process.argv[1]?.endsWith('verify-env.ts')) {
  void main();
}
