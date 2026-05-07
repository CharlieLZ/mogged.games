import { resolveAppLocale } from '@/config/locale';

type FeishuMessage = {
  msg_type: 'text';
  content: {
    text: string;
  };
  timestamp?: string;
  sign?: string;
};

type FeishuApiResponse = {
  code: number;
  msg: string;
  data?: unknown;
  httpStatus?: number;
  retryAfterMs?: number;
};

type SharedRateLimiter = {
  schedule: <T>(fn: () => Promise<T>) => Promise<T>;
  blockFor: (ms: number) => void;
};

type SharedRateLimiterState = {
  timestamps: number[];
  queue: Promise<unknown>;
  blockedUntil: number;
};

type NotificationDeviceType =
  | 'desktop'
  | 'mobile'
  | 'tablet'
  | 'bot'
  | 'unknown';

type NotificationCopyLocale = 'zh' | 'en';

export type OrderNotificationPayload = {
  domain?: string;
  email?: string;
  name?: string;
  amount?: number;
  currency?: string;
  type?: string;
  orderNo?: string;
  provider?: string;
  eventType?: string;
};

export type CheckoutNotificationPayload = {
  domain?: string;
  email?: string;
  name?: string | null;
  userId?: string;
  amount?: number;
  currency?: string;
  paymentType?: string;
  orderNo?: string;
  productId?: string;
  productName?: string;
  provider?: string;
  requestedProvider?: string | null;
  fallbackFrom?: string | null;
  locale?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  deviceType?: string | null;
  referer?: string | null;
  attemptedProviders?: string[];
  metadataKeys?: string[];
};

export type ErrorNotificationPayload = {
  domain?: string;
  email?: string;
  name?: string;
  apiEndpoint?: string;
  apiProvider?: string;
  errorCode?: string;
  errorMessage?: string;
  prompt?: string;
  type?: string;
  taskId?: string;
};

export type SignupNotificationPayload = {
  domain?: string;
  email?: string;
  name?: string;
  userId?: string;
  source?: string;
  authSource?: string;
  referrer?: string;
  locale?: string;
  countryCode?: string;
  regionCode?: string;
  userAgent?: string;
  deviceType?: NotificationDeviceType | string;
  emailVerified?: boolean;
  initialCredits?: number;
  createdAt?: string | Date;
};

export type CreditsNotificationPayload = {
  domain?: string;
  email?: string;
  name?: string;
  userId?: string;
  amount?: number;
  balanceAfter?: number;
  transactionType?: string;
  scene?: string;
  description?: string;
  orderNo?: string;
  subscriptionNo?: string;
  transactionNo?: string;
  creditId?: string;
  relatedTaskId?: string;
  metadataType?: string;
  metadataKeys?: string[];
  expiresAt?: string | Date | null;
  source?: string;
  locale?: string;
  countryCode?: string;
  regionCode?: string;
  userAgent?: string;
  deviceType?: NotificationDeviceType | string;
  occurredAt?: string | Date;
  subjectType?: 'account' | 'guest';
  guestIdHash?: string;
  providerTaskId?: string;
  quotaLimit?: number;
  quotaUsed?: number;
  quotaRemaining?: number;
};

const ORDER_FEISHU_WEBHOOK_URL = process.env.ORDER_FEISHU_WEBHOOK_URL ?? '';
const ORDER_FEISHU_TOKEN = process.env.ORDER_FEISHU_TOKEN ?? '';
const CHECKOUT_FEISHU_WEBHOOK_URL =
  process.env.CHECKOUT_FEISHU_WEBHOOK_URL || ORDER_FEISHU_WEBHOOK_URL;
const CHECKOUT_FEISHU_TOKEN =
  process.env.CHECKOUT_FEISHU_TOKEN || ORDER_FEISHU_TOKEN;
