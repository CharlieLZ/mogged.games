import 'server-only';

import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/core/db';
import {
  aiTask,
  credit,
  order,
  user,
  userContextEvent,
  webhookEvent,
} from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai/types';
import { PaymentEventType, PaymentType } from '@/extensions/payment/types';
import {
  CHECKOUT_STARTED_EVENT,
  FIRST_SUCCESSFUL_GENERATION_EVENT,
  calculateConversionRate,
} from '@/shared/lib/funnel';
import type { AdminReportWindow } from '@/shared/lib/admin-report-period';
import { PAYMENT_WEBHOOK_SOURCE } from '@/shared/lib/payment-webhook';
import {
  CreditStatus,
  CreditTransactionType,
} from '@/shared/models/credit';
import { getGuestCreditsConsumedTotal } from '@/shared/models/guest_ai_task';
import { OrderStatus } from '@/shared/models/order';
import { WebhookEventStatus } from '@/shared/models/webhook_event';

export type AdminReportMetrics = {
  signups: number;
  firstSuccessfulUsers: number;
  checkoutUsers: number;
  paidUsers: number;
  paidOrders: number;
  grossRevenue: number;
  oneTimeRevenue: number;
  subscriptionRevenue: number;
  refundCount: number;
  refundAmount: number;
  disputeCount: number;
  netRevenue: number;
  creditsConsumed: number;
  guestCreditsConsumed: number;
  creditsGranted: number;
  creditsRefunded: number;
  tasksCreated: number;
  taskSucceeded: number;
  taskFailed: number;
  taskCanceled: number;
  successRate: number;
};

export type AdminReportTaskBreakdownRow = {
  scene: string;
  mediaType: string;
  created: number;
  succeeded: number;
  failed: number;
  canceled: number;
};

export type AdminReportFailureReasonRow = {
  reason: string;
  count: number;
  provider: string;
  mediaType: string;
  scene: string;
};

export type AdminReportRefundRow = {
  provider: string;
  orderNo: string | null;
  amount: number;
  currency: string | null;
  createdAt: Date;
};

export type GoogleSiteReportStatus = 'ok' | 'degraded';

export type GoogleSiteReportRange = {
  label: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  googleTimeZone: string;
};

export type GoogleSiteMetricTotals = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GoogleSiteMetricRow = GoogleSiteMetricTotals & {
  key: string;
};

export type GoogleSiteSearchPerformanceSection = {
  status: GoogleSiteReportStatus;
  range: GoogleSiteReportRange;
  totals: GoogleSiteMetricTotals | null;
  topQueries: GoogleSiteMetricRow[];
  topPages: GoogleSiteMetricRow[];
  topCountries: GoogleSiteMetricRow[];
  topDevices: GoogleSiteMetricRow[];
  errorMessage?: string;
};

export type GoogleSiteUrlInspectionRow = {
  url: string;
  path: string;
  verdict: string;
  coverageState: string;
  indexingState: string;
  robotsTxtState: string;
  pageFetchState: string;
  userCanonical: string | null;
  googleCanonical: string | null;
  lastCrawlTime: string | null;
  sitemap: string[];
};

export type GoogleSiteUrlInspectionSection = {
  status: GoogleSiteReportStatus;
  inspectedAt: string | null;
  rows: GoogleSiteUrlInspectionRow[];
  errorMessage?: string;
};

export type GoogleSiteSitemapSection = {
  status: GoogleSiteReportStatus;
  property: string;
  sitemapUrl: string;
  lastSubmitted: string | null;
  isPending: boolean;
  warnings: number;
  errors: number;
  type: string | null;
  contentsSubmitted: number;
  contentsIndexed: number;
  errorMessage?: string;
};

export type GoogleSiteCoreWebVitalsFieldData = {
  scope: string;
  collectionPeriod: string;
  overallCategory: string;
  largestContentfulPaintMs: number | null;
  interactionToNextPaintMs: number | null;
  cumulativeLayoutShift: number | null;
};

