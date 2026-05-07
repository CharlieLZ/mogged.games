import {
  CreemProvider,
  PaymentManager,
  PayPalProvider,
  StripeProvider,
} from '@/extensions/payment';
import {
  PaymentSession,
  PaymentStatus,
  PaymentType,
} from '@/extensions/payment/types';
import type { Configs } from '@/shared/models/config';
import {
  hasCreemCheckoutConfigs,
  hasPayPalCheckoutConfigs,
  hasStripeCheckoutConfigs,
  parsePaymentMethodList,
} from '@/shared/lib/payment-config';

import { getSnowId, getUuid } from '../lib/hash';
import {
  calculateCreditExpirationTime,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  NewCredit,
  scheduleCreditGrantNotification,
} from '../models/credit';
import {
  NewOrder,
  Order,
  OrderStatus,
  UpdateOrder,
  updateOrderByOrderNo,
  updateOrderInTransaction,
  updateSubscriptionInTransaction,
} from '../models/order';
import {
  NewSubscription,
  Subscription,
  SubscriptionStatus,
  UpdateSubscription,
  updateSubscriptionBySubscriptionNo,
} from '../models/subscription';
import { createConfigBackedServiceGetter } from './config-service-cache';
import {
  applyManagerRegistrations,
  hasEnabledConfig,
  whenConfigs,
} from './manager-registry';

const paymentManagerRegistrations = [
  whenConfigs<PaymentManager>(
    (configs) =>
      hasEnabledConfig('stripe_enabled')(configs) &&
      hasStripeCheckoutConfigs(configs),
    (manager, configs) => {
      const allowedPaymentMethods = parsePaymentMethodList(
        configs.stripe_payment_methods
      );

      manager.addProvider(
        new StripeProvider({
          secretKey: configs.stripe_secret_key,
          publishableKey: configs.stripe_publishable_key,
          signingSecret: configs.stripe_signing_secret,
          allowedPaymentMethods: allowedPaymentMethods as string[],
          allowPromotionCodes: configs.stripe_allow_promotion_codes === 'true',
        }),
        configs.default_payment_provider === 'stripe'
      );
    }
  ),
  whenConfigs<PaymentManager>(
    (configs) =>
      hasEnabledConfig('creem_enabled')(configs) &&
      hasCreemCheckoutConfigs(configs),
    (manager, configs) => {
      manager.addProvider(
        new CreemProvider({
          apiKey: configs.creem_api_key,
          environment:
            configs.creem_environment === 'production'
              ? 'production'
              : 'sandbox',
          signingSecret: configs.creem_signing_secret,
        }),
        configs.default_payment_provider === 'creem'
      );
    }
  ),
  whenConfigs<PaymentManager>(
    (configs) =>
      hasEnabledConfig('paypal_enabled')(configs) &&
      hasPayPalCheckoutConfigs(configs),
    (manager, configs) => {
      manager.addProvider(
        new PayPalProvider({
          clientId: configs.paypal_client_id,
          clientSecret: configs.paypal_client_secret,
          webhookId: configs.paypal_webhook_id,
          environment:
            configs.paypal_environment === 'production'
              ? 'production'
              : 'sandbox',
        }),
        configs.default_payment_provider === 'paypal'
      );
    }
  ),
] as const;

/**
 * get payment service with configs
 */
export function getPaymentServiceWithConfigs(configs: Configs) {
  return applyManagerRegistrations(
    new PaymentManager(),
    configs,
    paymentManagerRegistrations
  );
}

/**
 * get payment service instance
 */
export const getPaymentService = createConfigBackedServiceGetter(
  getPaymentServiceWithConfigs
);

/**
 * handle checkout success
 */