const ERROR_FEISHU_WEBHOOK_URL = process.env.ERROR_FEISHU_WEBHOOK_URL ?? '';
const ERROR_FEISHU_TOKEN = process.env.ERROR_FEISHU_TOKEN ?? '';
const SIGNUPS_FEISHU_WEBHOOK_URL = process.env.SIGNUPS_FEISHU_WEBHOOK_URL ?? '';
const SIGNUPS_FEISHU_TOKEN = process.env.SIGNUPS_FEISHU_TOKEN ?? '';
const CREDITS_FEISHU_WEBHOOK_URL = process.env.CREDITS_FEISHU_WEBHOOK_URL ?? '';
const CREDITS_FEISHU_TOKEN = process.env.CREDITS_FEISHU_TOKEN ?? '';

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 10000;
const RATE_LIMIT_PER_SECOND = 5;
const RATE_LIMIT_PER_MINUTE = 100;
const FEISHU_RATE_LIMIT_CODE = 11232;
const FEISHU_OGW_RATE_LIMIT_CODE = 99991400;
const sharedRateLimiterStates = new Map<string, SharedRateLimiterState>();

const orderClient = createFeishuClient({
  name: 'saas-orders',
  webhookUrl: ORDER_FEISHU_WEBHOOK_URL,
  secret: ORDER_FEISHU_TOKEN,
});

const checkoutClient = createFeishuClient({
  name: 'saas-checkout',
  webhookUrl: CHECKOUT_FEISHU_WEBHOOK_URL,
  secret: CHECKOUT_FEISHU_TOKEN,
});

const errorClient = createFeishuClient({
  name: 'saas-errors',
  webhookUrl: ERROR_FEISHU_WEBHOOK_URL,
  secret: ERROR_FEISHU_TOKEN,
});

const signupClient = createFeishuClient({
  name: 'saas-signups',
  webhookUrl: SIGNUPS_FEISHU_WEBHOOK_URL,
  secret: SIGNUPS_FEISHU_TOKEN,
});

const creditsClient = createFeishuClient({
  name: 'saas-credits',
  webhookUrl: CREDITS_FEISHU_WEBHOOK_URL,
  secret: CREDITS_FEISHU_TOKEN,
});

export function getAppDomain(input?: string): string {
  const raw =
    input ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://mogged.games';

  try {
    const parsed = new URL(raw);
    return parsed.host || raw;
  } catch {
    const stripped = raw.replace(/^https?:\/\//, '');
    const slash = stripped.indexOf('/');
    return slash >= 0 ? stripped.slice(0, slash) : stripped;
  }
}

export async function sendOrderNotification(
  payload: OrderNotificationPayload
): Promise<FeishuApiResponse> {
  const text = buildOrderText(payload);
  return orderClient.sendText(text);
}

export async function sendCheckoutNotification(
  payload: CheckoutNotificationPayload
): Promise<FeishuApiResponse> {
  const text = buildCheckoutText(payload);
  return checkoutClient.sendText(text);
}

export async function sendErrorNotification(
  payload: ErrorNotificationPayload
): Promise<FeishuApiResponse> {
  const text = buildErrorText(payload);
  return errorClient.sendText(text);
}

export async function sendSignupNotification(
  payload: SignupNotificationPayload
): Promise<FeishuApiResponse> {
  const text = buildSignupText(payload);
  return signupClient.sendText(text);
}

export async function sendCreditsNotification(
  payload: CreditsNotificationPayload
): Promise<FeishuApiResponse> {
  const text = buildCreditsText(payload);
  return creditsClient.sendText(text);
}

const zhRegionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['zh-CN'], { type: 'region' })
    : null;
const enRegionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en-US'], { type: 'region' })
    : null;

function buildOrderText(payload: OrderNotificationPayload): string {
  const domain = getAppDomain(payload.domain);
  const email = payload.email || '-';
  const name = payload.name || '-';
  const amount = formatAmount(payload.amount, payload.currency);
  const type = payload.type || payload.eventType || '-';
  const orderNo = payload.orderNo || '-';
  const provider = payload.provider || '-';
  const eventType = payload.eventType || '-';

  return [
    '[saas-orders]',
    `domain: ${domain}`,
    `email: ${email}`,
    `name: ${name}`,
    `amount: ${amount}`,
    `type: ${type}`,
    `order_no: ${orderNo}`,
    `provider: ${provider}`,
    `event: ${eventType}`,
  ].join('\n');
}