export type GoogleSiteCoreWebVitalsLabSnapshot = {
  url: string;
  strategy: string;
  performanceScore: number | null;
  largestContentfulPaintMs: number | null;
  totalBlockingTimeMs: number | null;
  cumulativeLayoutShift: number | null;
};

export type GoogleSiteCoreWebVitalsSection = {
  status: GoogleSiteReportStatus;
  source: string | null;
  origin: string;
  fieldData: GoogleSiteCoreWebVitalsFieldData | null;
  labSnapshots: GoogleSiteCoreWebVitalsLabSnapshot[];
  errorMessage?: string;
};

export type GoogleSiteReportCheckCard = {
  title: string;
  href: string;
  description: string;
};

export type GoogleSiteReport = {
  property: string;
  propertyUrl: string;
  searchPerformance: GoogleSiteSearchPerformanceSection;
  urlInspection: GoogleSiteUrlInspectionSection;
  sitemap: GoogleSiteSitemapSection;
  coreWebVitals: GoogleSiteCoreWebVitalsSection;
  checkCards: GoogleSiteReportCheckCard[];
  notes: string[];
};

export type SiteMonitoringCheckStatus =
  | 'pass'
  | 'warning'
  | 'error'
  | 'skipped';

export type SiteMonitoringCounts = {
  errorCount: number;
  warningCount: number;
  passCount: number;
  skippedCount: number;
};

export type SiteMonitoringCheck = {
  code: string;
  label: string;
  status: SiteMonitoringCheckStatus;
  value?: string | null;
  details?: string | null;
};

export type SiteMonitoringDiscoveryRow = {
  kind: 'endpoint';
  name: string;
  label: string;
  url: string;
  statusCode: number | null;
  contentType: string | null;
  counts: SiteMonitoringCounts;
  checks: SiteMonitoringCheck[];
};

export type BingInspectionSnapshot = {
  url: string;
  httpStatus: number;
  isPage: boolean;
  anchorCount: number;
  documentSize: number;
  totalChildUrlCount: number;
  discoveryDate: string | null;
  lastCrawledDate: string | null;
};

export type SiteMonitoringPageRow = {
  kind: 'page';
  url: string;
  path: string;
  locale: string | null;
  statusCode: number | null;
  contentType: string | null;
  canonicalUrl: string | null;
  htmlLang: string | null;
  counts: SiteMonitoringCounts;
  bingInspection?: BingInspectionSnapshot | null;
  checks: SiteMonitoringCheck[];
};

export type BingSiteMonitoringStatus =
  | 'ok'
  | 'partial'
  | 'error'
  | 'config_error';

export type BingApiMetricRow = {
  label: string;
  clicks: number;
  impressions: number;
  avgClickPosition: number;
  avgImpressionPosition: number;
  date: string;
  url?: string;
};

export type BingUrlSubmissionQuota = {
  dailyQuota: number;
  monthlyQuota: number;
};

export type BingSiteReportApi = {
  status: BingSiteMonitoringStatus;
  message: string | null;
  verifiedSite: boolean;
  userSitesCount: number;
  roles: string[];
  feeds: string[];
  topQueries: BingApiMetricRow[];
  topPages: BingApiMetricRow[];
  crawlStats: Array<Record<string, unknown>>;
  urlSubmissionQuota: BingUrlSubmissionQuota | null;
  queryParameters: string[];
  inspectedUrls: string[];
};

export type SiteMonitoringMetricRating =
  | 'good'
  | 'needs-improvement'
  | 'poor'
  | 'unknown';

export type SiteMonitoringMetric = {
  name: string;
  source: 'crux' | 'psi';
  rating: SiteMonitoringMetricRating;
  value: number | null;
  displayValue: string;
};

