import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claimAdminReportDelivery: vi.fn(),
  getAdminNotificationRecipients: vi.fn(),
  getAdminReportEmailSummary: vi.fn(),
  markAdminReportDeliveryFailed: vi.fn(),
  markAdminReportDeliveryProcessed: vi.fn(),
  normalizeAdminReportTimezone: vi.fn(),
  resolvePreviousCompleteAdminReportWindow: vi.fn(),
  sendAdminReportDigestEmail: vi.fn(),
}));

vi.mock('@/shared/models/admin-report-delivery', () => ({
  claimAdminReportDelivery: mocks.claimAdminReportDelivery,
  markAdminReportDeliveryFailed: mocks.markAdminReportDeliveryFailed,
  markAdminReportDeliveryProcessed: mocks.markAdminReportDeliveryProcessed,
}));

vi.mock('@/shared/services/admin-report-summary', () => ({
  getAdminReportEmailSummary: mocks.getAdminReportEmailSummary,
}));

vi.mock('@/shared/lib/admin-notification', () => ({
  getAdminNotificationRecipients: mocks.getAdminNotificationRecipients,
}));

vi.mock('@/shared/lib/admin-report-period', () => ({
  normalizeAdminReportTimezone: mocks.normalizeAdminReportTimezone,
  resolvePreviousCompleteAdminReportWindow:
    mocks.resolvePreviousCompleteAdminReportWindow,
}));

vi.mock('@/shared/services/admin-report-email', () => ({
  sendAdminReportDigestEmail: mocks.sendAdminReportDigestEmail,
}));

import { dispatchAdminReportDigest } from './admin-report-dispatch';

