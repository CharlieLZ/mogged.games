import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const siteSchema = pgSchema('mogged_games');

export const user = siteSchema.table(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    locale: text('locale'),
    countryCode: text('country_code'),
    regionCode: text('region_code'),
    lastSeenAt: timestamp('last_seen_at'),
    lastSeenIpAddress: text('last_seen_ip_address'),
    lastSeenUserAgent: text('last_seen_user_agent'),
    lastDeviceType: text('last_device_type'),
    lastSignInAt: timestamp('last_sign_in_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Search users by name in admin dashboard
    index('idx_user_name').on(table.name),
    // Order users by registration time for latest users list
    index('idx_user_created_at').on(table.createdAt),
    index('idx_user_locale').on(table.locale),
    index('idx_user_country_code').on(table.countryCode),
    index('idx_user_last_seen_at').on(table.lastSeenAt),
  ]
);

export const session = siteSchema.table(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    // Composite: Query user sessions and filter by expiration
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_session_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const account = siteSchema.table(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Query all linked accounts for a user
    index('idx_account_user_id').on(table.userId),
    // Composite: OAuth login (most critical)
    // Can also be used for: WHERE providerId = ? (left-prefix)
    index('idx_account_provider_account').on(table.providerId, table.accountId),
  ]
);

export const verification = siteSchema.table(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Find verification code by identifier (e.g., find code by email)
    index('idx_verification_identifier').on(table.identifier),
  ]
);

export const config = siteSchema.table('config', {
  name: text('name').unique().notNull(),
  value: text('value'),
});

export const userAcquisition = siteSchema.table(
  'user_acquisition',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    firstTouchAt: timestamp('first_touch_at').defaultNow().notNull(),
    lastTouchAt: timestamp('last_touch_at').defaultNow().notNull(),
    source: text('source'),
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmBatch: text('utm_batch'),
    utmObjective: text('utm_objective'),
    utmCampaign: text('utm_campaign'),
    utmAdgroup: text('utm_adgroup'),
    utmContent: text('utm_content'),
    utmTerm: text('utm_term'),
    utmMatch: text('utm_match'),
    utmLang: text('utm_lang'),
    utmDevice: text('utm_device'),
    utmWorkflow: text('utm_workflow'),
    gclid: text('gclid'),
    gbraid: text('gbraid'),
    wbraid: text('wbraid'),
    fbclid: text('fbclid'),
    msclkid: text('msclkid'),
    landingPath: text('landing_path'),
    landingUrl: text('landing_url'),
    locale: text('locale'),
    countryCode: text('country_code'),
    regionCode: text('region_code'),
    deviceType: text('device_type'),
    deviceLabelZh: text('device_label_zh'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_acquisition_user_id_unique').on(table.userId),
    index('user_acquisition_last_touch_at_idx').on(table.lastTouchAt),
    index('user_acquisition_source_idx').on(table.source),
    index('user_acquisition_campaign_idx').on(table.utmCampaign),
    index('user_acquisition_locale_idx').on(table.locale),
    index('user_acquisition_country_code_idx').on(table.countryCode),
  ]
);

export const userNotificationPreference = siteSchema.table(
  'user_notification_preference',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    aiTaskCompletionEmailEnabled: boolean('ai_task_completion_email_enabled')
      .default(false)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_user_notification_preference_updated_at').on(table.updatedAt),
  ]
);

export const userNotification = siteSchema.table(
  'user_notification',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown> | null>(),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_user_notification_dedupe_key').on(table.dedupeKey),
    index('idx_user_notification_user_created_at').on(
      table.userId,
      table.createdAt
    ),
    index('idx_user_notification_user_read_created_at').on(
      table.userId,
      table.readAt,
      table.createdAt
    ),
    index('idx_user_notification_source').on(table.sourceType, table.sourceId),
  ]
);

