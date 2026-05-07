import { createApiPreflightResponse } from '@/shared/lib/api/request-security';
import { getClientIpFromHeaders, rateLimit } from '@/shared/lib/api/rate-limit';
import { findOrderByOrderNo } from '@/shared/models/order';
import { getUserInfo } from '@/shared/services/current-user';
import { getPaymentService, handleCheckoutSuccess } from '@/shared/services/payment';

const statusLimiter = rateLimit({
  uniqueTokenPerInterval: 10,
  interval: 30 * 1000,
});

export async function OPTIONS() {
  return createApiPreflightResponse('GET, OPTIONS');
}

export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return Response.json(
        {
          code: -1,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const rate = await statusLimiter(
      `payment-status:${getClientIpFromHeaders(request.headers)}:${user.id}`
    );
    if (!rate.success) {
      return Response.json(
        {
          code: -1,
          message: 'Too many requests, please slow down',
          retryAfter: Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000)),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rate.limit.toString(),
            'X-RateLimit-Remaining': rate.remaining.toString(),
            'X-RateLimit-Reset': new Date(rate.reset).toISOString(),
          },
        }
      );
    }

    const url = new URL(request.url);
    const orderNo = url.searchParams.get('order_no')?.trim();
    if (!orderNo) {
      return Response.json(
        {
          code: -1,
          message: 'order_no is required',
        },
        { status: 400 }
      );
    }

    const order = await findOrderByOrderNo(orderNo);
    if (!order || order.userId !== user.id) {
      return Response.json(
        {
          code: -1,
          message: 'order not found',
        },
        { status: 404 }
      );
    }

    if (!order.paymentSessionId || !order.paymentProvider) {
      return Response.json({
        code: 0,
        message: 'ok',
        data: {
          orderNo: order.orderNo,
          status: order.status,
          paymentProvider: order.paymentProvider,
          checkoutUrl: order.checkoutUrl,
        },
      });
    }

    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider(order.paymentProvider);
    if (!paymentProvider || paymentProvider.name !== order.paymentProvider) {
      return Response.json(
        {
          code: -1,
          message: 'payment provider not found',
        },
        { status: 500 }
      );
    }

    const session = await paymentProvider.getPaymentSession({
      sessionId: order.paymentSessionId,
    });

    if (session?.paymentStatus) {
      await handleCheckoutSuccess({
        order,
        session,
      });
    }

    const refreshedOrder = await findOrderByOrderNo(orderNo);

    return Response.json({
      code: 0,
      message: 'ok',
      data: {
        orderNo,
        status: refreshedOrder?.status || order.status,
        paymentProvider: order.paymentProvider,
        paymentStatus: session?.paymentStatus,
        checkoutUrl: refreshedOrder?.checkoutUrl || order.checkoutUrl,
        paidAt: refreshedOrder?.paidAt || null,
      },
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return Response.json(
      {
        code: -1,
        message: 'Failed to check payment status',
      },
      { status: 500 }
    );
  }
}
