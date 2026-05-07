import {
  EmailManager,
  ResendProvider,
  ZeptoMailProvider,
} from '@/extensions/email';
import {
  hasResendProviderConfig,
  hasZeptoMailProviderConfig,
} from '@/shared/lib/email-config';
import type { Configs } from '@/shared/models/config';

import { createConfigBackedServiceGetter } from './config-service-cache';
import { applyManagerRegistrations, whenConfigs } from './manager-registry';

const emailManagerRegistrations = [
  whenConfigs<EmailManager>(hasZeptoMailProviderConfig, (manager, configs) => {
    manager.addProvider(
      new ZeptoMailProvider({
        apiKey: configs.zeptomail_api_key || configs.zeptomail_smtp_api_key,
        defaultFrom: configs.zeptomail_sender_email,
        apiUrl: configs.zeptomail_api_url,
      }),
      true
    );
  }),
  whenConfigs<EmailManager>(hasResendProviderConfig, (manager, configs) => {
    manager.addProvider(
      new ResendProvider({
        apiKey: configs.resend_api_key,
        defaultFrom: configs.resend_sender_email,
      })
    );
  }),
] as const;

/**
 * get email service with configs
 */
export function getEmailServiceWithConfigs(configs: Configs) {
  return applyManagerRegistrations(
    new EmailManager(),
    configs,
    emailManagerRegistrations
  );
}

/**
 * get email service instance
 */
export const getEmailService = createConfigBackedServiceGetter(
  getEmailServiceWithConfigs
);
