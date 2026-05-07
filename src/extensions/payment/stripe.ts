/* eslint-disable no-useless-catch */
import Stripe from 'stripe';

import {
  CheckoutSession,
  PaymentBilling,
  PaymentEventType,
  PaymentInterval,
  PaymentInvoice,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
  type PaymentConfigs,
  type PaymentEvent,
  type PaymentOrder,
  type PaymentProvider,
  type PaymentSession,
} from './types';

/**
 * Stripe payment provider configs
 * @docs https://stripe.com/docs
 */
export interface StripeConfigs extends PaymentConfigs {
  secretKey: string;
  publishableKey: string;
  signingSecret?: string;
  apiVersion?: string;
  allowedPaymentMethods?: string[];
  allowPromotionCodes?: boolean;
}

/**
 * Stripe payment provider implementation
 * @website https://stripe.com/
 */
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  configs: StripeConfigs;

  private client: Stripe;

  constructor(configs: StripeConfigs) {
    this.configs = configs;
    this.client = new Stripe(configs.secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      // check payment price
      if (!order.price) {
        throw new Error('price is required');
      }

      // create payment with dynamic product

      // build price data
      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData =
        {
          currency: order.price.currency,
          unit_amount: order.price.amount, // unit: cents
          product_data: {
            name: order.description || '',
          },
        };

      if (order.type === PaymentType.SUBSCRIPTION) {
        // create subscription payment

        // check payment plan
        if (!order.plan) {
          throw new Error('plan is required');
        }

        // build recurring data
        priceData.recurring = {
          interval: order.plan
            .interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
        };
      } else {
        // create one-time payment
      }

      // set or create customer
      let customerId = '';
      if (order.customer?.email) {
        const customers = await this.client.customers.list({
          email: order.customer.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await this.client.customers.create({
            email: order.customer.email,
            name: order.customer.name,
            metadata: order.customer.metadata,
          });
          customerId = customer.id;
        }
      }

      // create payment session params
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode:
          order.type === PaymentType.SUBSCRIPTION ? 'subscription' : 'payment',
        ui_mode: 'embedded',
        redirect_on_completion: 'if_required',
        line_items: [
          {
            price_data: priceData,
            quantity: 1,
          },
        ],
      };

      // pre-set promotion code
      if (order.discount && order.discount.code) {
        sessionParams.discounts = [
          {
            promotion_code: order.discount.code,
          },
        ];
      }

      // allow user input promotion code
      if (this.configs.allowPromotionCodes && !sessionParams.discounts) {
        sessionParams.allow_promotion_codes = true;
      }

      // If currency is CNY, enable WeChat Pay and Alipay (only for one-time payments)
      // Note: WeChat Pay and Alipay through Stripe only supports one-time payments, not subscriptions
      const currency = order.price.currency.toLowerCase();
      if (currency === 'cny' && order.type === PaymentType.ONE_TIME) {
        // Enable WeChat Pay and Alipay for CNY one-time payments
        sessionParams.payment_method_types = [];
        sessionParams.payment_method_options = {};

        // get allowed payment methods
        const allowedPaymentMethods = this.configs.allowedPaymentMethods || [];

        if (allowedPaymentMethods.includes('card')) {
          sessionParams.payment_method_types.push('card');
        }
        if (allowedPaymentMethods.includes('wechat_pay')) {
          sessionParams.payment_method_types.push('wechat_pay');
          sessionParams.payment_method_options.wechat_pay = {
            client: 'web',
          };
        }
        if (allowedPaymentMethods.includes('alipay')) {
          sessionParams.payment_method_types.push('alipay');
          sessionParams.payment_method_options.alipay = {};
        }

        if (allowedPaymentMethods.length === 0) {
          // not set allowed payment methods, use default payment methods
          sessionParams.payment_method_types = ['card'];
        }
      }

      if (order.type === PaymentType.ONE_TIME) {
        sessionParams.invoice_creation = {
          enabled: true,
        };
      }

      if (customerId) {
        sessionParams.customer = customerId;
      }

      if (order.metadata) {
        sessionParams.metadata = order.metadata;

        if (order.type === PaymentType.SUBSCRIPTION) {
          sessionParams.subscription_data = {
            metadata: order.metadata,
          };
        } else {
          sessionParams.payment_intent_data = {
            metadata: order.metadata,
          };
          sessionParams.invoice_creation = {
            enabled: true,
            invoice_data: {
              metadata: order.metadata,
            },
          };
        }
      }

      if (!order.successUrl) {
        throw new Error('return_url is required');
      }
      sessionParams.return_url = order.successUrl;

      const session = await this.client.checkout.sessions.create(sessionParams);
      if (!session.id || !session.client_secret) {
        throw new Error('create payment failed');
      }

      const checkoutResult = { ...session } as Record<string, unknown>;
      delete checkoutResult.client_secret;

      return {
        provider: this.name,
        checkoutParams: sessionParams,
        checkoutInfo: {
          sessionId: session.id,
          checkoutUrl: session.url ?? null,
          clientSecret: session.client_secret,
          flow: 'embedded',
        },
        checkoutResult,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment session by session id
   */
  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      if (!sessionId) {
        throw new Error('sessionId is required');
      }

      const session = await this.client.checkout.sessions.retrieve(sessionId);

      return await this.buildPaymentSessionFromCheckoutSession(session);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment event from webhook notification
   */
  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get('stripe-signature') as string;

      if (!rawBody || !signature) {
        throw new Error('Invalid webhook request');
      }

      if (!this.configs.signingSecret) {
        throw new Error('Signing Secret not configured');
      }

      const event = this.client.webhooks.constructEvent(
        rawBody,
        signature,
        this.configs.signingSecret
      );

      let paymentSession: PaymentSession | undefined = undefined;

      const eventType = this.mapStripeEventType(event.type);

      if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromCheckoutSession(
          event.data.object as Stripe.Response<Stripe.Checkout.Session>
        );
      } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromInvoice(
          event.data.object as Stripe.Response<Stripe.Invoice>
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.data.object as Stripe.Response<Stripe.Subscription>
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.data.object as Stripe.Response<Stripe.Subscription>
        );
      } else if (
        event.type === 'radar.early_fraud_warning.created' ||
        event.type === 'charge.dispute.created' ||
        event.type === 'charge.refunded'
      ) {
        paymentSession = await this.buildPaymentSessionFromRiskEvent(
          event.data.object as
            | Stripe.Response<Stripe.Radar.EarlyFraudWarning>
            | Stripe.Response<Stripe.Dispute>
            | Stripe.Response<Stripe.Charge>
        );
      }

      if (!paymentSession) {
        throw new Error('Invalid webhook event');
      }

      return {
        eventId: event.id,
        eventType: eventType,
        rawEventType: event.type,
        eventResult: event,
        paymentSession: paymentSession,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentInvoice({
    invoiceId,
  }: {
    invoiceId: string;
  }): Promise<PaymentInvoice> {
    try {
      const invoice = await this.client.invoices.retrieve(invoiceId);
      if (!invoice.id) {
        throw new Error('Invoice not found');
      }

      return {
        invoiceId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentBilling({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling> {
    try {
      const billing = await this.client.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      if (!billing.url) {
        throw new Error('get billing url failed');
      }

      return {
        billingUrl: billing.url,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    try {
      if (!subscriptionId) {
        throw new Error('subscriptionId is required');
      }

      const subscription =
        await this.client.subscriptions.cancel(subscriptionId);

      if (!subscription.canceled_at) {
        throw new Error('Cancel subscription failed');
      }

      return await this.buildPaymentSessionFromSubscription(subscription);
    } catch (error) {
      throw error;
    }
  }

  async refundPayment({
    input,
  }: {
    input: PaymentRefundInput;
  }): Promise<PaymentRefundResult> {
    try {
      if (!input.chargeId && !input.paymentIntentId) {
        throw new Error('chargeId or paymentIntentId is required');
      }

      const refund = await this.client.refunds.create({
        charge: input.chargeId,
        payment_intent: input.paymentIntentId,
        amount: input.amount,
        reason: input.reason,
        metadata: input.metadata,
      });

      if (!refund.id) {
        throw new Error('refund payment failed');
      }

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency,
        refundResult: refund,
      };
    } catch (error) {
      throw error;
    }
  }

  private mapStripeEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case 'checkout.session.completed':
        return PaymentEventType.CHECKOUT_SUCCESS;
      case 'invoice.payment_succeeded':
        return PaymentEventType.PAYMENT_SUCCESS;
      case 'invoice.payment_failed':
        return PaymentEventType.PAYMENT_FAILED;
      case 'customer.subscription.updated':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'customer.subscription.deleted':
        return PaymentEventType.SUBSCRIBE_CANCELED;
      case 'radar.early_fraud_warning.created':
        return PaymentEventType.PAYMENT_FAILED;
      case 'charge.dispute.created':
        return PaymentEventType.PAYMENT_FAILED;
      case 'charge.refunded':
        return PaymentEventType.PAYMENT_REFUNDED;
      default:
        throw new Error(`Unknown Stripe event type: ${eventType}`);
    }
  }

  private getStripeId(
    value:
      | string
      | Stripe.Invoice
      | Stripe.PaymentIntent
      | Stripe.Charge
      | Stripe.Dispute
      | Stripe.Radar.EarlyFraudWarning
      | null
      | undefined
  ): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    return typeof value.id === 'string' ? value.id : undefined;
  }

  private async resolveCheckoutSessionPaidAt(
    session: Stripe.Checkout.Session
  ): Promise<Date | undefined> {
    try {
      const invoiceId = this.getStripeId(session.invoice);
      if (invoiceId) {
        const invoice = await this.client.invoices.retrieve(invoiceId);
        if (invoice.status_transitions?.paid_at) {
          return new Date(invoice.status_transitions.paid_at * 1000);
        }

        if (invoice.created) {
          return new Date(invoice.created * 1000);
        }
      }

      const paymentIntentId = this.getStripeId(session.payment_intent);
      if (paymentIntentId) {
        const paymentIntent = await this.client.paymentIntents.retrieve(
          paymentIntentId,
          {
            expand: ['latest_charge'],
          }
        );

        if (
          typeof paymentIntent.latest_charge === 'object' &&
          paymentIntent.latest_charge?.created
        ) {
          return new Date(paymentIntent.latest_charge.created * 1000);
        }

        if (paymentIntent.created) {
          return new Date(paymentIntent.created * 1000);
        }
      }
    } catch (error) {
      console.warn('[stripe] resolve checkout session paid_at failed', {
        sessionId: session.id,
        error,
      });
    }

    return session.created ? new Date(session.created * 1000) : undefined;
  }

  private async findCheckoutSessionByPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.Checkout.Session | null> {
    const sessions = await this.client.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });

    return sessions.data[0] || null;
  }

  private async findInvoiceByPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.Invoice | null> {
    const invoices = await this.client.invoices.list({
      payment_intent: paymentIntentId,
      limit: 1,
    } as unknown as Stripe.InvoiceListParams);

    return invoices.data[0] || null;
  }

  private async buildPaymentSessionFromRiskEvent(
    eventObject: Stripe.Radar.EarlyFraudWarning | Stripe.Dispute | Stripe.Charge
  ): Promise<PaymentSession> {
    let paymentIntentId: string | undefined;
    let fallbackMetadata: Record<string, string> | undefined;
    let fallbackTransactionId: string | undefined;
    let fallbackAmount = 0;
    let fallbackCurrency = '';

    if (eventObject.object === 'radar.early_fraud_warning') {
      paymentIntentId = this.getStripeId(eventObject.payment_intent);
      fallbackTransactionId = eventObject.id;
      if (typeof eventObject.charge === 'object' && eventObject.charge) {
        fallbackMetadata = eventObject.charge.metadata || undefined;
        fallbackAmount = eventObject.charge.amount || 0;
        fallbackCurrency = eventObject.charge.currency || '';
      }
    } else if (eventObject.object === 'dispute') {
      paymentIntentId = this.getStripeId(eventObject.payment_intent);
      fallbackTransactionId = eventObject.id;
      fallbackMetadata = eventObject.metadata || undefined;
      fallbackAmount = eventObject.amount || 0;
      fallbackCurrency = eventObject.currency || '';
    } else {
      paymentIntentId = this.getStripeId(eventObject.payment_intent);
      fallbackTransactionId = eventObject.id;
      fallbackMetadata = eventObject.metadata || undefined;
      fallbackAmount = eventObject.amount || 0;
      fallbackCurrency = eventObject.currency || '';
    }

    if (paymentIntentId) {
      const checkoutSession =
        await this.findCheckoutSessionByPaymentIntent(paymentIntentId);
      if (checkoutSession) {
        return this.buildPaymentSessionFromCheckoutSession(checkoutSession);
      }

      const invoice = await this.findInvoiceByPaymentIntent(paymentIntentId);
      if (invoice) {
        return this.buildPaymentSessionFromInvoice(invoice);
      }
    }

    return {
      provider: this.name,
      paymentInfo: {
        transactionId: fallbackTransactionId,
        paymentAmount: fallbackAmount,
        paymentCurrency: fallbackCurrency,
      },
      paymentResult: eventObject,
      metadata: fallbackMetadata,
    };
  }

  private mapStripeStatus(session: Stripe.Checkout.Session): PaymentStatus {
    switch (session.status) {
      case 'complete':
        // session complete, check payment status
        switch (session.payment_status) {
          case 'paid':
            // payment success
            return PaymentStatus.SUCCESS;
          case 'unpaid':
            // payment failed
            return PaymentStatus.PROCESSING;
          case 'no_payment_required':
            // means payment not required, should be success
            return PaymentStatus.SUCCESS;
          default:
            throw new Error(
              `Unknown Stripe payment status: ${session.payment_status}`
            );
        }
      case 'expired':
        // payment canceled
        return PaymentStatus.CANCELED;
      case 'open':
        return PaymentStatus.PROCESSING;
      default:
        throw new Error(`Unknown Stripe status: ${session.status}`);
    }
  }

  // build payment session from checkout session
  private async buildPaymentSessionFromCheckoutSession(
    session: Stripe.Checkout.Session
  ): Promise<PaymentSession> {
    let subscription: Stripe.Subscription | undefined = undefined;

    if (session.subscription) {
      subscription = await this.client.subscriptions.retrieve(
        session.subscription as string
      );
    }

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapStripeStatus(session),
      paymentInfo: {
        transactionId: session.id,
        discountCode: session.discounts?.find(
          (discount) => discount.promotion_code
        )?.promotion_code as string,
        discountAmount: session.total_details?.amount_discount || 0,
        discountCurrency: session.currency || '',
        paymentAmount: session.amount_total || 0,
        paymentCurrency: session.currency || '',
        paymentEmail:
          session.customer_email ||
          session.customer_details?.email ||
          undefined,
        paymentUserName: session.customer_details?.name || '',
        paymentUserId: session.customer
          ? (session.customer as string)
          : undefined,
        paidAt: await this.resolveCheckoutSessionPaidAt(session),
        invoiceId: session.invoice ? (session.invoice as string) : undefined,
        invoiceUrl: '',
      },
      paymentResult: session,
      metadata: session.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from invoice
  private async buildPaymentSessionFromInvoice(
    invoice: Stripe.Invoice
  ): Promise<PaymentSession> {
    let subscription: Stripe.Subscription | undefined = undefined;

    if (invoice.lines.data.length > 0) {
      const data = invoice.lines.data[0];
      let subscriptionId = '';

      // get subscription id from invoice line data
      if (data.subscription) {
        subscriptionId = data.subscription as string;
      } else if (
        data.parent &&
        data.parent.subscription_item_details &&
        data.parent.subscription_item_details.subscription
      ) {
        subscriptionId = data.parent.subscription_item_details
          .subscription as string;
      }

      if (subscriptionId) {
        subscription = await this.client.subscriptions.retrieve(subscriptionId);
      }
    }

    const result: PaymentSession = {
      provider: this.name,

      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: {
        transactionId: invoice.id,
        discountCode: '',
        discountAmount: invoice.total_discount_amounts
          ? invoice.total_discount_amounts[0].amount
          : 0,
        discountCurrency: invoice.currency || '',
        paymentAmount: invoice.amount_paid,
        paymentCurrency: invoice.currency,
        paymentEmail: invoice.customer_email || '',
        paymentUserName: invoice.customer_name || '',
        paymentUserId: invoice.customer
          ? (invoice.customer as string)
          : undefined,
        paidAt: invoice.created ? new Date(invoice.created * 1000) : undefined,
        invoiceId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || '',
        subscriptionCycleType:
          invoice.billing_reason === 'subscription_create'
            ? SubscriptionCycleType.CREATE
            : invoice.billing_reason === 'subscription_cycle'
              ? SubscriptionCycleType.RENEWAL
              : undefined,
      },
      paymentResult: invoice,
      metadata: invoice.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from invoice
  private async buildPaymentSessionFromSubscription(
    subscription: Stripe.Subscription
  ): Promise<PaymentSession> {
    const result: PaymentSession = {
      provider: this.name,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build subscription info from subscription
  private async buildSubscriptionInfo(
    subscription: Stripe.Subscription
  ): Promise<SubscriptionInfo> {
    // subscription data
    const data = subscription.items.data[0];

    const subscriptionInfo: SubscriptionInfo = {
      subscriptionId: subscription.id,
      productId: data.price.product as string,
      planId: data.price.id,
      description: '',
      amount: data.price.unit_amount || 0,
      currency: data.price.currency,
      currentPeriodStart: new Date(data.current_period_start * 1000),
      currentPeriodEnd: new Date(data.current_period_end * 1000),
      interval: data.plan.interval as PaymentInterval,
      intervalCount: data.plan.interval_count || 1,
      metadata: subscription.metadata,
    };

    if (subscription.status === 'active') {
      if (subscription.cancel_at) {
        subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
        // cancel apply at
        subscriptionInfo.canceledAt = new Date(
          (subscription.canceled_at || 0) * 1000
        );
        // cancel end date
        subscriptionInfo.canceledEndAt = new Date(
          subscription.cancel_at * 1000
        );
        subscriptionInfo.canceledReason =
          subscription.cancellation_details?.comment || '';
        subscriptionInfo.canceledReasonType =
          subscription.cancellation_details?.feedback || '';
      } else {
        subscriptionInfo.status = SubscriptionStatus.ACTIVE;
      }
    } else if (subscription.status === 'trialing') {
      subscriptionInfo.status = SubscriptionStatus.TRIALING;
    } else if (
      subscription.status === 'paused' ||
      subscription.status === 'past_due' ||
      subscription.status === 'unpaid'
    ) {
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    } else if (subscription.status === 'incomplete') {
      subscriptionInfo.status = SubscriptionStatus.PENDING;
    } else if (subscription.status === 'incomplete_expired') {
      subscriptionInfo.status = SubscriptionStatus.EXPIRED;
      subscriptionInfo.canceledReasonType = 'incomplete_expired';
    } else if (subscription.status === 'canceled') {
      // subscription canceled
      subscriptionInfo.status = SubscriptionStatus.CANCELED;
      subscriptionInfo.canceledAt = new Date(
        (subscription.canceled_at || 0) * 1000
      );
      subscriptionInfo.canceledReason =
        subscription.cancellation_details?.comment || '';
      subscriptionInfo.canceledReasonType =
        subscription.cancellation_details?.feedback || '';
    } else {
      throw new Error(
        `Unknown Stripe subscription status: ${subscription.status}`
      );
    }

    return subscriptionInfo;
  }
}

/**
 * Create Stripe provider with configs
 */
export function createStripeProvider(configs: StripeConfigs): StripeProvider {
  return new StripeProvider(configs);
}