function buildCheckoutText(payload: CheckoutNotificationPayload): string {
  const domain = getAppDomain(payload.domain);
  const email = payload.email || '-';
  const name = payload.name || '-';
  const userId = payload.userId || '-';
  const amount = formatAmount(payload.amount, payload.currency);
  const paymentType = payload.paymentType || '-';
  const orderNo = payload.orderNo || '-';
  const productId = payload.productId || '-';
  const productName = truncate(payload.productName || '-', 160);
  const provider = payload.provider || '-';
  const requestedProvider = payload.requestedProvider || '-';
  const fallbackFrom = payload.fallbackFrom || '-';
  const locale = payload.locale || '-';
  const countryCode = payload.countryCode || '-';
  const regionCode = payload.regionCode || '-';
  const deviceType = payload.deviceType || '-';
  const referer = truncate(payload.referer || '-', 320);
  const attemptedProviders = formatListValue(payload.attemptedProviders);
  const metadataKeys = formatListValue(payload.metadataKeys);

  return [
    '[saas-checkout]',
    `domain: ${domain}`,
    `email: ${email}`,
    `name: ${name}`,
    `user_id: ${userId}`,
    `amount: ${amount}`,
    `payment_type: ${paymentType}`,
    `order_no: ${orderNo}`,
    `product_id: ${productId}`,
    `product_name: ${productName}`,
    `provider: ${provider}`,
    `requested_provider: ${requestedProvider}`,
    `fallback_from: ${fallbackFrom}`,
    `locale: ${locale}`,
    `country_code: ${countryCode}`,
    `region_code: ${regionCode}`,
    `device_type: ${deviceType}`,
    `attempted_providers: ${attemptedProviders}`,
    `metadata_keys: ${metadataKeys}`,
    `referer: ${referer}`,
    'event: checkout_started',
  ].join('\n');
}

function buildErrorText(payload: ErrorNotificationPayload): string {
  const domain = getAppDomain(payload.domain);
  const email = payload.email || '-';
  const name = payload.name || '-';
  const apiEndpoint = payload.apiEndpoint || '-';
  const apiProvider = payload.apiProvider || '-';
  const errorCode = payload.errorCode || '-';
  const errorMessage = truncate(payload.errorMessage || '-', 600);
  const prompt = truncate(payload.prompt || '-', 800);
  const type = payload.type || '-';
  const taskId = payload.taskId || '-';

  return [
    '[saas-errors]',
    `domain: ${domain}`,
    `email: ${email}`,
    `name: ${name}`,
    `api: ${apiEndpoint}`,
    `provider: ${apiProvider}`,
    `error_code: ${errorCode}`,
    `error: ${errorMessage}`,
    `prompt: ${prompt}`,
    `type: ${type}`,
    `task_id: ${taskId}`,
  ].join('\n');
}

function formatOptionalText(value?: string | null): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : '-';
}

function resolveNotificationCopyLocale(
  locale?: string | null
): NotificationCopyLocale {
  return resolveAppLocale(locale) === 'zh' ? 'zh' : 'en';
}

function resolveLanguage(locale?: string | null): string {
  const normalized = locale?.trim().toLowerCase();
  if (!normalized) {
    return '-';
  }

  const language = normalized.split(/[-_]/)[0];
  return language || '-';
}

function formatCountryDisplay(
  countryCode: string | null | undefined,
  copyLocale: NotificationCopyLocale
): string {
  const normalized = countryCode?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) {
    return '-';
  }

  const displayNames = copyLocale === 'zh' ? zhRegionNames : enRegionNames;
  const displayName = displayNames?.of(normalized)?.trim();
  if (!displayName) {
    return normalized;
  }

  return `${displayName} (${normalized})`;
}

function normalizeDeviceType(
  deviceType?: NotificationDeviceType | string
): NotificationDeviceType | undefined {
  const normalized = deviceType?.trim().toLowerCase();
  switch (normalized) {
    case 'desktop':
    case 'mobile':
    case 'tablet':
    case 'bot':
    case 'unknown':
      return normalized;
    default:
      return undefined;
  }
}