export const googleAdsPurchaseUpload = siteSchema.table(
  'google_ads_purchase_upload',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orderNo: text('order_no').notNull(),
    status: text('status').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    conversionActionId: text('conversion_action_id'),
    clickIdentifierType: text('click_identifier_type'),
    jobId: integer('job_id'),
    lastError: text('last_error'),
    processingStartedAt: timestamp('processing_started_at'),
    uploadedAt: timestamp('uploaded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_google_ads_purchase_upload_order_no').on(table.orderNo),
    index('idx_google_ads_purchase_upload_status_processing_started_at').on(
      table.status,
      table.processingStartedAt
    ),
    index('idx_google_ads_purchase_upload_user_created_at').on(
      table.userId,
      table.createdAt
    ),
  ]
);

export const runtimeSettingAudit = siteSchema.table(
  'runtime_setting_audit',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    settingName: text('setting_name').notNull(),
    previousStoredValue: text('previous_stored_value'),
    nextStoredValue: text('next_stored_value'),
    previousEffectiveValue: text('previous_effective_value').notNull(),
    nextEffectiveValue: text('next_effective_value').notNull(),
    previousSource: text('previous_source').notNull(),
    nextSource: text('next_source').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('runtime_setting_audit_actor_created_at_idx').on(
      table.actorUserId,
      table.createdAt
    ),
    index('runtime_setting_audit_setting_created_at_idx').on(
      table.settingName,
      table.createdAt
    ),
    index('runtime_setting_audit_created_at_idx').on(table.createdAt),
  ]
);

export const adminReportDelivery = siteSchema.table(
  'admin_report_delivery',
  {
    id: text('id').primaryKey(),
    frequency: text('frequency').notNull(),
    periodKey: text('period_key').notNull(),
    timezone: text('timezone').notNull(),
    windowStart: timestamp('window_start').notNull(),
    windowEnd: timestamp('window_end').notNull(),
    targetEmail: text('target_email'),
    status: text('status').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    claimedAt: timestamp('claimed_at'),
    sentAt: timestamp('sent_at'),
    provider: text('provider'),
    messageId: text('message_id'),
    summary: jsonb('summary').$type<Record<string, unknown> | null>(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_admin_report_delivery_frequency_period_timezone').on(
      table.frequency,
      table.periodKey,
      table.timezone
    ),
    index('idx_admin_report_delivery_status_claimed_at').on(
      table.status,
      table.claimedAt
    ),
    index('idx_admin_report_delivery_sent_at').on(table.sentAt),
  ]
);

