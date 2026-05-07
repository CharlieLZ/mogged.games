import { revalidatePath } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getLocalizedPath } from '@/core/i18n/localized-path';
import { redirect } from '@/core/i18n/navigation';
import { Link } from '@/core/i18n/navigation';
import {
  PERMISSIONS,
  requireAdminAllPermissions,
  requireAdminPermission,
} from '@/core/rbac';
import { Empty } from '@/shared/blocks/common/empty';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  ADMIN_ROUTES,
  buildAdminHref,
  getRouteSearchParam,
  parseAdminLimit,
  type RouteSearchParams,
} from '@/shared/lib/admin-routes';
import { getDayjs } from '@/shared/lib/dayjs';
import { getUserFunnelSnapshot } from '@/shared/models/admin-funnel';
import { getRemainingCredits } from '@/shared/models/credit';
import { findUserById } from '@/shared/models/user';
import { getUserInfo } from '@/shared/services/current-user';
import { getUserContextEventsByUserId } from '@/shared/models/user_context_event';
import {
  DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
  getActivationSurveyRewardStatus,
  grantActivationSurveyReward,
} from '@/shared/models/activation-survey';
import {
  getUserRolesBatch,
  hasPermission,
} from '@/shared/services/rbac';
import { getWebhookEventsByRelatedUserId } from '@/shared/models/webhook_event';
import { Crumb } from '@/shared/types/blocks/common';
import { Table } from '@/shared/types/blocks/table';

import { GrantSurveyRewardButton } from './_components/grant-survey-reward-button';

function formatText(value?: string | null) {
  return value?.trim() || '-';
}

function formatLocaleGeo(value: {
  locale?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
}) {
  const locale = formatText(value.locale);
  const geo = [value.countryCode, value.regionCode].filter(Boolean).join('-');

  return geo ? `${locale} / ${geo}` : locale;
}

function formatDateTime(value: Date | null | undefined, locale: string) {
  if (!value) {
    return '-';
  }

  return getDayjs(value, locale).format('YYYY-MM-DD HH:mm:ss');
}

function getSurveyRewardCopy(locale: string) {
  if (locale.startsWith('zh')) {
    return {
      title: 'Survey Reply Reward',
      description: '先在 Gmail 里确认用户真的回了，再手动送这笔感谢积分。',
      surveySent: 'Survey 邮件已发送',
      rewardGranted: 'Reward 已发放',
      firstSuccess: '首次成功生成',
      rewardAmount: '奖励积分',
      status: '当前状态',
      ready: '可发放',
      surveyNotSent: '还没记录到 survey 邮件',
      alreadyGranted: '已经发过 reward',
      noPermission: '你当前没有发积分权限',
      helperReady: '先看一眼 Gmail 回复，再点一次发放就行。',
      helperSurveyNotSent: '系统还没记录到这位用户收到过 24 小时调研邮件。',
      helperAlreadyGranted: '这笔感谢积分已经发过了，不会重复发。',
      helperNoPermission: '需要 `admin.credits.write` 权限才可以发放。',
      button: 'Grant Survey Reward',
      buttonPending: 'Granting...',
      feedbackGranted: 'Survey reward 已发放。',
      feedbackAlreadyGranted: '这位用户之前已经发过 survey reward 了。',
      feedbackSurveyNotSent: '还没有 survey 邮件发送记录，暂时不能发这笔奖励。',
      feedbackUserNotFound: '用户不存在，奖励没有发出去。',
    };
  }

  return {
    title: 'Survey Reply Reward',
    description:
      'Use this after you confirm the Gmail reply. The reward stays manual on purpose.',
    surveySent: 'Survey Email Sent',
    rewardGranted: 'Reward Granted',
    firstSuccess: 'First Successful Generation',
    rewardAmount: 'Reward Credits',
    status: 'Current Status',
    ready: 'Ready to grant',
    surveyNotSent: 'Survey email not recorded yet',
    alreadyGranted: 'Reward already granted',
    noPermission: 'You do not have permission to grant credits',
    helperReady: 'Check the Gmail reply first, then grant the thank-you credits once.',
    helperSurveyNotSent:
      'This user does not have a recorded 24-hour activation survey email yet.',
    helperAlreadyGranted:
      'This thank-you reward has already been granted and will not be duplicated.',
    helperNoPermission:
      'You need the `admin.credits.write` permission to grant this reward.',
    button: 'Grant Survey Reward',
    buttonPending: 'Granting...',
    feedbackGranted: 'Survey reward granted.',
    feedbackAlreadyGranted: 'This user already received the survey reward.',
    feedbackSurveyNotSent:
      'There is no recorded activation survey email for this user yet.',
    feedbackUserNotFound: 'User not found. No reward was granted.',
  };
}