function resolveDeviceTypeFromUserAgent(
  userAgent?: string | null
): NotificationDeviceType {
  const normalized = userAgent?.trim().toLowerCase();
  if (!normalized) {
    return 'unknown';
  }

  if (
    /bot|crawler|spider|preview|headless|curl|wget|slurp|bingpreview/.test(
      normalized
    )
  ) {
    return 'bot';
  }

  if (/ipad|tablet|playbook|silk/.test(normalized)) {
    return 'tablet';
  }

  if (
    /mobi|iphone|ipod|android.+mobile|windows phone|blackberry|opera mini/.test(
      normalized
    )
  ) {
    return 'mobile';
  }

  return 'desktop';
}

function resolvePlatformLabel(userAgent?: string | null): string | undefined {
  const normalized = userAgent?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized.includes('iphone')) return 'iPhone';
  if (normalized.includes('ipad')) return 'iPad';
  if (normalized.includes('android')) return 'Android';
  if (normalized.includes('windows phone')) return 'Windows Phone';
  if (normalized.includes('windows nt')) return 'Windows';
  if (normalized.includes('mac os x') || normalized.includes('macintosh')) {
    return 'macOS';
  }
  if (normalized.includes('cros')) return 'ChromeOS';
  if (normalized.includes('linux') || normalized.includes('x11'))
    return 'Linux';
  if (normalized.includes('bot')) return 'Bot';

  return undefined;
}

function resolveBrowserLabel(userAgent?: string | null): string | undefined {
  const normalized = userAgent?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized.includes('edg/')) return 'Edge';
  if (normalized.includes('opr/') || normalized.includes('opera'))
    return 'Opera';
  if (normalized.includes('firefox/')) return 'Firefox';
  if (normalized.includes('crios/')) return 'Chrome iOS';
  if (normalized.includes('chrome/')) return 'Chrome';
  if (normalized.includes('safari/') && !normalized.includes('chrome/')) {
    return 'Safari';
  }
  if (normalized.includes('micromessenger')) return 'WeChat';

  return undefined;
}

function resolveDeviceTypeLabel(
  deviceType: NotificationDeviceType,
  copyLocale: NotificationCopyLocale
): string {
  if (copyLocale === 'zh') {
    switch (deviceType) {
      case 'bot':
        return '爬虫/脚本';
      case 'desktop':
        return '桌面端';
      case 'mobile':
        return '移动端';
      case 'tablet':
        return '平板';
      default:
        return '未知设备';
    }
  }

  switch (deviceType) {
    case 'bot':
      return 'Bot/Script';
    case 'desktop':
      return 'Desktop';
    case 'mobile':
      return 'Mobile';
    case 'tablet':
      return 'Tablet';
    default:
      return 'Unknown device';
  }
}

function buildDeviceLabel(params: {
  userAgent?: string | null;
  deviceType?: NotificationDeviceType | string;
  copyLocale: NotificationCopyLocale;
}): string {
  const userAgent = params.userAgent?.trim();
  const deviceType =
    normalizeDeviceType(params.deviceType) ||
    resolveDeviceTypeFromUserAgent(userAgent);
  const typeLabel = resolveDeviceTypeLabel(deviceType, params.copyLocale);
  const platformLabel = resolvePlatformLabel(userAgent);
  const browserLabel = resolveBrowserLabel(userAgent);
  const details = [...new Set([platformLabel, browserLabel].filter(Boolean))];

  return details.length > 0
    ? `${typeLabel} · ${details.join(' · ')}`
    : typeLabel;
}

function formatLocalizedBoolean(
  value: boolean | undefined,
  copyLocale: NotificationCopyLocale
) {
  if (typeof value !== 'boolean') {
    return '-';
  }

  if (copyLocale === 'zh') {
    return value ? '是' : '否';
  }

  return value ? 'yes' : 'no';
}