export const order = siteSchema.table(
  'order',
  {
    id: text('id').primaryKey(),
    orderNo: text('order_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // checkout user email
    checkoutIpAddress: text('checkout_ip_address'),
    checkoutUserAgent: text('checkout_user_agent'),
    checkoutDeviceType: text('checkout_device_type'),
    checkoutLocale: text('checkout_locale'),
    checkoutCountryCode: text('checkout_country_code'),
    checkoutRegionCode: text('checkout_region_code'),
    status: text('status').notNull(), // created, paid, failed
    amount: integer('amount').notNull(), // checkout amount in cents
    currency: text('currency').notNull(), // checkout currency
    productId: text('product_id'),
    paymentType: text('payment_type'), // one_time, subscription
    paymentInterval: text('payment_interval'), // day, week, month, year
    paymentProvider: text('payment_provider').notNull(),
    paymentSessionId: text('payment_session_id'),
    checkoutInfo: jsonb('checkout_info').$type<unknown>().notNull(), // checkout request info
    checkoutResult: jsonb('checkout_result').$type<unknown>(), // checkout result
    paymentResult: jsonb('payment_result').$type<unknown>(), // payment result
    discountCode: text('discount_code'), // discount code
    discountAmount: integer('discount_amount'), // discount amount in cents
    discountCurrency: text('discount_currency'), // discount currency
    paymentEmail: text('payment_email'), // actual payment email
    paymentAmount: integer('payment_amount'), // actual payment amount
    paymentCurrency: text('payment_currency'), // actual payment currency
    paidAt: timestamp('paid_at'), // paid at
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    description: text('description'), // order description
    productName: text('product_name'), // product name
    subscriptionId: text('subscription_id'), // provider subscription id
    subscriptionResult: jsonb('subscription_result').$type<unknown>(), // provider subscription result
    checkoutUrl: text('checkout_url'), // checkout url
    callbackUrl: text('callback_url'), // callback url, after handle callback
    creditsAmount: integer('credits_amount'), // credits amount
    creditsValidDays: integer('credits_valid_days'), // credits validity days
    planName: text('plan_name'), // subscription plan name
    paymentProductId: text('payment_product_id'), // payment product id
    invoiceId: text('invoice_id'),
    invoiceUrl: text('invoice_url'),
    subscriptionNo: text('subscription_no'), // order subscription no
    transactionId: text('transaction_id'), // payment transaction id
    paymentUserName: text('payment_user_name'), // payment user name
    paymentUserId: text('payment_user_id'), // payment user id
  },
  (table) => [
    // Composite: Query user orders by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_order_user_status_payment_type').on(
      table.userId,
      table.status,
      table.paymentType
    ),
    // Composite: Prevent duplicate payments
    // Can also be used for: WHERE transactionId = ? (left-prefix)
    index('idx_order_transaction_provider').on(
      table.transactionId,
      table.paymentProvider
    ),
    uniqueIndex('uq_order_transaction_provider')
      .on(table.paymentProvider, table.transactionId)
      .where(
        sql`${table.transactionId} is not null and btrim(${table.transactionId}) <> ''`
      ),
    // Order orders by creation time for listing
    index('idx_order_created_at').on(table.createdAt),
    // Admin stats: aggregate paid orders by time range
    index('idx_order_status_created_at').on(table.status, table.createdAt),
    // Admin stats: aggregate subscription payments by time range
    index('idx_order_status_payment_type_created_at').on(
      table.status,
      table.paymentType,
      table.createdAt
    ),
    index('idx_order_checkout_country_created_at').on(
      table.checkoutCountryCode,
      table.createdAt
    ),
  ]
);

export const userContextEvent = siteSchema.table(
  'user_context_event',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    deviceType: text('device_type'),
    locale: text('locale'),
    countryCode: text('country_code'),
    regionCode: text('region_code'),
    path: text('path'),
    referer: text('referer'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_context_event_user_created_at').on(
      table.userId,
      table.createdAt
    ),
    index('idx_user_context_event_type_created_at').on(
      table.eventType,
      table.createdAt
    ),
    index('idx_user_context_event_ip_created_at').on(
      table.ipAddress,
      table.createdAt
    ),
  ]
);

export const webhookEvent = siteSchema.table(
  'webhook_event',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    eventType: text('event_type').notNull(),
    rawEventType: text('raw_event_type'),
    status: text('status').notNull(),
    deliveryCount: integer('delivery_count').default(1).notNull(),
    lastReceivedAt: timestamp('last_received_at').defaultNow().notNull(),
    lastDeliveryStatus: text('last_delivery_status'),
    payload: text('payload'),
    requestIpAddress: text('request_ip_address'),
    requestUserAgent: text('request_user_agent'),
    requestPath: text('request_path'),
    relatedUserId: text('related_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    relatedOrderNo: text('related_order_no'),
    relatedSubscriptionId: text('related_subscription_id'),
    processingStartedAt: timestamp('processing_started_at'),
    lastProcessingStartedAt: timestamp('last_processing_started_at'),
    lastProcessingFinishedAt: timestamp('last_processing_finished_at'),
    lastProcessingDurationMs: integer('last_processing_duration_ms'),
    processedAt: timestamp('processed_at'),
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_webhook_event_source_provider_event_id').on(
      table.source,
      table.provider,
      table.eventId
    ),
    index('idx_webhook_event_source_provider_type_created_at').on(
      table.source,
      table.provider,
      table.eventType,
      table.createdAt
    ),
    index('idx_webhook_event_status_processing_started_at').on(
      table.status,
      table.processingStartedAt
    ),
    index('idx_webhook_event_related_user_created_at').on(
      table.relatedUserId,
      table.createdAt
    ),
    index('idx_webhook_event_related_order_created_at').on(
      table.relatedOrderNo,
      table.createdAt
    ),
    index('idx_webhook_event_last_received_at').on(table.lastReceivedAt),
  ]
);

