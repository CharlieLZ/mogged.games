'use client';

import { useTranslations } from 'next-intl';

const EMPTY_MESSAGE_KEYS: Record<string, string> = {
  'no auth': 'sign_in_required',
  'no auth, please sign in': 'sign_in_required',
  'no permission': 'no_permission',
  'invalid subscription no': 'invalid_subscription_no',
  'subscription not found': 'subscription_not_found',
  'subscription with no payment user id': 'subscription_missing_payment_user',
  'subscription with no payment subscription id':
    'subscription_missing_payment_subscription',
  'payment provider not found': 'payment_provider_not_found',
  'billing url not found': 'billing_url_not_found',
  'get billing failed': 'billing_failed',
  'invalid order no': 'invalid_order_no',
  'order not found': 'order_not_found',
  'order with no invoice': 'order_missing_invoice',
  'invoice url not found': 'invoice_url_not_found',
  'get invoice failed': 'invoice_failed',
  'api key not found': 'api_key_not_found',
  'user not found': 'user_not_found',
  'role not found': 'role_not_found',
  'task not found': 'task_not_found',
  'webhook event not found': 'webhook_event_not_found',
};

function resolveEmptyMessageKey(message: string) {
  return EMPTY_MESSAGE_KEYS[message.trim().toLowerCase()] || '';
}

export function Empty({ message }: { message: string }) {
  const t = useTranslations('common.empty_state');
  const messageKey = resolveEmptyMessageKey(message);
  const displayMessage = messageKey ? t(messageKey) : message;

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center">
      <p>{displayMessage}</p>
    </div>
  );
}