function formatLocalizedDirection(
  amount: number | undefined,
  copyLocale: NotificationCopyLocale
) {
  if (amount === undefined) {
    return '-';
  }

  if (copyLocale === 'zh') {
    return amount >= 0 ? '增加' : '扣减';
  }

  return amount >= 0 ? 'increase' : 'decrease';
}

export function buildSignupText(payload: SignupNotificationPayload): string {
  const copyLocale = resolveNotificationCopyLocale(payload.locale);
  const domain = getAppDomain(payload.domain);
  const email = formatOptionalText(payload.email);
  const name = formatOptionalText(payload.name);
  const userId = formatOptionalText(payload.userId);
  const source = formatOptionalText(payload.source);
  const authSource = formatOptionalText(payload.authSource);
  const referrer = truncate(formatOptionalText(payload.referrer), 400);
  const locale = formatOptionalText(payload.locale);
  const language = resolveLanguage(payload.locale);
  const emailVerified = formatLocalizedBoolean(
    payload.emailVerified,
    copyLocale
  );
  const initialCredits =
    payload.initialCredits === undefined
      ? '-'
      : formatSignedNumber(payload.initialCredits);
  const createdAt = formatDateValue(payload.createdAt);
  const country = formatCountryDisplay(payload.countryCode, copyLocale);
  const region = formatOptionalText(payload.regionCode);
  const deviceLabel = buildDeviceLabel({
    userAgent: payload.userAgent,
    deviceType: payload.deviceType,
    copyLocale,
  });

  if (copyLocale === 'zh') {
    return [
      '🆕 [新用户注册]',
      `域名: ${domain}`,
      `邮箱: ${email}`,
      `用户: ${name}`,
      `用户ID: ${userId}`,
      `来源: ${source}`,
      `认证来源: ${authSource}`,
      `来源页: ${referrer}`,
      `国家: ${country}`,
      `地区: ${region}`,
      `站点语言: ${locale}`,
      `语言: ${language}`,
      `设备标识: ${deviceLabel}`,
      `邮箱已验证: ${emailVerified}`,
      `赠送积分: ${initialCredits}`,
      `时间(UTC): ${createdAt}`,
    ].join('\n');
  }

  return [
    '🆕 [New signup]',
    `Domain: ${domain}`,
    `Email: ${email}`,
    `User: ${name}`,
    `User ID: ${userId}`,
    `Source: ${source}`,
    `Auth source: ${authSource}`,
    `Referrer: ${referrer}`,
    `Country: ${country}`,
    `Region: ${region}`,
    `Site locale: ${locale}`,
    `Language: ${language}`,
    `Device: ${deviceLabel}`,
    `Email verified: ${emailVerified}`,
    `Granted credits: ${initialCredits}`,
    `Time (UTC): ${createdAt}`,
  ].join('\n');
}