export const webhookEventAttempt = siteSchema.table(
  'webhook_event_attempt',
  {
    id: text('id').primaryKey(),
    webhookEventId: text('webhook_event_id')
      .notNull()
      .references(() => webhookEvent.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull(),
    deliveryStatus: text('delivery_status').notNull(),
    processingStatus: text('processing_status').notNull(),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
    payload: text('payload'),
    requestIpAddress: text('request_ip_address'),
    requestUserAgent: text('request_user_agent'),
    requestPath: text('request_path'),
    processingStartedAt: timestamp('processing_started_at'),
    processingFinishedAt: timestamp('processing_finished_at'),
    processingDurationMs: integer('processing_duration_ms'),
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_webhook_event_attempt_event_attempt_number').on(
      table.webhookEventId,
      table.attemptNumber
    ),
    index('idx_webhook_event_attempt_event_received_at').on(
      table.webhookEventId,
      table.receivedAt
    ),
    index('idx_webhook_event_attempt_processing_status').on(
      table.processingStatus,
      table.receivedAt
    ),
  ]
);

export const subscription = siteSchema.table(
  'subscription',
  {
    id: text('id').primaryKey(),
    subscriptionNo: text('subscription_no').unique().notNull(), // subscription no
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // subscription user email
    status: text('status').notNull(), // subscription status
    paymentProvider: text('payment_provider').notNull(),
    subscriptionId: text('subscription_id').notNull(), // provider subscription id
    subscriptionResult: jsonb('subscription_result').$type<unknown>(), // provider subscription result
    productId: text('product_id'), // product id
    description: text('description'), // subscription description
    amount: integer('amount'), // subscription amount
    currency: text('currency'), // subscription currency
    interval: text('interval'), // subscription interval, day, week, month, year
    intervalCount: integer('interval_count'), // subscription interval count
    trialPeriodDays: integer('trial_period_days'), // subscription trial period days
    currentPeriodStart: timestamp('current_period_start'), // subscription current period start
    currentPeriodEnd: timestamp('current_period_end'), // subscription current period end
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    planName: text('plan_name'),
    billingUrl: text('billing_url'),
    productName: text('product_name'), // subscription product name
    creditsAmount: integer('credits_amount'), // subscription credits amount
    creditsValidDays: integer('credits_valid_days'), // subscription credits valid days
    paymentProductId: text('payment_product_id'), // subscription payment product id
    paymentUserId: text('payment_user_id'), // subscription payment user id
    canceledAt: timestamp('canceled_at'), // subscription canceled apply at
    canceledEndAt: timestamp('canceled_end_at'), // subscription canceled end at
    canceledReason: text('canceled_reason'), // subscription canceled reason
    canceledReasonType: text('canceled_reason_type'), // subscription canceled reason type
  },
  (table) => [
    // Composite: Query user's subscriptions by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_subscription_user_status_interval').on(
      table.userId,
      table.status,
      table.interval
    ),
    // Composite: Prevent duplicate subscriptions
    // Can also be used for: WHERE paymentProvider = ? (left-prefix)
    index('idx_subscription_provider_id').on(
      table.subscriptionId,
      table.paymentProvider
    ),
    uniqueIndex('uq_subscription_provider_id')
      .on(table.paymentProvider, table.subscriptionId)
      .where(
        sql`${table.subscriptionId} is not null and btrim(${table.subscriptionId}) <> ''`
      ),
    // Order subscriptions by creation time for listing
    index('idx_subscription_created_at').on(table.createdAt),
  ]
);

