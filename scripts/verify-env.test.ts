import { describe, expect, it } from 'vitest';

import { validateEnv } from './verify-env';

describe('verify env', () => {
  it('fails when enabled payment providers are missing required keys', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: 'https://mogged.games',
        stripe_enabled: 'false',
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_signing_secret: '',
        paypal_enabled: 'true',
        paypal_client_id: 'paypal-client-id',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'true',
        creem_api_key: 'creem_xxx',
        creem_signing_secret: '',
        creem_product_ids: '',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
      } as any,
      {
        ADMIN_NOTIFICATION_EMAIL: '',
      } as unknown as NodeJS.ProcessEnv
    );

    expect(result.errors).toContain(
      'PayPal 支付 已启用，但这些配置缺失或仍是占位值：PAYPAL_CLIENT_SECRET、PAYPAL_WEBHOOK_ID'
    );
    expect(result.errors).toContain(
      'Creem 支付 已启用，但这些配置缺失或仍是占位值：CREEM_API_KEY、CREEM_SIGNING_SECRET、CREEM_PRODUCT_IDS'
    );
  });

  it('uses mogged.games in the missing AUTH_URL guidance', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: '',
        stripe_enabled: 'false',
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_signing_secret: '',
        paypal_enabled: 'false',
        paypal_client_id: '',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'false',
        creem_api_key: '',
        creem_signing_secret: '',
        creem_product_ids: '',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
      } as any,
      process.env
    );

    expect(
      result.warnings.some((warning) =>
        warning.includes('https://mogged.games')
      )
    ).toBe(true);
  });

  it('fails fast when stripe manual review is enabled without admin notification email', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: 'https://mogged.games',
        stripe_enabled: 'true',
        stripe_publishable_key: 'pk_live_example',
        stripe_secret_key: 'sk_live_example',
        stripe_signing_secret: 'whsec_live_example',
        paypal_enabled: 'false',
        paypal_client_id: '',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'false',
        creem_api_key: '',
        creem_signing_secret: '',
        creem_product_ids: '',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
      } as any,
      {
        ADMIN_NOTIFICATION_EMAIL: '',
      } as unknown as NodeJS.ProcessEnv
    );

    expect(result.errors).toContain(
      'Stripe payment webhook 人工审核已启用，但 ADMIN_NOTIFICATION_EMAIL 缺失或仍是占位值；风险退款、争议、欺诈事件将无人接收告警。'
    );
  });

  it('fails fast when enabled Creem product ids are not a valid json map', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: 'https://mogged.games',
        stripe_enabled: 'false',
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_signing_secret: '',
        stripe_promotion_codes: '',
        paypal_enabled: 'false',
        paypal_client_id: '',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'true',
        creem_api_key: 'creem_live_example',
        creem_signing_secret: 'creem_signing_secret',
        creem_product_ids: '{bad-json}',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
      } as any,
      process.env
    );

    expect(result.errors).toContain(
      'CREEM_PRODUCT_IDS 必须是 JSON 对象映射，例如 {"try-onetime":"prod_xxx"}'
    );
  });

  it('warns when optional Stripe promotion codes are not a valid json map', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: 'https://mogged.games',
        stripe_enabled: 'true',
        stripe_publishable_key: 'pk_live_example',
        stripe_secret_key: 'sk_live_example',
        stripe_signing_secret: 'whsec_live_example',
        stripe_promotion_codes: '{bad-json}',
        paypal_enabled: 'false',
        paypal_client_id: '',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'false',
        creem_api_key: '',
        creem_signing_secret: '',
        creem_product_ids: '',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
      } as any,
      {
        ADMIN_NOTIFICATION_EMAIL: 'admin@mogged.games',
      } as unknown as NodeJS.ProcessEnv
    );

    expect(result.warnings).toContain(
      'STRIPE_PROMOTION_CODES 格式不是 JSON 对象映射；Stripe 结账会跳过预设促销码，但不影响普通支付。'
    );
  });

  it('fails fast when signup gift credits have an amount but the enable switch is missing', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: 'https://mogged.games',
        stripe_enabled: 'false',
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_signing_secret: '',
        paypal_enabled: 'false',
        paypal_client_id: '',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'false',
        creem_api_key: '',
        creem_signing_secret: '',
        creem_product_ids: '',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
        initial_credits_enabled: '',
        initial_credits_amount: '150',
      } as any,
      {
        ADMIN_NOTIFICATION_EMAIL: 'admin@mogged.games',
      } as unknown as NodeJS.ProcessEnv
    );

    expect(result.errors).toContain(
      'INITIAL_CREDITS_AMOUNT 已配置为 150，但 INITIAL_CREDITS_ENABLED 不是 true；新用户注册赠送积分会被跳过。'
    );
  });

  it('warns when admin report timezone is missing', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: 'https://mogged.games',
        stripe_enabled: 'false',
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_signing_secret: '',
        paypal_enabled: 'false',
        paypal_client_id: '',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'false',
        creem_api_key: '',
        creem_signing_secret: '',
        creem_product_ids: '',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
      } as any,
      {
        ADMIN_NOTIFICATION_EMAIL: 'admin@mogged.games',
        ADMIN_REPORT_TIMEZONE: '',
      } as unknown as NodeJS.ProcessEnv
    );

    expect(result.warnings).toContain(
      'ADMIN_REPORT_TIMEZONE 未设置；管理员日报/周报/月报会按 UTC 切日和切周。若你的运营口径不是 UTC，建议显式设置，例如 Asia/Shanghai。'
    );
  });

  it('warns when gsc credentials are missing for admin reports', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: 'https://mogged.games',
        stripe_enabled: 'false',
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_signing_secret: '',
        paypal_enabled: 'false',
        paypal_client_id: '',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'false',
        creem_api_key: '',
        creem_signing_secret: '',
        creem_product_ids: '',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
      } as any,
      {
        ADMIN_NOTIFICATION_EMAIL: 'admin@mogged.games',
        GSC_SERVICE_ACCOUNT_JSON: '',
        GSC_SERVICE_ACCOUNT_FILE: '',
        CRUX_API_KEY: '',
        GOOGLE_PAGESPEED_API_KEY: '',
      } as unknown as NodeJS.ProcessEnv
    );

    expect(result.warnings).toContain(
      'GSC service account 凭据未配置；管理员报表里的 Google 搜索模块会降级为异常卡片。线上 Worker 建议使用 GSC_SERVICE_ACCOUNT_JSON，本地脚本可用 GSC_SERVICE_ACCOUNT_FILE。'
    );
    expect(result.warnings).toContain(
      'CRUX_API_KEY / GOOGLE_PAGESPEED_API_KEY 都未配置；Core Web Vitals 会尽量回退到无 key 的 PSI 调用，但高频自动报表稳定性会更差。'
    );
  });

  it('fails when admin report timezone is invalid', () => {
    const result = validateEnv(
      {
        app_url: 'https://mogged.games',
        app_name: 'mogged',
        database_url: 'postgres://example.com/db',
        database_provider: 'postgresql',
        auth_secret: 'auth-secret',
        auth_url: 'https://mogged.games',
        stripe_enabled: 'false',
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_signing_secret: '',
        paypal_enabled: 'false',
        paypal_client_id: '',
        paypal_client_secret: '',
        paypal_webhook_id: '',
        creem_enabled: 'false',
        creem_api_key: '',
        creem_signing_secret: '',
        creem_product_ids: '',
        google_auth_enabled: 'false',
        google_client_id: '',
        google_client_secret: '',
        crisp_enabled: 'false',
        crisp_website_id: '',
        tawk_enabled: 'false',
        tawk_property_id: '',
        tawk_widget_id: '',
        indexnow_key: '',
      } as any,
      {
        ADMIN_NOTIFICATION_EMAIL: 'admin@mogged.games',
        ADMIN_REPORT_TIMEZONE: 'Mars/Base',
      } as unknown as NodeJS.ProcessEnv
    );

    expect(result.errors).toContain(
      'ADMIN_REPORT_TIMEZONE=Mars/Base 不是合法 IANA 时区，例如 Asia/Shanghai 或 UTC'
    );
  });
});
