import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, oneTap } from 'better-auth/plugins';

import { db } from '@/core/db';
import { getLocalizedPath } from '@/core/i18n/localized-path';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { normalizeAppLocale } from '@/config/locale';
import { sendSignupNotification } from '@/extensions/notification';
import { hasEmailProviderConfigured } from '@/shared/lib/email-config';
import { getUuid } from '@/shared/lib/hash';
import { resolveRequestContext } from '@/shared/lib/request-context';
import {
  isGoogleAuthRuntimeEnabled,
  isGoogleOneTapRuntimeEnabled,
} from '@/shared/lib/google-auth-runtime';
import { grantCreditsForNewUser } from '@/shared/models/credit';
import { safeRecordUserContextEvent } from '@/shared/models/user_context_event';
import {
  buildMergedAcquisitionSnapshotFromRequestContext,
  safeUpsertUserAcquisitionSnapshot,
} from '@/shared/models/user-acquisition';
import { sendMagicLinkEmail } from '@/shared/services/magic-link-email';
import { sendPasswordResetEmail } from '@/shared/services/password-reset-email';
import { sendWelcomeEmail } from '@/shared/services/welcome-email';

import { resolveAuthServerRuntimeConfig } from './runtime';

const isGoogleAuthEnabled = isGoogleAuthRuntimeEnabled;

const isGithubAuthEnabled = (configs: Record<string, string>) =>
  configs.github_auth_enabled === 'true' &&
  !!configs.github_client_id &&
  !!configs.github_client_secret;

function getRequiredAuthSecret() {
  const secret = envConfigs.auth_secret?.trim();

  if (!secret) {
    throw new Error('AUTH_SECRET is required for auth runtime');
  }

  return secret;
}

type AuthHookRequestContext = {
  locale?: string;
  countryCode?: string;
  regionCode?: string;
  userAgent?: string;
  path?: string;
  referer?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
};

async function resolveAuthHookRequestContext(params?: {
  fallbackLocale?: string;
}) {
  let referrer: string | undefined;
  let cookieHeader: string | null | undefined;
  let requestContext: AuthHookRequestContext | undefined;
  const fallbackLocale =
    normalizeAppLocale(params?.fallbackLocale) || undefined;

  try {
    const { headers } = await import('next/headers');
    const headerStore = await headers();
    const resolvedRequestContext = resolveRequestContext(headerStore);

    cookieHeader = headerStore.get('cookie');
    referrer = resolvedRequestContext.referer || undefined;
    requestContext = {
      locale: resolvedRequestContext.locale || fallbackLocale,
      countryCode: resolvedRequestContext.countryCode || undefined,
      regionCode: resolvedRequestContext.regionCode || undefined,
      userAgent: resolvedRequestContext.userAgent || undefined,
      path: resolvedRequestContext.path || undefined,
      referer: resolvedRequestContext.referer || undefined,
      deviceType: resolvedRequestContext.deviceType,
    };
  } catch {
    referrer = undefined;
    requestContext = fallbackLocale
      ? {
          locale: fallbackLocale,
        }
      : undefined;
  }

  return {
    cookieHeader,
    referrer,
    requestContext,
  };
}

function resolveAuthRequestLocale(params?: {
  request?: Request;
  userLocale?: string | null;
}) {
  const requestContext = params?.request
    ? resolveRequestContext(params.request.headers, {
        path: params.request.url,
        referer: params.request.headers.get('referer'),
      })
    : undefined;

  return (
    normalizeAppLocale(params?.userLocale) ||
    normalizeAppLocale(requestContext?.locale) ||
    undefined
  );
}

function localizeAuthUrl(params: { url: string; locale?: string | null }) {
  const resolvedLocale = normalizeAppLocale(params.locale) || undefined;

  if (!resolvedLocale) {
    return params.url;
  }

  try {
    const localizedUrl = new URL(params.url);
    localizedUrl.pathname = getLocalizedPath(
      localizedUrl.pathname,
      resolvedLocale
    );
    return localizedUrl.toString();
  } catch {
    return params.url;
  }
}