function getSurveyRewardFeedback(locale: string, value?: string): string | null {
  const copy = getSurveyRewardCopy(locale);

  switch (value) {
    case 'granted':
      return copy.feedbackGranted;
    case 'already-granted':
      return copy.feedbackAlreadyGranted;
    case 'survey-not-sent':
      return copy.feedbackSurveyNotSent;
    case 'user-not-found':
      return copy.feedbackUserNotFound;
    default:
      return null;
  }
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requireAdminPermission(PERMISSIONS.USERS_READ, locale);

  const resolvedSearchParams = await searchParams;
  const limit = parseAdminLimit(
    getRouteSearchParam(resolvedSearchParams.limit),
    {
      defaultLimit: 20,
      min: 10,
      max: 100,
    }
  );
  const rewardFeedback = getRouteSearchParam(resolvedSearchParams.reward);

  const [user, remainingCredits, rolesMap, contextEvents, webhookEvents, adminUser] =
    await Promise.all([
      findUserById(id),
      getRemainingCredits(id),
      getUserRolesBatch([id]),
      getUserContextEventsByUserId(id, limit),
      getWebhookEventsByRelatedUserId(id, limit),
      getUserInfo(),
    ]);

  if (!user) {
    return <Empty message="User not found" />;
  }

  const roles = rolesMap.get(id) || [];
  const t = await getTranslations('admin.users');
  const funnelSnapshot = await getUserFunnelSnapshot(id, user.createdAt);
  const surveyRewardCopy = getSurveyRewardCopy(locale);
  const surveyRewardFeedback = getSurveyRewardFeedback(locale, rewardFeedback);
  const [activationSurveyRewardStatus, canGrantSurveyReward] =
    await Promise.all([
      getActivationSurveyRewardStatus(user.id),
      adminUser
        ? hasPermission(adminUser.id, PERMISSIONS.CREDITS_WRITE)
        : Promise.resolve(false),
    ]);
  const rewardStatusLabel =
    activationSurveyRewardStatus.reason === 'ready'
      ? surveyRewardCopy.ready
      : activationSurveyRewardStatus.reason === 'already-granted'
        ? surveyRewardCopy.alreadyGranted
        : surveyRewardCopy.surveyNotSent;
  const rewardHelperText = !canGrantSurveyReward
    ? surveyRewardCopy.helperNoPermission
    : activationSurveyRewardStatus.reason === 'ready'
      ? surveyRewardCopy.helperReady
      : activationSurveyRewardStatus.reason === 'already-granted'
        ? surveyRewardCopy.helperAlreadyGranted
        : surveyRewardCopy.helperSurveyNotSent;

  const grantSurveyRewardAction = async () => {
    'use server';

    await requireAdminAllPermissions(
      [PERMISSIONS.USERS_READ, PERMISSIONS.CREDITS_WRITE],
      locale
    );

    const actor = await getUserInfo();

    if (!actor) {
      throw new Error('no auth');
    }

    const result = await grantActivationSurveyReward({
      userId: user.id,
      actorUserId: actor.id,
      note: 'granted from admin user detail',
    });

    revalidatePath(getLocalizedPath(ADMIN_ROUTES.USERS, locale));
    revalidatePath(getLocalizedPath(ADMIN_ROUTES.user(user.id), locale));

    redirect({
      href: buildAdminHref(ADMIN_ROUTES.user(user.id), {
        limit,
        reward: result.status,
      }),
      locale,
    });
  };

  const crumbs: Crumb[] = [
    { title: t('detail.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('detail.crumbs.users'), url: ADMIN_ROUTES.USERS },
    { title: t('detail.crumbs.detail'), is_active: true },
  ];

  const contextTable: Table = {
    columns: [
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      { name: 'eventType', title: t('fields.event_type'), placeholder: '-' },
      {
        name: 'locale',
        title: t('fields.locale_geo'),
        callback: (item) => formatLocaleGeo(item),
      },
      {
        name: 'ipAddress',
        title: t('fields.device_ip'),
        type: 'copy',
        metadata: { maxLength: 120 },
        callback: (item) =>
          `${formatText(item.deviceType)} / ${formatText(item.ipAddress)}`,
      },
      { name: 'path', title: t('fields.path'), placeholder: '-' },
      {
        name: 'referer',
        title: t('fields.referer'),
        type: 'copy',
        placeholder: '-',
        metadata: { maxLength: 80 },
      },
      {
        name: 'metadata',
        title: t('fields.metadata'),
        type: 'json_preview',
        placeholder: '-',
      },
    ],
    data: contextEvents,
  };

  const webhookTable: Table = {
    columns: [
      {
        name: 'lastReceivedAt',
        title: t('fields.last_received_at'),
        type: 'time',
      },
      {
        name: 'provider',
        title: t('fields.provider'),
        callback: (item) => (
          <div className="space-y-1 text-sm">
            <div>{formatText(item.provider)}</div>
            <div className="text-muted-foreground text-xs">
              {formatText(item.rawEventType || item.eventType)}
            </div>
          </div>
        ),
      },
      {
        name: 'eventId',
        title: t('fields.event_id'),
        type: 'copy',
        metadata: { maxLength: 80 },
        callback: (item) => (
          <Link
            className="hover:text-primary underline-offset-4 hover:underline"
            href={ADMIN_ROUTES.userWebhookEvent(user.id, item.id)}
          >
            {formatText(item.eventId)}
          </Link>
        ),
      },
      {
        name: 'status',
        title: t('fields.status'),
        callback: (item) => <Badge variant="outline">{item.status}</Badge>,
      },
      {
        name: 'deliveryCount',
        title: t('fields.delivery_count'),
        callback: (item) => item.deliveryCount || 1,
      },
      {
        name: 'relatedOrderNo',
        title: t('fields.order_no'),
        type: 'copy',
        placeholder: '-',
      },
      {
        name: 'relatedSubscriptionId',
        title: t('fields.subscription_id'),
        type: 'copy',
        placeholder: '-',
      },
      {
        name: 'errorMessage',
        title: t('fields.error_message'),
        placeholder: '-',
      },
      {
        name: 'payload',
        title: t('fields.payload'),
        type: 'json_preview',
        placeholder: '-',
      },
    ],
    data: webhookEvents,
  };

  const formattedCreatedAt = formatDateTime(user.createdAt, locale);
  const formattedLastSeenAt = formatDateTime(user.lastSeenAt, locale);
  const formattedLastSignInAt = formatDateTime(user.lastSignInAt, locale);

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t('detail.title')}
          actions={[
            {
              title: t('list.buttons.edit'),
              url: ADMIN_ROUTES.userEdit(user.id),
            },
            {
              title: t('list.buttons.edit_roles'),
              url: ADMIN_ROUTES.userEditRoles(user.id),
            },
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.cards.profile.title')}</CardTitle>
              <CardDescription>
                {t('detail.cards.profile.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.name')}
                </div>
                <div>{formatText(user.name)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.email')}
                </div>
                <div>{formatText(user.email)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.roles')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <Badge key={role.id} variant="outline">
                        {role.title}
                      </Badge>
                    ))
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.email_verified')}
                  </div>
                  <div>{user.emailVerified ? 'true' : 'false'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.remaining_credits')}
                  </div>
                  <div>{remainingCredits}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.created_at')}
                  </div>
                  <div>{formattedCreatedAt}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.last_sign_in_at')}
                  </div>
                  <div>{formattedLastSignInAt}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('detail.cards.context.title')}</CardTitle>
              <CardDescription>
                {t('detail.cards.context.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.locale_geo')}
                  </div>
                  <div>
                    {formatLocaleGeo({
                      locale: user.locale,
                      countryCode: user.countryCode,
                      regionCode: user.regionCode,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.last_seen_at')}
                  </div>
                  <div>{formattedLastSeenAt}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.device_ip')}
                  </div>
                  <div>
                    {`${formatText(user.lastDeviceType)} / ${formatText(
                      user.lastSeenIpAddress
                    )}`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.avatar')}
                  </div>
                  <div>
                    {user.image ? (
                      <a href={user.image} rel="noreferrer" target="_blank">
                        {t('detail.actions.open_avatar')}
                      </a>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.user_agent')}
                </div>
                <div className="break-all">
                  {formatText(user.lastSeenUserAgent)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={ADMIN_ROUTES.userEdit(user.id)}>
                    {t('list.buttons.edit')}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={ADMIN_ROUTES.userEditRoles(user.id)}>
                    {t('list.buttons.edit_roles')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{surveyRewardCopy.title}</CardTitle>
            <CardDescription>
              {surveyRewardCopy.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {surveyRewardFeedback ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                {surveyRewardFeedback}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-muted-foreground text-xs">
                  {surveyRewardCopy.surveySent}
                </div>
                <div>
                  {formatDateTime(
                    activationSurveyRewardStatus.surveyEmailSentAt,
                    locale
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {surveyRewardCopy.rewardGranted}
                </div>
                <div>
                  {formatDateTime(
                    activationSurveyRewardStatus.rewardGrantedAt,
                    locale
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {surveyRewardCopy.firstSuccess}
                </div>
                <div>
                  {formatDateTime(
                    activationSurveyRewardStatus.firstSuccessfulGenerationAt,
                    locale
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {surveyRewardCopy.rewardAmount}
                </div>
                <div>{DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="text-muted-foreground text-xs">
                  {surveyRewardCopy.status}
                </div>
                <Badge variant="outline">{rewardStatusLabel}</Badge>
                <div className="text-muted-foreground max-w-2xl text-sm">
                  {rewardHelperText}
                </div>
              </div>

              {canGrantSurveyReward ? (
                <form action={grantSurveyRewardAction}>
                  <GrantSurveyRewardButton
                    disabled={!activationSurveyRewardStatus.canGrant}
                    idleLabel={surveyRewardCopy.button}
                    pendingLabel={surveyRewardCopy.buttonPending}
                  />
                </form>
              ) : (
                <Button disabled>{surveyRewardCopy.button}</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('detail.cards.funnel.title')}</CardTitle>
            <CardDescription>
              {t('detail.cards.funnel.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.funnel_stage')}
              </div>
              <div className="pt-1">
                <Badge variant="outline">
                  {t(`detail.funnel.stage.${funnelSnapshot.currentStage}`)}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.source')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.source)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_campaign')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmCampaign)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_term')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmTerm)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_batch')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmBatch)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_objective')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmObjective)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_adgroup')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmAdgroup)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_match')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmMatch)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_workflow')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmWorkflow)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_lang')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmLang)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.utm_device')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.utmDevice)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.created_at')}
              </div>
              <div>{formatDateTime(funnelSnapshot.signupAt, locale)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.first_successful_generation_at')}
              </div>
              <div>
                {formatDateTime(
                  funnelSnapshot.firstSuccessfulGenerationAt,
                  locale
                )}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.checkout_started_at')}
              </div>
              <div>
                {formatDateTime(funnelSnapshot.checkoutStartedAt, locale)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.paid_at')}
              </div>
              <div>{formatDateTime(funnelSnapshot.paidAt, locale)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.locale_geo')}
              </div>
              <div>
                {formatLocaleGeo({
                  locale: funnelSnapshot.acquisition?.locale,
                  countryCode: user.countryCode,
                  regionCode: user.regionCode,
                })}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.device_ip')}
              </div>
              <div>{formatText(funnelSnapshot.acquisition?.deviceType)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.order_no')}
              </div>
              <div>{formatText(funnelSnapshot.paidOrder?.orderNo)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t('fields.product_name')}
              </div>
              <div>{formatText(funnelSnapshot.paidOrder?.productName)}</div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-6">
          <TableCard
            title={t('detail.sections.context_events.title')}
            description={t('detail.sections.context_events.description', {
              limit,
            })}
            table={contextTable}
          />
          <TableCard
            title={t('detail.sections.webhook_events.title')}
            description={t('detail.sections.webhook_events.description', {
              limit,
            })}
            table={webhookTable}
          />
        </div>
      </Main>
    </>
  );
}