export async function handleCheckoutSuccess({
  order,
  session,
}: {
  order: Order; // checkout order
  session: PaymentSession; // payment session
}) {
  const orderNo = order.orderNo;
  if (!orderNo) {
    throw new Error('invalid order');
  }

  if (order.paymentType === PaymentType.SUBSCRIPTION) {
    if (!session.subscriptionId || !session.subscriptionInfo) {
      throw new Error('subscription id or subscription info not found');
    }
  }

  // payment success
  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    // update order status to be paid
    const updateOrder: UpdateOrder = {
      status: OrderStatus.PAID,
      paymentResult: session.paymentResult,
      paymentAmount: session.paymentInfo?.paymentAmount,
      paymentCurrency: session.paymentInfo?.paymentCurrency,
      discountAmount: session.paymentInfo?.discountAmount,
      discountCurrency: session.paymentInfo?.discountCurrency,
      discountCode: session.paymentInfo?.discountCode,
      paymentEmail: session.paymentInfo?.paymentEmail,
      paidAt: session.paymentInfo?.paidAt,
      invoiceId: session.paymentInfo?.invoiceId,
      invoiceUrl: session.paymentInfo?.invoiceUrl,
      subscriptionNo: '',
      transactionId: session.paymentInfo?.transactionId,
      paymentUserName: session.paymentInfo?.paymentUserName,
      paymentUserId: session.paymentInfo?.paymentUserId,
    };

    // new subscription
    let newSubscription: NewSubscription | undefined = undefined;
    const subscriptionInfo = session.subscriptionInfo;

    // subscription first payment
    if (subscriptionInfo) {
      // new subscription
      newSubscription = {
        id: getUuid(),
        subscriptionNo: getSnowId(),
        userId: order.userId,
        userEmail: order.paymentEmail || order.userEmail,
        status: subscriptionInfo.status || SubscriptionStatus.ACTIVE,
        paymentProvider: order.paymentProvider,
        subscriptionId: subscriptionInfo.subscriptionId,
        subscriptionResult: session.subscriptionResult,
        productId: order.productId,
        description: subscriptionInfo.description || 'Subscription Created',
        amount: subscriptionInfo.amount,
        currency: subscriptionInfo.currency,
        interval: subscriptionInfo.interval,
        intervalCount: subscriptionInfo.intervalCount,
        trialPeriodDays: subscriptionInfo.trialPeriodDays,
        currentPeriodStart: subscriptionInfo.currentPeriodStart,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        billingUrl: subscriptionInfo.billingUrl,
        planName: order.planName || order.productName,
        productName: order.productName,
        creditsAmount: order.creditsAmount,
        creditsValidDays: order.creditsValidDays,
        paymentProductId: order.paymentProductId,
        paymentUserId: session.paymentInfo?.paymentUserId,
      };

      updateOrder.subscriptionNo = newSubscription.subscriptionNo;
      updateOrder.subscriptionId = session.subscriptionId;
      updateOrder.subscriptionResult = JSON.stringify(
        session.subscriptionResult
      );
    }

    // grant credit for order
    let newCredit: NewCredit | undefined = undefined;
    if (order.creditsAmount && order.creditsAmount > 0) {
      const credits = order.creditsAmount;
      const expiresAt =
        credits > 0
          ? calculateCreditExpirationTime({
              creditsValidDays: order.creditsValidDays || 0,
              currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
            })
          : null;

      newCredit = {
        id: getUuid(),
        userId: order.userId,
        userEmail: order.userEmail,
        orderNo: order.orderNo,
        subscriptionNo: newSubscription?.subscriptionNo,
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.GRANT,
        transactionScene:
          order.paymentType === PaymentType.SUBSCRIPTION
            ? CreditTransactionScene.SUBSCRIPTION
            : CreditTransactionScene.PAYMENT,
        credits: credits,
        remainingCredits: credits,
        description: `Grant credit`,
        expiresAt: expiresAt,
        status: CreditStatus.ACTIVE,
      };
    }

    const result = await updateOrderInTransaction({
      orderNo,
      updateOrder,
      newSubscription,
      newCredit,
    });

    if (result?.credit && result?.creditCreated) {
      await scheduleCreditGrantNotification({
        credit: result.credit,
        email:
          session.paymentInfo?.paymentEmail ||
          order.paymentEmail ||
          order.userEmail ||
          undefined,
        name:
          session.paymentInfo?.paymentUserName ||
          order.paymentUserName ||
          undefined,
        source:
          order.paymentType === PaymentType.SUBSCRIPTION
            ? 'subscription_checkout'
            : 'payment_checkout',
      });
    }

    return result;
  } else if (
    session.paymentStatus === PaymentStatus.FAILED ||
    session.paymentStatus === PaymentStatus.CANCELED
  ) {
    // update order status to be failed
    return await updateOrderByOrderNo(orderNo, {
      status: OrderStatus.FAILED,
      paymentResult: session.paymentResult,
    });
  } else if (session.paymentStatus === PaymentStatus.PROCESSING) {
    // update order payment result
    return await updateOrderByOrderNo(orderNo, {
      paymentResult: session.paymentResult,
    });
  } else {
    throw new Error('unknown payment status');
  }
}