// get auth options with configs
export async function getAuthOptions(
  configs: Record<string, string>,
  params?: {
    requestOrigin?: string;
  }
) {
  const googleAuthEnabled = isGoogleAuthEnabled(configs);
  const githubAuthEnabled = isGithubAuthEnabled(configs);
  const emailAndPasswordEnabled =
    configs.email_auth_enabled !== 'false' ||
    (!googleAuthEnabled && !githubAuthEnabled);
  const emailDeliveryEnabled = hasEmailProviderConfigured(configs);
  const accountLinkingEnabled = googleAuthEnabled;
  const googleOneTapEnabled = isGoogleOneTapRuntimeEnabled(configs);
  const authSecret = getRequiredAuthSecret();
  const authRuntime = resolveAuthServerRuntimeConfig({
    authURL: envConfigs.auth_url,
    appURL: envConfigs.app_url,
    requestOrigin: params?.requestOrigin,
  });

  return {
    appName: envConfigs.app_name,
    secret: authSecret,
    ...(authRuntime.baseURL ? { baseURL: authRuntime.baseURL } : {}),
    trustedOrigins: authRuntime.trustedOrigins,
    // Add database connection only when actually needed (runtime)
    database: envConfigs.database_url
      ? drizzleAdapter(db(), {
          provider: getDatabaseProvider(envConfigs.database_provider),
          schema: schema,
        })
      : null,
    emailAndPassword: emailAndPasswordEnabled
      ? {
          enabled: true,
          sendResetPassword: async (
            {
              user,
              url,
            }: {
              user: {
                email: string;
                name: string;
                locale?: string | null;
              };
              url: string;
            },
            request?: Request
          ) => {
            const locale = resolveAuthRequestLocale({
              request,
              userLocale:
                typeof (user as Record<string, unknown>).locale === 'string'
                  ? ((user as Record<string, unknown>).locale as string)
                  : undefined,
            });

            const localizedResetUrl = localizeAuthUrl({
              url,
              locale,
            });

            try {
              await sendPasswordResetEmail({
                email: user.email,
                name: user.name,
                resetUrl: localizedResetUrl,
                locale,
              });
            } catch (error) {
              console.error('[auth] send password reset email failed', {
                email: user.email,
                locale,
                error,
              });
              throw error;
            }
          },
        }
      : {
          enabled: false,
        },
    databaseHooks: {
      user: {
        create: {
          before: async (_user: Record<string, unknown>) => {},
          after: async (createdUser: Record<string, unknown>) => {
            const userId =
              typeof createdUser.id === 'string' ? createdUser.id : undefined;
            const email =
              typeof createdUser.email === 'string'
                ? createdUser.email
                : undefined;
            const userName =
              typeof createdUser.name === 'string'
                ? createdUser.name
                : undefined;

            if (!userId) {
              console.error('[auth] user create hook missing user id');
              return;
            }

            const locale =
              typeof createdUser.locale === 'string'
                ? createdUser.locale
                : undefined;
            const emailVerified =
              typeof createdUser.emailVerified === 'boolean'
                ? createdUser.emailVerified
                : undefined;
            const { cookieHeader, referrer, requestContext } =
              await resolveAuthHookRequestContext({
                fallbackLocale: locale,
              });

            if (email) {
              let grantedCreditAmount: number | undefined;

              try {
                const grantedCredit = await grantCreditsForNewUser({
                  id: userId,
                  email,
                  name: userName,
                  requestContext,
                });
                grantedCreditAmount = grantedCredit?.credits;
              } catch (error) {
                console.error('[auth] grant credits for new user failed', {
                  userId,
                  email,
                  error,
                });
              }

              const acquisitionSnapshot = requestContext
                ? buildMergedAcquisitionSnapshotFromRequestContext({
                    requestContext: {
                      deviceType: requestContext.deviceType || 'unknown',
                      locale: requestContext.locale || null,
                      countryCode: requestContext.countryCode || null,
                      regionCode: requestContext.regionCode || null,
                      path: requestContext.path || null,
                      referer: requestContext.referer || referrer || null,
                    },
                    cookieHeader,
                  })
                : undefined;

              sendWelcomeEmail({
                name: userName,
                email,
                locale: requestContext?.locale || locale,
                acquisitionSnapshot: acquisitionSnapshot
                  ? {
                      utm_workflow: acquisitionSnapshot.utm_workflow,
                      landing_path: acquisitionSnapshot.landing_path,
                    }
                  : undefined,
              }).catch((error) =>
                console.error('[auth] send welcome email failed', {
                  userId,
                  email,
                  error,
                })
              );

              try {
                const notificationResult = await sendSignupNotification({
                  email,
                  name: userName,
                  userId,
                  locale: requestContext?.locale || locale,
                  countryCode: requestContext?.countryCode,
                  regionCode: requestContext?.regionCode,
                  userAgent: requestContext?.userAgent,
                  deviceType: requestContext?.deviceType,
                  emailVerified,
                  initialCredits: grantedCreditAmount,
                  source: 'auth_signup',
                  authSource: 'better-auth',
                  referrer,
                  createdAt: new Date(),
                });

                if (notificationResult.code !== 0) {
                  console.warn('[auth] signup notification skipped', {
                    userId,
                    email,
                    result: notificationResult,
                  });
                }
              } catch (error) {
                console.error('[auth] send signup notification failed', {
                  userId,
                  email,
                  error,
                });
              }

              if (acquisitionSnapshot) {
                await safeUpsertUserAcquisitionSnapshot({
                  userId,
                  snapshot: acquisitionSnapshot,
                });
              }
            }
          },
        },
      },
      session: {
        create: {
          after: async (createdSession: Record<string, unknown>) => {
            const userId =
              typeof createdSession.userId === 'string'
                ? createdSession.userId
                : undefined;

            if (!userId) {
              return;
            }

            const { requestContext } = await resolveAuthHookRequestContext();

            await safeRecordUserContextEvent({
              userId,
              eventType: 'auth_session_create',
              ipAddress:
                typeof createdSession.ipAddress === 'string'
                  ? createdSession.ipAddress
                  : undefined,
              userAgent:
                typeof createdSession.userAgent === 'string'
                  ? createdSession.userAgent
                  : undefined,
              deviceType: requestContext?.deviceType,
              locale: requestContext?.locale,
              countryCode: requestContext?.countryCode,
              regionCode: requestContext?.regionCode,
              path: requestContext?.path,
              referer: requestContext?.referer,
              markSignIn: true,
              metadata: {
                sessionId:
                  typeof createdSession.id === 'string'
                    ? createdSession.id
                    : undefined,
              },
            });
          },
        },
      },
    },
    advanced: {
      database: {
        generateId: () => getUuid(),
      },
    },
    logger: {
      verboseLogging: false,
      disabled: true,
    },
    account: {
      // 开启账号关联，避免同邮箱用户被 One Tap 拒绝
      accountLinking: {
        enabled: accountLinkingEnabled,
        trustedProviders: ['google'],
        updateUserInfoOnLink: true,
      },
    },
    plugins: [
      ...(emailAndPasswordEnabled && emailDeliveryEnabled
        ? [
            magicLink({
              storeToken: 'hashed',
              sendMagicLink: async (
                {
                  email,
                  url,
                }: {
                  email: string;
                  url: string;
                  token: string;
                },
                request?: Request
              ) => {
                const locale = resolveAuthRequestLocale({ request });

                try {
                  await sendMagicLinkEmail({
                    email,
                    magicLinkUrl: url,
                    locale,
                  });
                } catch (error) {
                  console.error('[auth] send magic link email failed', {
                    email,
                    locale,
                    error,
                  });
                  throw error;
                }
              },
            }),
          ]
        : []),
      ...(googleOneTapEnabled
        ? [oneTap({ clientId: configs.google_client_id.trim() })]
        : []),
    ],
    socialProviders: await getSocialProviders(configs, {
      googleAuthEnabled,
      githubAuthEnabled,
    }),
  };
}

// get social providers with configs
type SocialProviders = {
  google?: {
    clientId: string;
    clientSecret: string;
  };
  github?: {
    clientId: string;
    clientSecret: string;
  };
};

export async function getSocialProviders(
  configs: Record<string, string>,
  params?: {
    googleAuthEnabled?: boolean;
    githubAuthEnabled?: boolean;
  }
): Promise<SocialProviders> {
  const providers: SocialProviders = {};

  // google auth
  const googleAuthEnabled =
    params?.googleAuthEnabled ?? isGoogleAuthEnabled(configs);

  if (googleAuthEnabled) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  // github auth
  const githubAuthEnabled =
    params?.githubAuthEnabled ?? isGithubAuthEnabled(configs);

  if (githubAuthEnabled) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

// convert database provider to better-auth database provider
export function getDatabaseProvider(
  provider: string
): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'sqlite':
      return 'sqlite';
    case 'postgresql':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
