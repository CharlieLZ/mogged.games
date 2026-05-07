import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatus } from '@/extensions/payment/types';

import { GET } from './route';

const testGlobals = globalThis as typeof globalThis & {
  __imageeditoraiRateLimitStore?: Map<string, unknown>;
};

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  findOrderByOrderNo: vi.fn(),
  getPaymentService: vi.fn(),
  handleCheckoutSuccess: vi.fn(),
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/models/order', () => ({
  findOrderByOrderNo: mocks.findOrderByOrderNo,
}));

vi.mock('@/shared/services/payment', () => ({
  getPaymentService: mocks.getPaymentService,
  handleCheckoutSuccess: mocks.handleCheckoutSuccess,
}));

describe('/api/payment/check-status contract', () => {
  beforeEach(() => {
    testGlobals.__imageeditoraiRateLimitStore?.clear();
    vi.clearAllMocks();
  });

  it('requires an authenticated user', async () => {
    mocks.getUserInfo.mockResolvedValue(null);

    const response = await GET(
      new Request('https://example.com/api/payment/check-status?order_no=ord_1')
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: -1,
      message: 'Unauthorized',
    });
  });

  it('returns the current order state when no payment session has been created yet', async () => {
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
    });
    mocks.findOrderByOrderNo.mockResolvedValue({
      orderNo: 'ord_1',
      userId: 'user-1',
      status: 'pending',
      paymentProvider: null,
      paymentSessionId: null,
      checkoutUrl: 'https://checkout.example.com/pending',
    });

    const response = await GET(
      new Request('https://example.com/api/payment/check-status?order_no=ord_1')
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        orderNo: 'ord_1',
        status: 'pending',
        paymentProvider: null,
        checkoutUrl: 'https://checkout.example.com/pending',
      },
    });
    expect(mocks.getPaymentService).not.toHaveBeenCalled();
    expect(mocks.handleCheckoutSuccess).not.toHaveBeenCalled();
  });

  it('refreshes the remote payment session and returns the updated order snapshot', async () => {
    const getPaymentSession = vi.fn().mockResolvedValue({
      provider: 'stripe',
      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: {
        paymentAmount: 29,
        paymentCurrency: 'usd',
      },
    });

    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
    });
    mocks.findOrderByOrderNo
      .mockResolvedValueOnce({
        orderNo: 'ord_1',
        userId: 'user-1',
        status: 'created',
        paymentProvider: 'stripe',
        paymentSessionId: 'sess_1',
        checkoutUrl: 'https://checkout.example.com/stripe',
      })
      .mockResolvedValueOnce({
        orderNo: 'ord_1',
        userId: 'user-1',
        status: 'paid',
        paymentProvider: 'stripe',
        paymentSessionId: 'sess_1',
        checkoutUrl: 'https://checkout.example.com/stripe',
        paidAt: '2026-04-13T00:00:00.000Z',
      });
    mocks.getPaymentService.mockResolvedValue({
      getProvider: vi.fn(() => ({
        name: 'stripe',
        getPaymentSession,
      })),
    });
    mocks.handleCheckoutSuccess.mockResolvedValue(undefined);

    const response = await GET(
      new Request('https://example.com/api/payment/check-status?order_no=ord_1')
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        orderNo: 'ord_1',
        status: 'paid',
        paymentProvider: 'stripe',
        paymentStatus: PaymentStatus.SUCCESS,
        checkoutUrl: 'https://checkout.example.com/stripe',
        paidAt: '2026-04-13T00:00:00.000Z',
      },
    });
    expect(getPaymentSession).toHaveBeenCalledWith({
      sessionId: 'sess_1',
    });
    expect(mocks.handleCheckoutSuccess).toHaveBeenCalledWith({
      order: expect.objectContaining({
        orderNo: 'ord_1',
      }),
      session: expect.objectContaining({
        paymentStatus: PaymentStatus.SUCCESS,
      }),
    });
  });
});