/**
 * handle payment success
 */
export async function handlePaymentSuccess({
  order,
  session,
}: {
  order: Order; // checkout order
  session: PaymentSession; // payment session
}) {
  const orderNo = order.orderNo;
  if (!orderNo) {
    throw new Error('invalid order');
  }

  if (order.paymentType === PaymentType.SUBSCRIPTION) {
    if (!session.subscriptionId || !session.subscriptionInfo) {
      throw new Error('subscription id or subscription info not found');
    }
  }

  // payment success
  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    // update order status to be paid
    const updateOrder: UpdateOrder = {
      status: OrderStatus.PAID,
      paymentResult: session.paymentResult,
      paymentAmount: session.paymentInfo?.paymentAmount,
      paymentCurrency: session.paymentInfo?.paymentCurrency,
      discountAmount: session.paymentInfo?.discountAmount,
      discountCurrency: session.paymentInfo?.discountCurrency,
      discountCode: session.paymentInfo?.discountCode,
      paymentEmail: session.paymentInfo?.paymentEmail,
      paymentUserName: session.paymentInfo?.paymentUserName,
      paymentUserId: session.paymentInfo?.paymentUserId,
      paidAt: session.paymentInfo?.paidAt,
      invoiceId: session.paymentInfo?.invoiceId,
      invoiceUrl: session.paymentInfo?.invoiceUrl,
    };

    // new subscription
    let newSubscription: NewSubscription | undefined = undefined;
    const subscriptionInfo = session.subscriptionInfo;

    // subscription first payment
    if (subscriptionInfo) {
      // new subscription
      newSubscription = {
        id: getUuid(),
        subscriptionNo: getSnowId(),
        userId: order.userId,
        userEmail: order.paymentEmail || order.userEmail,
        status: SubscriptionStatus.ACTIVE,
        paymentProvider: order.paymentProvider,
        subscriptionId: subscriptionInfo.subscriptionId,
        subscriptionResult: session.subscriptionResult,
        productId: order.productId,
        description: subscriptionInfo.description,
        amount: subscriptionInfo.amount,
        currency: subscriptionInfo.currency,
        interval: subscriptionInfo.interval,
        intervalCount: subscriptionInfo.intervalCount,
        trialPeriodDays: subscriptionInfo.trialPeriodDays,
        currentPeriodStart: subscriptionInfo.currentPeriodStart,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        planName: order.planName || order.productName,
        billingUrl: subscriptionInfo.billingUrl,
        productName: order.productName,
        creditsAmount: order.creditsAmount,
        creditsValidDays: order.creditsValidDays,
        paymentProductId: order.paymentProductId,
        paymentUserId: session.paymentInfo?.paymentUserId,
      };

      updateOrder.subscriptionId = session.subscriptionId;
      updateOrder.subscriptionResult = JSON.stringify(
        session.subscriptionResult
      );
    }

    // grant credit for order
    let newCredit: NewCredit | undefined = undefined;
    if (order.creditsAmount && order.creditsAmount > 0) {
      const credits = order.creditsAmount;
      const expiresAt =
        credits > 0
          ? calculateCreditExpirationTime({
              creditsValidDays: order.creditsValidDays || 0,
              currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
            })
          : null;

      newCredit = {
        id: getUuid(),
        userId: order.userId,
        userEmail: order.userEmail,
        orderNo: order.orderNo,
        subscriptionNo: newSubscription?.subscriptionNo,
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.GRANT,
        transactionScene:
          order.paymentType === PaymentType.SUBSCRIPTION
            ? CreditTransactionScene.SUBSCRIPTION
            : CreditTransactionScene.PAYMENT,
        credits: credits,
        remainingCredits: credits,
        description: `Grant credit`,
        expiresAt: expiresAt,
        status: CreditStatus.ACTIVE,
      };
    }

    const result = await updateOrderInTransaction({
      orderNo,
      updateOrder,
      newSubscription,
      newCredit,
    });

    if (result?.credit && result?.creditCreated) {
      await scheduleCreditGrantNotification({
        credit: result.credit,
        email:
          session.paymentInfo?.paymentEmail ||
          order.paymentEmail ||
          order.userEmail ||
          undefined,
        name:
          session.paymentInfo?.paymentUserName ||
          order.paymentUserName ||
          undefined,
        source:
          order.paymentType === PaymentType.SUBSCRIPTION
            ? 'subscription_payment'
            : 'payment_success',
      });
    }

    return result;
  } else {
    throw new Error('unknown payment status');
  }
}