export function buildCreditsText(payload: CreditsNotificationPayload): string {
  const copyLocale = resolveNotificationCopyLocale(payload.locale);
  const domain = getAppDomain(payload.domain);
  const email = formatOptionalText(payload.email);
  const name = formatOptionalText(payload.name);
  const userId = formatOptionalText(payload.userId);
  const subjectType = formatOptionalText(payload.subjectType);
  const amount =
    payload.amount === undefined ? '-' : formatSignedNumber(payload.amount);
  const direction = formatLocalizedDirection(payload.amount, copyLocale);
  const balanceAfter =
    payload.balanceAfter === undefined || payload.balanceAfter === null
      ? '-'
      : String(payload.balanceAfter);
  const transactionType = formatOptionalText(payload.transactionType);
  const scene = formatOptionalText(payload.scene);
  const description = truncate(formatOptionalText(payload.description), 400);
  const orderNo = formatOptionalText(payload.orderNo);
  const subscriptionNo = formatOptionalText(payload.subscriptionNo);
  const transactionNo = formatOptionalText(payload.transactionNo);
  const creditId = formatOptionalText(payload.creditId);
  const relatedTaskId = formatOptionalText(payload.relatedTaskId);
  const metadataType = formatOptionalText(payload.metadataType);
  const metadataKeys = formatListValue(payload.metadataKeys);
  const expiresAt = formatDateValue(payload.expiresAt);
  const source = formatOptionalText(payload.source);
  const occurredAt = formatDateValue(payload.occurredAt);
  const country = formatCountryDisplay(payload.countryCode, copyLocale);
  const region = formatOptionalText(payload.regionCode);
  const locale = formatOptionalText(payload.locale);
  const language = resolveLanguage(payload.locale);
  const deviceLabel = buildDeviceLabel({
    userAgent: payload.userAgent,
    deviceType: payload.deviceType,
    copyLocale,
  });
  const guestIdHash = formatOptionalText(payload.guestIdHash);
  const providerTaskId = formatOptionalText(payload.providerTaskId);
  const quotaLimit =
    typeof payload.quotaLimit === 'number' && Number.isFinite(payload.quotaLimit)
      ? Math.max(0, Math.round(payload.quotaLimit))
      : null;
  const quotaUsed =
    typeof payload.quotaUsed === 'number' && Number.isFinite(payload.quotaUsed)
      ? Math.max(0, Math.round(payload.quotaUsed))
      : null;
  const quotaRemaining =
    typeof payload.quotaRemaining === 'number' &&
    Number.isFinite(payload.quotaRemaining)
      ? Math.max(0, Math.round(payload.quotaRemaining))
      : null;
  const guestQuotaUsed =
    quotaUsed !== null && quotaLimit !== null ? `${quotaUsed}/${quotaLimit}` : '-';
  const guestQuotaRemaining =
    quotaRemaining !== null ? String(quotaRemaining) : '-';
  const isGuestNotification =
    payload.subjectType === 'guest' ||
    guestIdHash !== '-' ||
    providerTaskId !== '-' ||
    guestQuotaUsed !== '-' ||
    guestQuotaRemaining !== '-';

  if (copyLocale === 'zh') {
    return [
      '🪙 Credits 变动通知',
      `域名: ${domain}`,
      `邮箱: ${email}`,
      `用户: ${name}`,
      `用户ID: ${userId}`,
      ...(isGuestNotification ? [`主体类型: ${subjectType}`] : []),
      ...(isGuestNotification ? [`访客ID哈希: ${guestIdHash}`] : []),
      `方向: ${direction}`,
      `变动额度: ${amount}`,
      `余额: ${balanceAfter}`,
      `交易类型: ${transactionType}`,
      `场景: ${scene}`,
      `来源: ${source}`,
      `说明: ${description}`,
      `订单号: ${orderNo}`,
      `订阅号: ${subscriptionNo}`,
      `流水号: ${transactionNo}`,
      `记录ID: ${creditId}`,
      `关联任务ID: ${relatedTaskId}`,
      `元数据类型: ${metadataType}`,
      `元数据键: ${metadataKeys}`,
      ...(isGuestNotification ? [`Provider 任务ID: ${providerTaskId}`] : []),
      ...(isGuestNotification ? [`访客额度已用: ${guestQuotaUsed}`] : []),
      ...(isGuestNotification
        ? [`访客额度剩余: ${guestQuotaRemaining}`]
        : []),
      `过期时间: ${expiresAt}`,
      `国家: ${country}`,
      `地区: ${region}`,
      `站点语言: ${locale}`,
      `语言: ${language}`,
      `设备标识: ${deviceLabel}`,
      `时间(UTC): ${occurredAt}`,
    ].join('\n');
  }

  return [
    '🪙 Credits change',
    `Domain: ${domain}`,
    `Email: ${email}`,
    `User: ${name}`,
    `User ID: ${userId}`,
    ...(isGuestNotification ? [`Subject type: ${subjectType}`] : []),
    ...(isGuestNotification ? [`Guest ID hash: ${guestIdHash}`] : []),
    `Direction: ${direction}`,
    `Change amount: ${amount}`,
    `Balance: ${balanceAfter}`,
    `Transaction type: ${transactionType}`,
    `Scene: ${scene}`,
    `Source: ${source}`,
    `Description: ${description}`,
    `Order no: ${orderNo}`,
    `Subscription no: ${subscriptionNo}`,
    `Transaction no: ${transactionNo}`,
    `Record ID: ${creditId}`,
    `Related task ID: ${relatedTaskId}`,
    `Metadata type: ${metadataType}`,
    `Metadata keys: ${metadataKeys}`,
    ...(isGuestNotification ? [`Provider task ID: ${providerTaskId}`] : []),
    ...(isGuestNotification ? [`Guest quota used: ${guestQuotaUsed}`] : []),
    ...(isGuestNotification
      ? [`Guest quota remaining: ${guestQuotaRemaining}`]
      : []),
    `Expires at: ${expiresAt}`,
    `Country: ${country}`,
    `Region: ${region}`,
    `Site locale: ${locale}`,
    `Language: ${language}`,
    `Device: ${deviceLabel}`,
    `Time (UTC): ${occurredAt}`,
  ].join('\n');
}

