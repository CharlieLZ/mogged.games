/* eslint-disable no-useless-catch */
import { getAppName } from '@/shared/lib/brand';

import {
  CheckoutSession,
  PaymentConfigs,
  PaymentEvent,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
} from './types';

const PAYPAL_REQUEST_TIMEOUT_MS = 15_000;
const PAYPAL_MAX_RETRIES = 2;

type PayPalRequestOptions = {
  allowNotFound?: boolean;
  body?: string;
  contentType?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  includeAuth?: boolean;
  retries?: number;
};

class PayPalApiError extends Error {
  status: number;
  responseBody: unknown;

  constructor(message: string, status: number, responseBody: unknown) {
    super(message);
    this.name = 'PayPalApiError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function buildDisplayName(name?: {
  full_name?: string;
  given_name?: string;
  surname?: string;
}) {
  if (!name) {
    return undefined;
  }

  if (name.full_name) {
    return name.full_name;
  }

  const fullName = [name.given_name, name.surname]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || undefined;
}

function centsToPayPalValue(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`invalid PayPal amount: ${amount}`);
  }

  return (amount / 100).toFixed(2);
}

function payPalValueToCents(value?: string | null) {
  if (!value) {
    return 0;
  }

  const normalized = Number.parseFloat(value);
  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.round(normalized * 100);
}

function getApprovalUrl(result: any) {
  return result?.links?.find(
    (link: any) => link.rel === 'approve' || link.rel === 'payer-action'
  )?.href;
}