export async function handleSubscriptionRenewal({
  subscription,
  session,
}: {
  subscription: Subscription; // subscription
  session: PaymentSession; // payment session
}) {
  const subscriptionNo = subscription.subscriptionNo;
  if (!subscriptionNo || !subscription.amount || !subscription.currency) {
    throw new Error('invalid subscription');
  }

  if (!session.subscriptionId || !session.subscriptionInfo) {
    throw new Error('invalid payment session');
  }
  if (session.subscriptionId !== subscription.subscriptionId) {
    throw new Error('subscription id mismatch');
  }

  const subscriptionInfo = session.subscriptionInfo;
  if (
    !subscriptionInfo ||
    !subscriptionInfo.currentPeriodStart ||
    !subscriptionInfo.currentPeriodEnd
  ) {
    throw new Error('invalid subscription info');
  }

  // payment success
  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    // update subscription period
    const updateSubscription: UpdateSubscription = {
      currentPeriodStart: subscriptionInfo.currentPeriodStart,
      currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
    };

    const orderNo = getSnowId();
    const currentTime = new Date();

    // renewal order
    const order: NewOrder = {
      id: getUuid(),
      orderNo: orderNo,
      userId: subscription.userId,
      userEmail: subscription.userEmail,
      status: OrderStatus.PAID,
      amount: subscription.amount,
      currency: subscription.currency,
      productId: subscription.productId,
      paymentType: PaymentType.RENEW,
      paymentInterval: subscription.interval,
      paymentProvider: session.provider || subscription.paymentProvider,
      checkoutInfo: { source: 'subscription_renewal' },
      createdAt: currentTime,
      productName: subscription.productName,
      description: 'Subscription Renewal',
      callbackUrl: '',
      creditsAmount: subscription.creditsAmount,
      creditsValidDays: subscription.creditsValidDays,
      planName: subscription.planName || '',
      paymentProductId: subscription.paymentProductId,
      paymentResult: session.paymentResult,
      paymentAmount: session.paymentInfo?.paymentAmount,
      paymentCurrency: session.paymentInfo?.paymentCurrency,
      discountAmount: session.paymentInfo?.discountAmount,
      discountCurrency: session.paymentInfo?.discountCurrency,
      discountCode: session.paymentInfo?.discountCode,
      paymentEmail: session.paymentInfo?.paymentEmail,
      paymentUserId: session.paymentInfo?.paymentUserId,
      paidAt: session.paymentInfo?.paidAt,
      invoiceId: session.paymentInfo?.invoiceId,
      invoiceUrl: session.paymentInfo?.invoiceUrl,
      subscriptionNo: subscription.subscriptionNo,
      transactionId: session.paymentInfo?.transactionId,
      paymentUserName: session.paymentInfo?.paymentUserName,
      subscriptionId: session.subscriptionId,
      subscriptionResult: session.subscriptionResult,
    };

    // grant credit for renewal order
    let newCredit: NewCredit | undefined = undefined;
    if (order.creditsAmount && order.creditsAmount > 0) {
      const credits = order.creditsAmount;
      const expiresAt =
        credits > 0
          ? calculateCreditExpirationTime({
              creditsValidDays: order.creditsValidDays || 0,
              currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
            })
          : null;

      newCredit = {
        id: getUuid(),
        userId: order.userId,
        userEmail: order.userEmail,
        orderNo: order.orderNo,
        subscriptionNo: subscription.subscriptionNo,
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.GRANT,
        transactionScene: CreditTransactionScene.RENEWAL,
        credits: credits,
        remainingCredits: credits,
        description: `Grant credit`,
        expiresAt: expiresAt,
        status: CreditStatus.ACTIVE,
      };
    }

    const result = await updateSubscriptionInTransaction({
      subscriptionNo,
      updateSubscription,
      newOrder: order,
      newCredit,
    });

    if (result?.credit && result?.creditCreated) {
      await scheduleCreditGrantNotification({
        credit: result.credit,
        email:
          session.paymentInfo?.paymentEmail ||
          subscription.userEmail ||
          undefined,
        name: session.paymentInfo?.paymentUserName || undefined,
        source: 'subscription_renewal',
      });
    }

    return result;
  } else {
    throw new Error('unknown payment status');
  }
}