export const credit = siteSchema.table(
  'credit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }), // user id
    userEmail: text('user_email'), // user email
    orderNo: text('order_no'), // payment order no
    subscriptionNo: text('subscription_no'), // subscription no
    transactionNo: text('transaction_no').unique().notNull(), // transaction no
    transactionType: text('transaction_type').notNull(), // transaction type, grant / consume
    transactionScene: text('transaction_scene'), // transaction scene, payment / subscription / gift / award
    credits: integer('credits').notNull(), // credits amount, n or -n
    remainingCredits: integer('remaining_credits').notNull().default(0), // remaining credits amount
    description: text('description'), // transaction description
    expiresAt: timestamp('expires_at'), // transaction expires at
    status: text('status').notNull(), // transaction status
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    consumedDetail: jsonb('consumed_detail').$type<unknown>(), // consumed detail
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(), // transaction metadata
  },
  (table) => [
    // Critical composite index for credit consumption (FIFO queue)
    // Query: WHERE userId = ? AND transactionType = 'grant' AND status = 'active'
    //        AND remainingCredits > 0 ORDER BY expiresAt
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_credit_consume_fifo').on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt
    ),
    // Query credits by order number
    index('idx_credit_order_no').on(table.orderNo),
    uniqueIndex('uq_credit_order_no')
      .on(table.orderNo)
      .where(
        sql`${table.orderNo} is not null and btrim(${table.orderNo}) <> ''`
      ),
    // Query credits by subscription number
    index('idx_credit_subscription_no').on(table.subscriptionNo),
    // Admin stats: aggregate credits by transaction type and time range
    index('idx_credit_stats').on(
      table.transactionType,
      table.status,
      table.createdAt
    ),
  ]
);

export const apikey = siteSchema.table(
  'apikey',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key'),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query user's API keys by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_apikey_user_status').on(table.userId, table.status),
    // Composite: Validate active API key (most common for auth)
    // Can also be used for: WHERE key = ? (left-prefix)
    index('idx_apikey_key_status').on(table.key, table.status),
    index('idx_apikey_key_hash_status').on(table.keyHash, table.status),
    uniqueIndex('uq_apikey_key_hash').on(table.keyHash),
  ]
);

// RBAC Tables
export const role = siteSchema.table(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(), // admin, editor, viewer
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Query active roles
    index('idx_role_status').on(table.status),
  ]
);

export const permission = siteSchema.table(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // admin.users.read, admin.posts.write
    resource: text('resource').notNull(), // users, posts, categories
    action: text('action').notNull(), // read, write, delete
    title: text('title').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite: Query permissions by resource and action
    // Can also be used for: WHERE resource = ? (left-prefix)
    index('idx_permission_resource_action').on(table.resource, table.action),
  ]
);

export const rolePermission = siteSchema.table(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query permissions for a role
    // Can also be used for: WHERE roleId = ? (left-prefix)
    index('idx_role_permission_role_permission').on(
      table.roleId,
      table.permissionId
    ),
    uniqueIndex('uq_role_permission_role_permission').on(
      table.roleId,
      table.permissionId
    ),
  ]
);

export const userRole = siteSchema.table(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    // Composite: Query user's active roles (most critical for auth)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_user_role_user_expires').on(table.userId, table.expiresAt),
    uniqueIndex('uq_user_role_user_role').on(table.userId, table.roleId),
  ]
);