export type BingSiteReportExperience = {
  status: BingSiteMonitoringStatus;
  message: string | null;
  targetUrl: string;
  cruxOrigin: string;
  cruxMetrics: SiteMonitoringMetric[];
  psiMobileMetrics: SiteMonitoringMetric[];
  psiDesktopMetrics: SiteMonitoringMetric[];
  psiMobileScore: number | null;
  psiDesktopScore: number | null;
};

export type BingSiteReport = {
  provider: 'bing';
  siteUrl: string;
  generatedAt: string;
  status: BingSiteMonitoringStatus;
  summaryMessage: string;
  checkedUrlCount: number;
  expectedSitemapUrlCount: number;
  counts: SiteMonitoringCounts;
  discovery: SiteMonitoringDiscoveryRow[];
  pages: SiteMonitoringPageRow[];
  api: BingSiteReportApi;
  experience: BingSiteReportExperience;
};

export type SiteMonitoringReportSet = {
  bing?: BingSiteReport | null;
};

export type AdminReportDigestData = {
  timezone: string;
  window: Pick<AdminReportWindow, 'frequency' | 'periodKey' | 'label'>;
  current: AdminReportMetrics;
  previous: AdminReportMetrics;
  taskBreakdown: AdminReportTaskBreakdownRow[];
  failureReasons: AdminReportFailureReasonRow[];
  recentRefunds: AdminReportRefundRow[];
  googleSiteReport?: GoogleSiteReport | null;
  siteMonitoring?: SiteMonitoringReportSet | null;
};

type PaymentRiskEventRow = {
  provider: string;
  eventType: string;
  rawEventType: string | null;
  relatedOrderNo: string | null;
  payload: string | null;
  createdAt: Date;
};

function baseRangeCondition(column: typeof user.createdAt, window: AdminReportWindow) {
  return and(gte(column, window.startAt), lt(column, window.endAt));
}

async function getTableCount(params: {
  from: typeof user | typeof aiTask | typeof order | typeof userContextEvent;
  where: ReturnType<typeof and>;
}) {
  const [result] = await db()
    .select({
      count: count(),
    })
    .from(params.from)
    .where(params.where);

  return Number(result?.count || 0);
}

async function getDistinctUserCountForUserContextEvent(params: {
  eventType: string;
  window: AdminReportWindow;
}) {
  const [result] = await db()
    .select({
      count: sql<number>`count(distinct ${userContextEvent.userId})`.as('count'),
    })
    .from(userContextEvent)
    .where(
      and(
        eq(userContextEvent.eventType, params.eventType),
        gte(userContextEvent.createdAt, params.window.startAt),
        lt(userContextEvent.createdAt, params.window.endAt)
      )
    );

  return Number(result?.count || 0);
}

async function getPaidUsersCount(window: AdminReportWindow) {
  const [result] = await db()
    .select({
      count: sql<number>`count(distinct ${order.userId})`.as('count'),
    })
    .from(order)
    .where(
      and(
        eq(order.status, OrderStatus.PAID),
        gte(order.createdAt, window.startAt),
        lt(order.createdAt, window.endAt),
        isNull(order.deletedAt)
      )
    );

  return Number(result?.count || 0);
}

async function getPaidRevenue(params: {
  window: AdminReportWindow;
  paymentType?: PaymentType;
}) {
  const [result] = await db()
    .select({
      total: sql<number>`coalesce(sum(coalesce(${order.paymentAmount}, ${order.amount}, 0)), 0)`.as(
        'total'
      ),
    })
    .from(order)
    .where(
      and(
        eq(order.status, OrderStatus.PAID),
        params.paymentType ? eq(order.paymentType, params.paymentType) : undefined,
        gte(order.createdAt, params.window.startAt),
        lt(order.createdAt, params.window.endAt),
        isNull(order.deletedAt)
      )
    );

  return Number(result?.total || 0);
}