function buildPayPalErrorMessage(statusText: string, body: any) {
  const base =
    body?.message ||
    body?.error_description ||
    body?.name ||
    statusText ||
    'PayPal request failed';

  const details = Array.isArray(body?.details)
    ? body.details
        .map((detail: any) => detail?.issue || detail?.description)
        .filter(Boolean)
        .join(', ')
    : '';

  return details ? `${base}: ${details}` : base;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function isRetryableError(error: unknown) {
  if (error instanceof PayPalApiError) {
    return isRetryableStatus(error.status);
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'AbortError' || error instanceof TypeError;
}

/**
 * PayPal payment provider configs
 * @docs https://developer.paypal.com/docs/
 */
export interface PayPalConfigs extends PaymentConfigs {
  clientId: string;
  clientSecret: string;
  webhookId?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * PayPal payment provider implementation
 * @website https://www.paypal.com/
 */
export class PayPalProvider implements PaymentProvider {
  readonly name = 'paypal';
  configs: PayPalConfigs;

  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(configs: PayPalConfigs) {
    if (!configs.clientId?.trim()) {
      throw new Error('PayPal clientId is required');
    }

    if (!configs.clientSecret?.trim()) {
      throw new Error('PayPal clientSecret is required');
    }

    this.configs = configs;
    this.baseUrl =
      configs.environment === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      if (order.type === PaymentType.SUBSCRIPTION) {
        return this.createSubscriptionPayment(order);
      }

      await this.ensureAccessToken();

      if (!order.price) {
        throw new Error('price is required');
      }

      const currencyCode = order.price.currency.toUpperCase();
      const unitValue = centsToPayPalValue(order.price.amount);
      const itemName = order.description || 'Payment';

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: order.orderNo || order.metadata?.order_no,
            invoice_id: order.orderNo || undefined,
            description: itemName,
            items: [
              {
                name: itemName,
                unit_amount: {
                  currency_code: currencyCode,
                  value: unitValue,
                },
                quantity: '1',
              },
            ],
            amount: {
              currency_code: currencyCode,
              value: unitValue,
              breakdown: {
                item_total: {
                  currency_code: currencyCode,
                  value: unitValue,
                },
              },
            },
          },
        ],
        application_context: {
          return_url: order.successUrl,
          cancel_url: order.cancelUrl,
          user_action: 'PAY_NOW',
        },
      };

      const result = await this.makeRequest('/v2/checkout/orders', 'POST', {
        body: JSON.stringify(payload),
        idempotencyKey: this.getIdempotencyKey(
          order.requestId || order.orderNo,
          'order'
        ),
      });

      const approvalUrl = getApprovalUrl(result);
      if (!result?.id || !approvalUrl) {
        throw new Error('PayPal order approval url not found');
      }

      return {
        provider: this.name,
        checkoutParams: payload,
        checkoutInfo: {
          sessionId: result.id,
          checkoutUrl: approvalUrl,
        },
        checkoutResult: result,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      if (!sessionId) {
        throw new Error('sessionId is required');
      }

      await this.ensureAccessToken();

      let order = await this.tryGetOrder(sessionId);
      if (order) {
        if (order.status === 'APPROVED') {
          order = await this.captureApprovedOrder(sessionId);
        }

        return this.buildOrderSession(order);
      }

      const subscription = await this.tryGetSubscription(sessionId);
      if (subscription) {
        return this.buildSubscriptionSession(subscription);
      }

      throw new Error(`PayPal session not found: ${sessionId}`);
    } catch (error) {
      throw error;
    }
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const headers = Object.fromEntries(req.headers.entries());

      if (!rawBody) {
        throw new Error('Invalid webhook payload');
      }

      if (!this.configs.webhookId) {
        throw new Error('PayPal webhookId not configured');
      }

      const event = JSON.parse(rawBody);
      if (!event?.event_type) {
        throw new Error('Invalid webhook payload');
      }

      await this.ensureAccessToken();

      const verifyResponse = await this.makeRequest(
        '/v1/notifications/verify-webhook-signature',
        'POST',
        {
          body: JSON.stringify({
            auth_algo: headers['paypal-auth-algo'],
            cert_id: headers['paypal-cert-id'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: this.configs.webhookId,
            webhook_event: event,
          }),
        }
      );

      if (verifyResponse?.verification_status !== 'SUCCESS') {
        throw new Error('Invalid PayPal webhook signature');
      }

      const eventType = this.mapPayPalEventType(event.event_type);
      if (!eventType) {
        throw new Error(`Unhandled PayPal webhook event: ${event.event_type}`);
      }

      const paymentSession = await this.buildWebhookPaymentSession(
        event,
        eventType
      );

      return {
        eventId: typeof event.id === 'string' ? event.id : undefined,
        eventType,
        rawEventType:
          typeof event.event_type === 'string' ? event.event_type : undefined,
        eventResult: event,
        paymentSession,
      };
    } catch (error) {
      throw error;
    }
  }

  private async createSubscriptionPayment(
    order: PaymentOrder
  ): Promise<CheckoutSession> {
    await this.ensureAccessToken();

    if (!order.price) {
      throw new Error('price is required');
    }

    if (!order.plan) {
      throw new Error('plan is required');
    }

    const currencyCode = order.price.currency.toUpperCase();
    const fixedPriceValue = centsToPayPalValue(order.price.amount);
    const planInterval = this.toPayPalIntervalUnit(order.plan.interval);

    const productResponse = await this.makeRequest(
      '/v1/catalogs/products',
      'POST',
      {
        body: JSON.stringify({
          name: order.plan.name,
          description: order.plan.description,
          type: 'SERVICE',
          category: 'SOFTWARE',
        }),
        idempotencyKey: this.getIdempotencyKey(
          order.requestId || order.orderNo,
          'product'
        ),
      }
    );

    const billingCycles: any[] = [
      {
        frequency: {
          interval_unit: planInterval,
          interval_count: order.plan.intervalCount || 1,
        },
        tenure_type: 'REGULAR',
        sequence: order.plan.trialPeriodDays ? 2 : 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: fixedPriceValue,
            currency_code: currencyCode,
          },
        },
      },
    ];

    if (order.plan.trialPeriodDays) {
      billingCycles.unshift({
        frequency: {
          interval_unit: 'DAY',
          interval_count: 1,
        },
        tenure_type: 'TRIAL',
        sequence: 1,
        total_cycles: order.plan.trialPeriodDays,
        pricing_scheme: {
          fixed_price: {
            value: '0.00',
            currency_code: currencyCode,
          },
        },
      });
    }

    const planResponse = await this.makeRequest('/v1/billing/plans', 'POST', {
      body: JSON.stringify({
        product_id: productResponse.id,
        name: order.plan.name,
        description: order.plan.description,
        status: 'ACTIVE',
        billing_cycles: billingCycles,
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      }),
      idempotencyKey: this.getIdempotencyKey(
        order.requestId || order.orderNo,
        'plan'
      ),
    });

    const subscriptionResponse = await this.makeRequest(
      '/v1/billing/subscriptions',
      'POST',
      {
        body: JSON.stringify({
          plan_id: planResponse.id,
          custom_id: order.orderNo || order.metadata?.order_no,
          subscriber: {
            email_address: order.customer?.email,
            name: order.customer?.name
              ? {
                  given_name: order.customer.name.split(' ')[0],
                  surname:
                    order.customer.name.split(' ').slice(1).join(' ') ||
                    undefined,
                }
              : undefined,
          },
          application_context: {
            brand_name: String(order.metadata?.app_name || getAppName()).slice(
              0,
              127
            ),
            locale: 'en-US',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            payment_method: {
              payer_selected: 'PAYPAL',
              payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
            },
            return_url: order.successUrl,
            cancel_url: order.cancelUrl,
          },
        }),
        idempotencyKey: this.getIdempotencyKey(
          order.requestId || order.orderNo,
          'subscription'
        ),
      }
    );

    const approvalUrl = getApprovalUrl(subscriptionResponse);
    if (!subscriptionResponse?.id || !approvalUrl) {
      throw new Error('PayPal subscription approval url not found');
    }

    return {
      provider: this.name,
      checkoutParams: {
        product_id: productResponse.id,
        plan_id: planResponse.id,
      },
      checkoutInfo: {
        sessionId: subscriptionResponse.id,
        checkoutUrl: approvalUrl,
      },
      checkoutResult: subscriptionResponse,
      metadata: order.metadata || {},
    };
  }

  private async ensureAccessToken() {
    if (
      this.accessToken &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry - 60_000
    ) {
      return;
    }

    const credentials = Buffer.from(
      `${this.configs.clientId}:${this.configs.clientSecret}`
    ).toString('base64');

    const data = await this.makeRequest('/v1/oauth2/token', 'POST', {
      body: 'grant_type=client_credentials',
      contentType: 'application/x-www-form-urlencoded',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      includeAuth: false,
      retries: 1,
    });

    if (!data?.access_token || !data?.expires_in) {
      throw new Error('PayPal authentication failed: access token missing');
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + Number(data.expires_in) * 1000;
  }

  private async tryGetOrder(sessionId: string) {
    return this.makeRequest(`/v2/checkout/orders/${sessionId}`, 'GET', {
      allowNotFound: true,
      retries: 1,
    });
  }

  private async tryGetSubscription(sessionId: string) {
    return this.makeRequest(`/v1/billing/subscriptions/${sessionId}`, 'GET', {
      allowNotFound: true,
      retries: 1,
    });
  }

  private async captureApprovedOrder(sessionId: string) {
    try {
      return await this.makeRequest(
        `/v2/checkout/orders/${sessionId}/capture`,
        'POST',
        {
          idempotencyKey: this.getIdempotencyKey(sessionId, 'capture'),
        }
      );
    } catch (error) {
      if (error instanceof PayPalApiError && error.status === 422) {
        const refreshedOrder = await this.tryGetOrder(sessionId);
        if (refreshedOrder) {
          return refreshedOrder;
        }
      }

      throw error;
    }
  }

  private buildOrderSession(result: any): PaymentSession {
    const purchaseUnit = result?.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const amount = capture?.amount || purchaseUnit?.amount;
    const paidAt =
      parseDate(capture?.create_time) ||
      parseDate(capture?.update_time) ||
      parseDate(result?.update_time) ||
      parseDate(result?.create_time);

    return {
      provider: this.name,
      paymentStatus: this.mapPayPalStatus(result?.status),
      paymentInfo: amount
        ? {
            discountCode: '',
            paymentAmount: payPalValueToCents(amount.value),
            paymentCurrency: amount.currency_code,
            paymentEmail: result?.payer?.email_address,
            paymentUserName: buildDisplayName(result?.payer?.name),
            paymentUserId: result?.payer?.payer_id,
            paidAt,
            transactionId: capture?.id,
            invoiceId: capture?.invoice_id || purchaseUnit?.invoice_id,
          }
        : undefined,
      paymentResult: result,
      metadata: purchaseUnit?.custom_id
        ? {
            order_no: purchaseUnit.custom_id,
          }
        : undefined,
    };
  }

  private buildSubscriptionSession(result: any): PaymentSession {
    const subscriptionInfo = this.buildSubscriptionInfo(result);
    const lastPayment = result?.billing_info?.last_payment;
    const paidAt = parseDate(lastPayment?.time);

    const subscriptionSession: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapPayPalStatus(result?.status),
      paymentResult: result,
      subscriptionId: result?.id,
      subscriptionInfo,
      subscriptionResult: result,
      metadata: result?.custom_id
        ? {
            order_no: result.custom_id,
          }
        : undefined,
    };

    if (lastPayment?.amount) {
      subscriptionSession.paymentInfo = {
        paymentAmount: payPalValueToCents(lastPayment.amount.value),
        paymentCurrency: lastPayment.amount.currency_code,
        paymentEmail: result?.subscriber?.email_address,
        paymentUserName: buildDisplayName(result?.subscriber?.name),
        paymentUserId: result?.subscriber?.payer_id,
        paidAt,
        subscriptionCycleType:
          paidAt &&
          subscriptionInfo.currentPeriodStart.getTime() === paidAt.getTime()
            ? SubscriptionCycleType.CREATE
            : SubscriptionCycleType.RENEWAL,
      };
    }

    return subscriptionSession;
  }

  private buildSubscriptionInfo(result: any): SubscriptionInfo {
    const regularCycle = result?.plan?.billing_cycles?.find(
      (cycle: any) => cycle?.tenure_type === 'REGULAR'
    );
    const fixedPrice = regularCycle?.pricing_scheme?.fixed_price;
    const lastPayment = result?.billing_info?.last_payment;
    const currentPeriodStart =
      parseDate(lastPayment?.time) ||
      parseDate(result?.start_time) ||
      parseDate(result?.create_time) ||
      new Date();
    const currentPeriodEnd =
      parseDate(result?.billing_info?.next_billing_time) || currentPeriodStart;

    return {
      subscriptionId: result?.id,
      planId: result?.plan_id,
      description:
        result?.plan?.description || result?.status_change_note || '',
      amount: fixedPrice
        ? payPalValueToCents(fixedPrice.value)
        : lastPayment?.amount
          ? payPalValueToCents(lastPayment.amount.value)
          : undefined,
      currency:
        fixedPrice?.currency_code ||
        lastPayment?.amount?.currency_code ||
        undefined,
      interval: this.fromPayPalIntervalUnit(
        regularCycle?.frequency?.interval_unit
      ),
      intervalCount: regularCycle?.frequency?.interval_count || 1,
      trialPeriodDays: this.getTrialPeriodDays(result?.plan?.billing_cycles),
      currentPeriodStart,
      currentPeriodEnd,
      billingUrl:
        result?.links?.find(
          (link: any) => link.rel === 'approve' || link.rel === 'edit'
        )?.href || undefined,
      status: this.mapPayPalSubscriptionStatus(result?.status),
      canceledAt: parseDate(result?.status_update_time),
    };
  }

  private async buildWebhookPaymentSession(
    event: any,
    eventType: PaymentEventType
  ) {
    const resource = event?.resource || {};
    const relatedIds = resource?.supplementary_data?.related_ids || {};

    if (event.event_type.startsWith('BILLING.SUBSCRIPTION.')) {
      if (resource.id) {
        return this.getPaymentSession({ sessionId: resource.id });
      }

      return undefined;
    }

    const orderId = relatedIds.order_id || resource.id || resource.order_id;
    if (
      orderId &&
      [
        PaymentEventType.CHECKOUT_SUCCESS,
        PaymentEventType.PAYMENT_SUCCESS,
        PaymentEventType.PAYMENT_FAILED,
        PaymentEventType.PAYMENT_REFUNDED,
      ].includes(eventType)
    ) {
      try {
        return await this.getPaymentSession({ sessionId: orderId });
      } catch {
        return {
          provider: this.name,
          paymentStatus:
            eventType === PaymentEventType.PAYMENT_REFUNDED
              ? PaymentStatus.CANCELED
              : eventType === PaymentEventType.PAYMENT_FAILED
                ? PaymentStatus.FAILED
                : undefined,
          paymentResult: resource,
          subscriptionId: relatedIds.subscription_id,
          metadata: resource?.custom_id
            ? {
                order_no: resource.custom_id,
              }
            : undefined,
        };
      }
    }

    return undefined;
  }

  private mapPayPalEventType(rawType: string): PaymentEventType | null {
    switch (rawType) {
      case 'CHECKOUT.ORDER.APPROVED':
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.CREATED':
        return PaymentEventType.CHECKOUT_SUCCESS;
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'PAYMENT.SALE.COMPLETED':
        return PaymentEventType.PAYMENT_SUCCESS;
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.SALE.DENIED':
        return PaymentEventType.PAYMENT_FAILED;
      case 'PAYMENT.CAPTURE.REFUNDED':
      case 'PAYMENT.SALE.REFUNDED':
        return PaymentEventType.PAYMENT_REFUNDED;
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        return PaymentEventType.SUBSCRIBE_CANCELED;
      default:
        return null;
    }
  }

  private mapPayPalStatus(status?: string): PaymentStatus {
    switch (status) {
      case 'CREATED':
      case 'SAVED':
      case 'APPROVED':
      case 'PENDING':
      case 'TRIALING':
        return PaymentStatus.PROCESSING;
      case 'COMPLETED':
      case 'ACTIVE':
        return PaymentStatus.SUCCESS;
      case 'CANCELED':
      case 'CANCELLED':
      case 'EXPIRED':
        return PaymentStatus.CANCELED;
      case 'SUSPENDED':
      case 'FAILED':
      case 'DENIED':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PROCESSING;
    }
  }

  private mapPayPalSubscriptionStatus(status?: string): SubscriptionStatus {
    switch (status) {
      case 'APPROVAL_PENDING':
        return SubscriptionStatus.APPROVAL_PENDING;
      case 'APPROVED':
        return SubscriptionStatus.APPROVED;
      case 'ACTIVE':
        return SubscriptionStatus.ACTIVE;
      case 'SUSPENDED':
        return SubscriptionStatus.SUSPENDED;
      case 'CANCELLED':
        return SubscriptionStatus.CANCELLED;
      case 'EXPIRED':
        return SubscriptionStatus.EXPIRED;
      default:
        throw new Error(`unsupported PayPal subscription status: ${status}`);
    }
  }

  private toPayPalIntervalUnit(interval: PaymentInterval) {
    switch (interval) {
      case PaymentInterval.DAY:
        return 'DAY';
      case PaymentInterval.WEEK:
        return 'WEEK';
      case PaymentInterval.MONTH:
        return 'MONTH';
      case PaymentInterval.YEAR:
        return 'YEAR';
      default:
        throw new Error(
          `unsupported PayPal subscription interval: ${interval}`
        );
    }
  }

  private fromPayPalIntervalUnit(
    intervalUnit?: string
  ): PaymentInterval | undefined {
    switch (intervalUnit) {
      case 'DAY':
        return PaymentInterval.DAY;
      case 'WEEK':
        return PaymentInterval.WEEK;
      case 'MONTH':
        return PaymentInterval.MONTH;
      case 'YEAR':
        return PaymentInterval.YEAR;
      default:
        return undefined;
    }
  }

  private getTrialPeriodDays(billingCycles?: any[]) {
    if (!Array.isArray(billingCycles)) {
      return undefined;
    }

    const trialCycle = billingCycles.find(
      (cycle) =>
        cycle?.tenure_type === 'TRIAL' &&
        cycle?.frequency?.interval_unit === 'DAY'
    );

    if (!trialCycle) {
      return undefined;
    }

    return (
      (trialCycle.frequency?.interval_count || 1) *
      (trialCycle.total_cycles || 0)
    );
  }

  private getIdempotencyKey(base?: string, suffix?: string) {
    const normalizedBase = (base || `${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 48);
    const normalizedSuffix = suffix
      ? suffix.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 12)
      : '';

    return [normalizedBase, normalizedSuffix].filter(Boolean).join('-');
  }

  private async makeRequest(
    endpoint: string,
    method: string,
    options: PayPalRequestOptions = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const retries = options.retries ?? PAYPAL_MAX_RETRIES;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const headers: Record<string, string> = {
          Accept: 'application/json',
          ...(options.includeAuth === false
            ? {}
            : { Authorization: `Bearer ${this.accessToken}` }),
          ...(options.contentType
            ? { 'Content-Type': options.contentType }
            : {}),
          ...(options.headers || {}),
        };

        if (options.idempotencyKey) {
          headers['PayPal-Request-Id'] = options.idempotencyKey;
        }

        const response = await fetch(url, {
          method,
          headers,
          body: options.body,
          signal: AbortSignal.timeout(PAYPAL_REQUEST_TIMEOUT_MS),
        });

        const text = await response.text();
        const responseBody = text ? this.safeParseJson(text) : {};

        if (options.allowNotFound && response.status === 404) {
          return null;
        }

        if (!response.ok) {
          const error = new PayPalApiError(
            buildPayPalErrorMessage(response.statusText, responseBody),
            response.status,
            responseBody
          );

          if (
            response.status === 401 &&
            options.includeAuth !== false &&
            attempt < retries
          ) {
            this.accessToken = undefined;
            this.tokenExpiry = undefined;
            await this.ensureAccessToken();
            continue;
          }

          if (isRetryableStatus(response.status) && attempt < retries) {
            await sleep(300 * (attempt + 1));
            continue;
          }

          throw error;
        }

        return responseBody;
      } catch (error) {
        if (isRetryableError(error) && attempt < retries) {
          await sleep(300 * (attempt + 1));
          continue;
        }

        if (error instanceof Error) {
          throw error;
        }

        throw new Error(String(error));
      }
    }

    throw new Error(`PayPal request exhausted retries: ${method} ${endpoint}`);
  }

  private safeParseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return { raw: value };
    }
  }
}

/**
 * Create PayPal provider with configs
 */
export function createPayPalProvider(configs: PayPalConfigs): PayPalProvider {
  return new PayPalProvider(configs);
}
