import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getAllConfigs: vi.fn(),
  uploadClickConversion: vi.fn(),
  safeRecordUserContextEvent: vi.fn(),
  claimGoogleAdsPurchaseUpload: vi.fn(),
  markGoogleAdsPurchaseUploadUploaded: vi.fn(),
  markGoogleAdsPurchaseUploadFailed: vi.fn(),
}));

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

vi.mock('@/extensions/ads/google-ads-api', () => ({
  uploadClickConversion: mocks.uploadClickConversion,
}));

vi.mock('@/shared/models/user_context_event', () => ({
  safeRecordUserContextEvent: mocks.safeRecordUserContextEvent,
}));

vi.mock('@/shared/models/google-ads-purchase-upload', () => ({
  claimGoogleAdsPurchaseUpload: mocks.claimGoogleAdsPurchaseUpload,
  markGoogleAdsPurchaseUploadUploaded: mocks.markGoogleAdsPurchaseUploadUploaded,
  markGoogleAdsPurchaseUploadFailed: mocks.markGoogleAdsPurchaseUploadFailed,
}));

import { syncGoogleAdsPurchaseConversionForOrder } from './google-ads-purchase-sync';

describe('google ads purchase sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllConfigs.mockResolvedValue({
      enable_ads_tracking: 'true',
      google_ads_purchase_tracking_mode: 'server',
      google_ads_customer_id: '8817947507',
      google_ads_purchase_upload_conversion_action_id: '9999999999',
    });
    mocks.uploadClickConversion.mockResolvedValue({
      jobId: 123,
      orderId: 'ord_123',
    });
    mocks.safeRecordUserContextEvent.mockResolvedValue(null);
    mocks.claimGoogleAdsPurchaseUpload.mockResolvedValue({
      status: 'claimed',
      record: {
        id: 'claim_1',
        orderNo: 'ord_123',
      },
    });
    mocks.markGoogleAdsPurchaseUploadUploaded.mockResolvedValue(undefined);
    mocks.markGoogleAdsPurchaseUploadFailed.mockResolvedValue(undefined);
  });

  it('uploads a purchase conversion with exactly one click identifier', async () => {
    await syncGoogleAdsPurchaseConversionForOrder({
      userId: 'user_123',
      order: {
        orderNo: 'ord_123',
        paidAt: new Date('2026-04-14T06:07:08.000Z'),
        paymentAmount: 2900,
        paymentCurrency: 'usd',
        amount: 2900,
        currency: 'usd',
        checkoutInfo: {
          attribution: {
            gclid: 'gclid_123',
          },
        },
      } as any,
    });

    expect(mocks.uploadClickConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: '8817947507',
        conversionActionId: '9999999999',
        orderId: 'ord_123',
        gclid: 'gclid_123',
        conversionValue: 29,
        currencyCode: 'USD',
      })
    );
    expect(mocks.markGoogleAdsPurchaseUploadUploaded).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'ord_123',
        jobId: 123,
      })
    );
  });

  it('skips uploads when more than one click identifier is present', async () => {
    await syncGoogleAdsPurchaseConversionForOrder({
      userId: 'user_123',
      order: {
        orderNo: 'ord_123',
        paidAt: new Date('2026-04-14T06:07:08.000Z'),
        amount: 2900,
        currency: 'usd',
        checkoutInfo: {
          attribution: {
            gclid: 'gclid_123',
            wbraid: 'wbraid_123',
          },
        },
      } as any,
    });

    expect(mocks.uploadClickConversion).not.toHaveBeenCalled();
    expect(mocks.safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'google_ads_purchase_upload_skipped',
        metadata: expect.objectContaining({
          reason: 'ambiguous_click_identifier',
        }),
      })
    );
  });

  it('skips uploads when the order is already marked as uploaded', async () => {
    mocks.claimGoogleAdsPurchaseUpload.mockResolvedValue({
      status: 'already_uploaded',
      record: {
        id: 'claim_1',
        orderNo: 'ord_123',
      },
    });

    const result = await syncGoogleAdsPurchaseConversionForOrder({
      userId: 'user_123',
      order: {
        orderNo: 'ord_123',
        paidAt: new Date('2026-04-14T06:07:08.000Z'),
        paymentAmount: 2900,
        paymentCurrency: 'usd',
        amount: 2900,
        currency: 'usd',
        checkoutInfo: {
          attribution: {
            gclid: 'gclid_123',
          },
        },
      } as any,
    });

    expect(result).toEqual({
      status: 'skipped',
      reason: 'already_uploaded',
    });
    expect(mocks.uploadClickConversion).not.toHaveBeenCalled();
  });
});