export async function handleSubscriptionUpdated({
  subscription,
  session,
}: {
  subscription: Subscription; // subscription
  session: PaymentSession; // payment session
}) {
  const subscriptionNo = subscription.subscriptionNo;
  if (!subscriptionNo || !subscription.amount || !subscription.currency) {
    throw new Error('invalid subscription');
  }

  const subscriptionInfo = session.subscriptionInfo;
  if (!subscriptionInfo || !subscriptionInfo.status) {
    throw new Error('invalid subscription info');
  }

  const updateSubscriptionStatus: SubscriptionStatus = subscriptionInfo.status;

  return await updateSubscriptionBySubscriptionNo(subscriptionNo, {
    status: updateSubscriptionStatus,
    currentPeriodStart: subscriptionInfo.currentPeriodStart,
    currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
    canceledAt: subscriptionInfo.canceledAt || null,
    canceledEndAt: subscriptionInfo.canceledEndAt || null,
    canceledReason: subscriptionInfo.canceledReason || '',
    canceledReasonType: subscriptionInfo.canceledReasonType || '',
  });

  // console.log('handle subscription updated', subscriptionInfo);
}

export async function handleSubscriptionCanceled({
  subscription,
  session,
}: {
  subscription: Subscription; // subscription
  session: PaymentSession; // payment session
}) {
  const subscriptionNo = subscription.subscriptionNo;
  if (!subscriptionNo || !subscription.amount || !subscription.currency) {
    throw new Error('invalid subscription');
  }

  const subscriptionInfo = session.subscriptionInfo;
  if (
    !subscriptionInfo ||
    !subscriptionInfo.status ||
    !subscriptionInfo.canceledAt
  ) {
    throw new Error('invalid subscription info');
  }

  return await updateSubscriptionBySubscriptionNo(subscriptionNo, {
    status: subscriptionInfo.status,
    canceledAt: subscriptionInfo.canceledAt,
    canceledEndAt: subscriptionInfo.canceledEndAt,
    canceledReason: subscriptionInfo.canceledReason,
    canceledReasonType: subscriptionInfo.canceledReasonType,
  });

  // console.log('handle subscription canceled', subscriptionInfo);
}