async function getCreditTotal(params: {
  window: AdminReportWindow;
  transactionType: string;
}) {
  const [result] = await db()
    .select({
      total: sql<number>`coalesce(sum(${credit.credits}), 0)`.as('total'),
    })
    .from(credit)
    .where(
      and(
        eq(credit.transactionType, params.transactionType),
        eq(credit.status, CreditStatus.ACTIVE),
        gte(credit.createdAt, params.window.startAt),
        lt(credit.createdAt, params.window.endAt),
        isNull(credit.deletedAt)
      )
    );

  return Number(result?.total || 0);
}

function parseWebhookPayload(payload?: string | null) {
  if (!payload) {
    return {};
  }

  try {
    const parsed = JSON.parse(payload);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function getWebhookDataObject(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  const nestedData =
    typeof value.data === 'object' && value.data !== null
      ? (value.data as Record<string, unknown>)
      : null;
  const nestedObject =
    nestedData && typeof nestedData.object === 'object' && nestedData.object
      ? (nestedData.object as Record<string, unknown>)
      : null;

  if (nestedObject) {
    return nestedObject;
  }

  if (typeof value.object === 'object' && value.object !== null) {
    return value.object as Record<string, unknown>;
  }

  return value;
}

function getStringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getNumberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function extractRefundAmountFromPayload(payload?: string | null) {
  const parsed = parseWebhookPayload(payload);
  const object = getWebhookDataObject(parsed);

  return (
    getNumberValue(object.amount_refunded) ||
    getNumberValue(object.amount) ||
    getNumberValue((parsed.refund as { amount?: unknown } | undefined)?.amount)
  );
}

function extractRefundCurrencyFromPayload(payload?: string | null) {
  const parsed = parseWebhookPayload(payload);
  const object = getWebhookDataObject(parsed);

  return (
    getStringValue(object.currency) ||
    getStringValue(parsed.currency) ||
    getStringValue(
      (parsed.refund as { currency?: unknown } | undefined)?.currency
    )
  );
}

function isRefundEvent(row: PaymentRiskEventRow) {
  return (
    row.eventType === PaymentEventType.PAYMENT_REFUNDED ||
    row.rawEventType === 'charge.refunded'
  );
}

function isDisputeEvent(row: PaymentRiskEventRow) {
  return row.rawEventType === 'charge.dispute.created';
}

async function getPaymentRiskEvents(window: AdminReportWindow) {
  return db()
    .select({
      provider: webhookEvent.provider,
      eventType: webhookEvent.eventType,
      rawEventType: webhookEvent.rawEventType,
      relatedOrderNo: webhookEvent.relatedOrderNo,
      payload: webhookEvent.payload,
      createdAt: webhookEvent.createdAt,
    })
    .from(webhookEvent)
    .where(
      and(
        eq(webhookEvent.source, PAYMENT_WEBHOOK_SOURCE),
        eq(webhookEvent.status, WebhookEventStatus.PROCESSED),
        gte(webhookEvent.createdAt, window.startAt),
        lt(webhookEvent.createdAt, window.endAt),
        or(
          eq(webhookEvent.eventType, PaymentEventType.PAYMENT_REFUNDED),
          eq(webhookEvent.rawEventType, 'charge.refunded'),
          eq(webhookEvent.rawEventType, 'charge.dispute.created')
        )
      )
    )
    .orderBy(desc(webhookEvent.createdAt));
}

async function getCoreMetrics(window: AdminReportWindow): Promise<AdminReportMetrics> {
  const [
    signups,
    firstSuccessfulUsers,
    checkoutUsers,
    paidUsers,
    paidOrders,
    grossRevenue,
    oneTimeRevenue,
    subscriptionRevenue,
    creditsConsumedRaw,
    guestCreditsConsumed,
    creditsGranted,
    creditsRefunded,
    tasksCreated,
    taskSucceeded,
    taskFailed,
    taskCanceled,
    paymentRiskEvents,
  ] = await Promise.all([
    getTableCount({
      from: user,
      where: baseRangeCondition(user.createdAt, window),
    }),
    getDistinctUserCountForUserContextEvent({
      eventType: FIRST_SUCCESSFUL_GENERATION_EVENT,
      window,
    }),
    getDistinctUserCountForUserContextEvent({
      eventType: CHECKOUT_STARTED_EVENT,
      window,
    }),
    getPaidUsersCount(window),
    getTableCount({
      from: order,
      where: and(
        eq(order.status, OrderStatus.PAID),
        gte(order.createdAt, window.startAt),
        lt(order.createdAt, window.endAt),
        isNull(order.deletedAt)
      ),
    }),
    getPaidRevenue({ window }),
    getPaidRevenue({
      window,
      paymentType: PaymentType.ONE_TIME,
    }),
    getPaidRevenue({
      window,
      paymentType: PaymentType.SUBSCRIPTION,
    }),
    getCreditTotal({
      window,
      transactionType: CreditTransactionType.CONSUME,
    }),
    getGuestCreditsConsumedTotal({
      startAt: window.startAt,
      endAt: window.endAt,
    }),
    getCreditTotal({
      window,
      transactionType: CreditTransactionType.GRANT,
    }),
    getCreditTotal({
      window,
      transactionType: 'refund',
    }),
    getTableCount({
      from: aiTask,
      where: and(
        gte(aiTask.createdAt, window.startAt),
        lt(aiTask.createdAt, window.endAt),
        isNull(aiTask.deletedAt)
      ),
    }),
    getTableCount({
      from: aiTask,
      where: and(
        eq(aiTask.status, AITaskStatus.SUCCESS),
        gte(aiTask.updatedAt, window.startAt),
        lt(aiTask.updatedAt, window.endAt),
        isNull(aiTask.deletedAt)
      ),
    }),
    getTableCount({
      from: aiTask,
      where: and(
        eq(aiTask.status, AITaskStatus.FAILED),
        gte(aiTask.updatedAt, window.startAt),
        lt(aiTask.updatedAt, window.endAt),
        isNull(aiTask.deletedAt)
      ),
    }),
    getTableCount({
      from: aiTask,
      where: and(
        eq(aiTask.status, AITaskStatus.CANCELED),
        gte(aiTask.updatedAt, window.startAt),
        lt(aiTask.updatedAt, window.endAt),
        isNull(aiTask.deletedAt)
      ),
    }),
    getPaymentRiskEvents(window),
  ]);

  const refundEvents = paymentRiskEvents.filter(isRefundEvent);
  const disputeCount = paymentRiskEvents.filter(isDisputeEvent).length;
  const refundAmount = refundEvents.reduce(
    (total, item) => total + extractRefundAmountFromPayload(item.payload),
    0
  );
  const successRate = calculateConversionRate(
    taskSucceeded,
    taskSucceeded + taskFailed + taskCanceled
  );

  return {
    signups,
    firstSuccessfulUsers,
    checkoutUsers,
    paidUsers,
    paidOrders,
    grossRevenue,
    oneTimeRevenue,
    subscriptionRevenue,
    refundCount: refundEvents.length,
    refundAmount,
    disputeCount,
    netRevenue: grossRevenue - refundAmount,
    creditsConsumed: Math.abs(creditsConsumedRaw) + guestCreditsConsumed,
    guestCreditsConsumed,
    creditsGranted,
    creditsRefunded: Math.abs(creditsRefunded),
    tasksCreated,
    taskSucceeded,
    taskFailed,
    taskCanceled,
    successRate,
  };
}

async function getTaskBreakdown(window: AdminReportWindow) {
  const createdCountSql = sql<number>`count(*)`;
  const succeededCountSql = sql<number>`count(*) filter (where ${aiTask.status} = ${AITaskStatus.SUCCESS})`;
  const failedCountSql = sql<number>`count(*) filter (where ${aiTask.status} = ${AITaskStatus.FAILED})`;
  const canceledCountSql = sql<number>`count(*) filter (where ${aiTask.status} = ${AITaskStatus.CANCELED})`;

  const rows = await db()
    .select({
      scene: aiTask.scene,
      mediaType: aiTask.mediaType,
      created: createdCountSql.as('created'),
      succeeded: succeededCountSql.as('succeeded'),
      failed: failedCountSql.as('failed'),
      canceled: canceledCountSql.as('canceled'),
    })
    .from(aiTask)
    .where(
      and(
        gte(aiTask.createdAt, window.startAt),
        lt(aiTask.createdAt, window.endAt),
        isNull(aiTask.deletedAt)
      )
    )
    .groupBy(aiTask.scene, aiTask.mediaType)
    .orderBy(desc(createdCountSql))
    .limit(10);

  return rows.map((row) => ({
    scene: row.scene || 'unknown',
    mediaType: row.mediaType || 'unknown',
    created: Number(row.created || 0),
    succeeded: Number(row.succeeded || 0),
    failed: Number(row.failed || 0),
    canceled: Number(row.canceled || 0),
  }));
}

async function getFailureReasons(window: AdminReportWindow) {
  const reasonSql = sql<string>`coalesce(
    nullif(trim(${aiTask.taskInfo} ->> 'errorMessage'), ''),
    nullif(trim(${aiTask.taskResult} ->> 'errorMessage'), ''),
    nullif(trim(${aiTask.taskInfo} ->> 'message'), ''),
    nullif(trim(${aiTask.taskResult} ->> 'message'), ''),
    'unknown failure'
  )`;
  const rows = await db()
    .select({
      reason: reasonSql.as('reason'),
      provider: aiTask.provider,
      mediaType: aiTask.mediaType,
      scene: aiTask.scene,
      count: count(),
    })
    .from(aiTask)
    .where(
      and(
        inArray(aiTask.status, [AITaskStatus.FAILED, AITaskStatus.CANCELED]),
        gte(aiTask.updatedAt, window.startAt),
        lt(aiTask.updatedAt, window.endAt),
        isNull(aiTask.deletedAt)
      )
    )
    .groupBy(reasonSql, aiTask.provider, aiTask.mediaType, aiTask.scene)
    .orderBy(desc(count()))
    .limit(5);

  return rows.map((row) => ({
    reason: row.reason || 'unknown failure',
    count: Number(row.count || 0),
    provider: row.provider || 'unknown',
    mediaType: row.mediaType || 'unknown',
    scene: row.scene || 'unknown',
  }));
}

async function getRecentRefunds(window: AdminReportWindow) {
  const rows = await getPaymentRiskEvents(window);

  return rows
    .filter(isRefundEvent)
    .slice(0, 5)
    .map((row) => ({
      provider: row.provider,
      orderNo: row.relatedOrderNo,
      amount: extractRefundAmountFromPayload(row.payload),
      currency: extractRefundCurrencyFromPayload(row.payload),
      createdAt: row.createdAt,
    }))
    .filter((row) => row.amount > 0);
}

export async function getAdminReportDigestData({
  window,
}: {
  window: AdminReportWindow;
}): Promise<AdminReportDigestData> {
  const previousWindow: AdminReportWindow = {
    ...window,
    periodKey: window.previousPeriodKey,
    label: window.previousPeriodKey,
    startAt: window.previousStartAt,
    endAt: window.previousEndAt,
  };

  const [current, previous, taskBreakdown, failureReasons, recentRefunds] =
    await Promise.all([
      getCoreMetrics(window),
      getCoreMetrics(previousWindow),
      getTaskBreakdown(window),
      getFailureReasons(window),
      getRecentRefunds(window),
    ]);

  return {
    timezone: window.timezone,
    window: {
      frequency: window.frequency,
      periodKey: window.periodKey,
      label: window.label,
    },
    current,
    previous,
    taskBreakdown,
    failureReasons,
    recentRefunds,
  };
}