function formatAmount(amount?: number, currency?: string): string {
  if (amount === undefined || amount === null) return '-';

  const value = Number(amount);
  if (Number.isNaN(value)) return String(amount);

  const currencyCode = currency ? currency.toUpperCase() : '';
  const normalized = Number.isInteger(value) ? value / 100 : value;

  if (!currencyCode) return String(normalized);

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(normalized);
  } catch {
    return `${normalized} ${currencyCode}`;
  }
}

function formatSignedNumber(value: number): string {
  const normalized = Number(value);
  if (Number.isNaN(normalized)) return String(value);
  if (normalized > 0) return `+${normalized}`;
  return String(normalized);
}

function formatDateValue(value?: string | Date | null): string {
  if (!value) return '-';

  const date =
    value instanceof Date
      ? value
      : new Date(typeof value === 'string' ? value : String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function formatListValue(values?: string[]): string {
  const normalizedValues =
    values
      ?.map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12) || [];

  return normalizedValues.length > 0 ? normalizedValues.join(', ') : '-';
}

function createFeishuClient(config: {
  name: string;
  webhookUrl: string;
  secret: string;
}) {
  const limiter = getSharedRateLimiter(config.webhookUrl || config.name, {
    perSecond: RATE_LIMIT_PER_SECOND,
    perMinute: RATE_LIMIT_PER_MINUTE,
  });

  return {
    async sendText(text: string): Promise<FeishuApiResponse> {
      if (!config.webhookUrl) {
        console.warn(`[Feishu] ${config.name} webhook not configured`);
        return { code: -1, msg: 'webhook not configured' };
      }

      const message: FeishuMessage = {
        msg_type: 'text',
        content: { text },
      };

      return sendWithRetry(config, limiter, message);
    },
  };
}

async function sendWithRetry(
  config: { name: string; webhookUrl: string; secret: string },
  limiter: SharedRateLimiter,
  message: FeishuMessage
): Promise<FeishuApiResponse> {
  let lastResult: FeishuApiResponse | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const result = await limiter.schedule(() => sendOnce(config, message));
    lastResult = result;

    if (result.code === 0) {
      return result;
    }

    if (!shouldRetry(result) || attempt === MAX_RETRIES) {
      break;
    }

    const delayMs = getRetryDelayMs(result, attempt);
    limiter.blockFor(delayMs);
    await sleep(delayMs);
  }

  console.error('[Feishu] send failed', {
    bot: config.name,
    result: lastResult,
  });

  return (
    lastResult || {
      code: -1,
      msg: 'send failed',
    }
  );
}