describe('admin report dispatch', () => {
  beforeEach(() => {
    mocks.claimAdminReportDelivery.mockReset();
    mocks.getAdminNotificationRecipients.mockReset();
    mocks.getAdminReportEmailSummary.mockReset();
    mocks.markAdminReportDeliveryFailed.mockReset();
    mocks.markAdminReportDeliveryProcessed.mockReset();
    mocks.normalizeAdminReportTimezone.mockReset();
    mocks.resolvePreviousCompleteAdminReportWindow.mockReset();
    mocks.sendAdminReportDigestEmail.mockReset();

    mocks.normalizeAdminReportTimezone.mockImplementation((value) =>
      value || 'UTC'
    );
    mocks.resolvePreviousCompleteAdminReportWindow.mockReturnValue({
      frequency: 'daily',
      periodKey: '2026-05-05',
      label: '2026-05-05',
      timezone: 'Asia/Shanghai',
      startAt: new Date('2026-05-04T16:00:00.000Z'),
      endAt: new Date('2026-05-05T16:00:00.000Z'),
      previousPeriodKey: '2026-05-04',
      previousStartAt: new Date('2026-05-03T16:00:00.000Z'),
      previousEndAt: new Date('2026-05-04T16:00:00.000Z'),
    });
    mocks.getAdminNotificationRecipients.mockReturnValue(['ops@example.com']);
    mocks.getAdminReportEmailSummary.mockResolvedValue({
      timezone: 'Asia/Shanghai',
      window: {
        frequency: 'daily',
        periodKey: '2026-05-05',
        label: '2026-05-05',
      },
      current: {
        signups: 12,
        firstSuccessfulUsers: 8,
        checkoutUsers: 5,
        paidUsers: 4,
        paidOrders: 6,
        grossRevenue: 128000,
        oneTimeRevenue: 68000,
        subscriptionRevenue: 60000,
        refundCount: 1,
        refundAmount: 2900,
        disputeCount: 1,
        netRevenue: 125100,
        creditsConsumed: 420,
        guestCreditsConsumed: 120,
        creditsGranted: 120,
        creditsRefunded: 36,
        tasksCreated: 31,
        taskSucceeded: 24,
        taskFailed: 5,
        taskCanceled: 2,
        successRate: 0.7742,
      },
      previous: {
        signups: 10,
        firstSuccessfulUsers: 6,
        checkoutUsers: 4,
        paidUsers: 3,
        paidOrders: 4,
        grossRevenue: 99000,
        oneTimeRevenue: 45000,
        subscriptionRevenue: 54000,
        refundCount: 0,
        refundAmount: 0,
        disputeCount: 0,
        netRevenue: 99000,
        creditsConsumed: 380,
        guestCreditsConsumed: 80,
        creditsGranted: 100,
        creditsRefunded: 12,
        tasksCreated: 28,
        taskSucceeded: 21,
        taskFailed: 4,
        taskCanceled: 3,
        successRate: 0.75,
      },
      taskBreakdown: [],
      failureReasons: [],
      recentRefunds: [],
      googleSiteReport: {
        property: 'sc-domain:mogged.games',
        propertyUrl:
          'https://search.google.com/search-console?resource_id=sc-domain%3Amogged.games',
        searchPerformance: {
          status: 'degraded',
          range: {
            label: '近 24 小时',
            startDate: '2026-05-05',
            endDate: '2026-05-05',
            dayCount: 1,
            googleTimeZone: 'America/Los_Angeles',
          },
          totals: null,
          topQueries: [],
          topPages: [],
          topCountries: [],
          topDevices: [],
          errorMessage: 'missing credentials',
        },
        urlInspection: {
          status: 'degraded',
          inspectedAt: null,
          rows: [],
          errorMessage: 'missing credentials',
        },
        sitemap: {
          status: 'degraded',
          property: 'sc-domain:mogged.games',
          sitemapUrl: 'https://mogged.games/sitemap.xml',
          lastSubmitted: null,
          isPending: false,
          warnings: 0,
          errors: 0,
          type: null,
          contentsSubmitted: 0,
          contentsIndexed: 0,
          errorMessage: 'missing credentials',
        },
        coreWebVitals: {
          status: 'degraded',
          source: null,
          origin: 'https://mogged.games',
          fieldData: null,
          labSnapshots: [],
          errorMessage: 'missing credentials',
        },
        checkCards: [],
        notes: [],
      },
    });
  });

  it('skips delivery when the same period was already processed', async () => {
    mocks.claimAdminReportDelivery.mockResolvedValue({
      status: 'already_processed',
      record: {
        id: 'delivery-1',
      },
    });

    const result = await dispatchAdminReportDigest({
      frequency: 'daily',
      now: new Date('2026-05-06T00:10:00.000Z'),
      timezone: 'Asia/Shanghai',
    });

    expect(result.status).toBe('already_processed');
    expect(mocks.sendAdminReportDigestEmail).not.toHaveBeenCalled();
    expect(mocks.markAdminReportDeliveryProcessed).not.toHaveBeenCalled();
  });

  it('marks a claimed delivery as processed after a successful send', async () => {
    mocks.claimAdminReportDelivery.mockResolvedValue({
      status: 'claimed',
      record: {
        id: 'delivery-2',
      },
    });
    mocks.sendAdminReportDigestEmail.mockResolvedValue({
      success: true,
      provider: 'resend',
      messageId: 'msg-1',
    });

    const result = await dispatchAdminReportDigest({
      frequency: 'daily',
      now: new Date('2026-05-06T00:10:00.000Z'),
      timezone: 'Asia/Shanghai',
    });

    expect(result.status).toBe('sent');
    expect(mocks.sendAdminReportDigestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: ['ops@example.com'],
      })
    );
    expect(mocks.markAdminReportDeliveryProcessed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'delivery-2',
        provider: 'resend',
        messageId: 'msg-1',
      })
    );
  });

  it('marks the delivery as failed when email send throws', async () => {
    mocks.claimAdminReportDelivery.mockResolvedValue({
      status: 'claimed',
      record: {
        id: 'delivery-3',
      },
    });
    mocks.sendAdminReportDigestEmail.mockRejectedValue(
      new Error('provider offline')
    );

    const result = await dispatchAdminReportDigest({
      frequency: 'daily',
      now: new Date('2026-05-06T00:10:00.000Z'),
      timezone: 'Asia/Shanghai',
    });

    expect(result.status).toBe('failed');
    expect(mocks.markAdminReportDeliveryFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'delivery-3',
        errorMessage: 'provider offline',
      })
    );
  });

  it('returns a dry-run preview without claiming or sending email', async () => {
    const result = await dispatchAdminReportDigest({
      frequency: 'daily',
      now: new Date('2026-05-06T00:10:00.000Z'),
      timezone: 'Asia/Shanghai',
      dryRun: true,
    });

    expect(result.status).toBe('dry_run');
    expect(result.deliveryRecordId).toBeNull();
    expect(mocks.claimAdminReportDelivery).not.toHaveBeenCalled();
    expect(mocks.sendAdminReportDigestEmail).not.toHaveBeenCalled();
  });
});