export const aiTask = siteSchema.table(
  'ai_task',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mediaType: text('media_type').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    prompt: text('prompt').notNull(),
    options: jsonb('options').$type<Record<string, unknown> | null>(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    taskId: text('task_id'), // provider task id
    taskInfo: jsonb('task_info').$type<unknown>(), // provider task info
    taskResult: jsonb('task_result').$type<unknown>(), // provider task result
    costCredits: integer('cost_credits').notNull().default(0),
    scene: text('scene').notNull().default(''),
    creditId: text('credit_id'), // credit consumption record id
    completionNotificationRequested: boolean(
      'completion_notification_requested'
    )
      .default(false)
      .notNull(),
    completionNotificationLocale: text('completion_notification_locale'),
    completionNotificationClaimedAt: timestamp(
      'completion_notification_claimed_at'
    ),
    completionNotificationSentAt: timestamp('completion_notification_sent_at'),
    completionNotificationLastAttemptAt: timestamp(
      'completion_notification_last_attempt_at'
    ),
    completionNotificationLastError: text('completion_notification_last_error'),
    completionNotificationProvider: text('completion_notification_provider'),
    completionNotificationMessageId: text('completion_notification_message_id'),
  },
  (table) => [
    // Composite: Query user's AI tasks by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_ai_task_user_media_type').on(table.userId, table.mediaType),
    // Composite: Query user's AI tasks by media type and provider
    // Can also be used for: WHERE mediaType = ? AND provider = ? (left-prefix)
    index('idx_ai_task_media_type_status').on(table.mediaType, table.status),
    index('idx_ai_task_completion_notification').on(
      table.completionNotificationRequested,
      table.completionNotificationSentAt,
      table.completionNotificationClaimedAt
    ),
    uniqueIndex('uq_ai_task_provider_task_id')
      .on(table.provider, table.taskId)
      .where(sql`${table.taskId} is not null and btrim(${table.taskId}) <> ''`),
  ]
);

export const guestDailyQuota = siteSchema.table(
  'guest_daily_quota',
  {
    id: text('id').primaryKey(),
    guestIdHash: text('guest_id_hash').notNull(),
    ipHash: text('ip_hash').notNull(),
    userAgentHash: text('user_agent_hash'),
    dateKey: text('date_key').notNull(),
    usedCount: integer('used_count').notNull().default(0),
    reservedCount: integer('reserved_count').notNull().default(0),
    limitCount: integer('limit_count').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    lastSeenAt: timestamp('last_seen_at'),
  },
  (table) => [
    uniqueIndex('uq_guest_daily_quota_guest_date').on(
      table.guestIdHash,
      table.dateKey
    ),
    index('idx_guest_daily_quota_ip_date').on(table.ipHash, table.dateKey),
  ]
);

export const guestAiTask = siteSchema.table(
  'guest_ai_task',
  {
    id: text('id').primaryKey(),
    guestIdHash: text('guest_id_hash').notNull(),
    dateKey: text('date_key').notNull(),
    mediaType: text('media_type').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    prompt: text('prompt').notNull(),
    scene: text('scene').notNull(),
    options: jsonb('options').$type<Record<string, unknown> | null>(),
    status: text('status').notNull(),
    providerTaskId: text('provider_task_id'),
    taskInfo: jsonb('task_info').$type<unknown>(),
    taskResult: jsonb('task_result').$type<unknown>(),
    quotaUnits: integer('quota_units').notNull().default(1),
    quotaStatus: text('quota_status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    uniqueIndex('uq_guest_ai_task_provider_task_id')
      .on(table.provider, table.providerTaskId)
      .where(
        sql`${table.providerTaskId} is not null and btrim(${table.providerTaskId}) <> ''`
      ),
    index('idx_guest_ai_task_guest_created').on(
      table.guestIdHash,
      table.createdAt
    ),
    index('idx_guest_ai_task_expires_at').on(table.expiresAt),
  ]
);

export const aiGenerateIdempotency = siteSchema.table(
  'ai_generate_idempotency',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    scope: text('scope').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    status: text('status').notNull(),
    responsePayload: text('response_payload'),
    aiTaskId: text('ai_task_id'),
    errorMessage: text('error_message'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_ai_generate_idempotency_user_scope_key').on(
      table.userId,
      table.scope,
      table.idempotencyKey
    ),
    index('idx_ai_generate_idempotency_status_expires_at').on(
      table.status,
      table.expiresAt
    ),
    index('idx_ai_generate_idempotency_user_created_at').on(
      table.userId,
      table.createdAt
    ),
  ]
);