async function sendOnce(
  config: { webhookUrl: string; secret: string },
  message: FeishuMessage
): Promise<FeishuApiResponse> {
  const payload = await withSignature(message, config.secret);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const result = await safeParseJson(response);

    return {
      code: result?.code ?? -1,
      msg: result?.msg ?? 'invalid response',
      data: result?.data,
      httpStatus: response.status,
      retryAfterMs: getRetryAfterMs(response.headers),
    };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    return { code: -1, msg: messageText };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function safeParseJson(
  response: Response
): Promise<{ code: number; msg: string; data?: unknown } | null> {
  try {
    return (await response.json()) as {
      code: number;
      msg: string;
      data?: unknown;
    };
  } catch {
    return null;
  }
}

function shouldRetry(result: FeishuApiResponse): boolean {
  if (result.code === FEISHU_RATE_LIMIT_CODE) return true;
  if (result.code === FEISHU_OGW_RATE_LIMIT_CODE) return true;
  if (result.code === -1) return true;
  if (result.httpStatus && result.httpStatus >= 500) return true;
  if (result.httpStatus === 429) return true;
  return false;
}

function getRetryDelayMs(result: FeishuApiResponse, attempt: number): number {
  if (result.retryAfterMs && result.retryAfterMs > 0) {
    return result.retryAfterMs;
  }

  const base = 600;
  const jitter = Math.floor(Math.random() * 200);
  const delay = base * Math.pow(2, attempt - 1);
  return Math.min(8000, delay + jitter);
}

function getSharedRateLimiter(
  key: string,
  {
    perSecond,
    perMinute,
  }: {
    perSecond: number;
    perMinute: number;
  }
): SharedRateLimiter {
  const normalizedKey = key.trim() || '__feishu_default__';
  let state = sharedRateLimiterStates.get(normalizedKey);

  if (!state) {
    state = {
      timestamps: [],
      queue: Promise.resolve(),
      blockedUntil: 0,
    };
    sharedRateLimiterStates.set(normalizedKey, state);
  }

  const waitForSlot = async () => {
    while (true) {
      const now = Date.now();
      const secondWindow = 1000;
      const minuteWindow = 60000;

      if (state.blockedUntil > now) {
        await sleep(state.blockedUntil - now);
        continue;
      }

      state.timestamps = state.timestamps.filter(
        (ts) => now - ts < minuteWindow
      );

      const recentSecond = state.timestamps.filter(
        (ts) => now - ts < secondWindow
      );

      let waitMs = 0;

      if (state.timestamps.length >= perMinute) {
        waitMs = Math.max(waitMs, minuteWindow - (now - state.timestamps[0]));
      }

      if (recentSecond.length >= perSecond) {
        waitMs = Math.max(waitMs, secondWindow - (now - recentSecond[0]));
      }

      if (waitMs <= 0) {
        state.timestamps.push(Date.now());
        return;
      }

      await sleep(waitMs);
    }
  };

  return {
    schedule: async function schedule<T>(fn: () => Promise<T>): Promise<T> {
      const run = state.queue.then(async () => {
        await waitForSlot();
        return fn();
      });

      state.queue = run.catch(() => undefined);

      return run;
    },
    blockFor(ms: number) {
      if (!Number.isFinite(ms) || ms <= 0) {
        return;
      }

      state.blockedUntil = Math.max(state.blockedUntil, Date.now() + ms);
    },
  };
}

function getRetryAfterMs(headers: Headers): number | undefined {
  const raw =
    headers.get('x-ogw-ratelimit-reset') ?? headers.get('retry-after');

  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  const seconds = Number(trimmed);

  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }

  const absoluteTime = Date.parse(trimmed);
  if (Number.isNaN(absoluteTime)) {
    return undefined;
  }

  const delayMs = absoluteTime - Date.now();
  return delayMs > 0 ? delayMs : undefined;
}

async function withSignature(
  message: FeishuMessage,
  secret: string
): Promise<FeishuMessage> {
  if (!secret) return message;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sign = await generateFeishuSign(timestamp, secret);

  return {
    ...message,
    timestamp,
    sign,
  };
}

async function generateFeishuSign(
  timestamp: string,
  secret: string
): Promise<string> {
  const stringToSign = `${timestamp}\n${secret}`;

  if (globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(stringToSign);
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await globalThis.crypto.subtle.sign(
      'HMAC',
      key,
      new Uint8Array()
    );
    return toBase64(new Uint8Array(signature));
  }

  const { createHmac } = await import('crypto');
  return createHmac('sha256', stringToSign).update('').digest('base64');
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
