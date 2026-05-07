import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { PERMISSIONS, requireAdminPermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  ADMIN_ROUTES,
  getRouteSearchParam,
  parseAdminPagination,
  type RouteSearchParams,
} from '@/shared/lib/admin-routes';
import { Badge } from '@/shared/components/ui/badge';
import {
  ACTIVATION_SURVEY_REWARD_GRANTED_STATUS,
  ACTIVATION_SURVEY_REWARD_NOT_SENT_STATUS,
  ACTIVATION_SURVEY_REWARD_PENDING_STATUS,
  getActivationSurveyRewardStatusesByUserIds,
  type ActivationSurveyRewardListStatus,
} from '@/shared/models/activation-survey';
import { getRemainingCreditsBatch } from '@/shared/models/credit';
import {
  getUsers,
  getUsersCount,
  type AdminUserRewardFilter,
  User,
} from '@/shared/models/user';
import { getUserRolesBatch, Role } from '@/shared/services/rbac';
import { Crumb, Filter, Search } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

// Extended user type with preloaded data
type UserWithPreloadedData = User & {
  _roles: Role[];
  _remainingCredits: number;
  _surveyRewardStatus: ActivationSurveyRewardListStatus;
};

function getSurveyRewardListCopy(locale: string) {
  if (locale.startsWith('zh')) {
    return {
      filterTitle: 'Survey Reward',
      filterAll: '全部用户',
      filterPending: 'Survey 已发，Reward 待处理',
      columnTitle: 'Survey Reward',
      statusPending: '待核对 Gmail 后发放',
      statusGranted: 'Reward 已发',
      statusNotSent: '还没发 survey',
    };
  }

  return {
    filterTitle: 'Survey Reward',
    filterAll: 'All users',
    filterPending: 'Survey sent, reward pending',
    columnTitle: 'Survey Reward',
    statusPending: 'Check Gmail reply and grant',
    statusGranted: 'Reward granted',
    statusNotSent: 'Survey not sent',
  };
}

function parseRewardFilter(value?: string): AdminUserRewardFilter | undefined {
  if (value === ACTIVATION_SURVEY_REWARD_PENDING_STATUS) {
    return value;
  }

  return undefined;
}

function formatLocaleGeoSummary(user: UserWithPreloadedData): string {
  const locale = user.locale?.trim() || '-';
  const geo = [user.countryCode, user.regionCode].filter(Boolean).join('-');

  if (!geo) {
    return locale;
  }

  return `${locale} / ${geo}`;
}

function formatDeviceIpSummary(user: UserWithPreloadedData): string {
  const device = user.lastDeviceType?.trim() || '-';
  const ip = user.lastSeenIpAddress?.trim() || '-';

  return `${device} / ${ip}`;
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const { locale } = await params;

  // Check if user has permission to read users
  await requireAdminPermission(PERMISSIONS.USERS_READ, locale);

  const t = await getTranslations('admin.users');

  const resolvedSearchParams = await searchParams;
  const { page, limit } = parseAdminPagination(resolvedSearchParams);
  const email = getRouteSearchParam(resolvedSearchParams.email);
  const rewardFilter = parseRewardFilter(
    getRouteSearchParam(resolvedSearchParams.reward)
  );
  const surveyRewardCopy = getSurveyRewardListCopy(locale);

  // Parallel queries instead of sequential (optimization)
  const [total, users] = await Promise.all([
    getUsersCount({ email, rewardFilter }),
    getUsers({ email, page, limit, rewardFilter }),
  ]);

  // Batch preload roles and credits for all users (eliminates N+1 queries)
  const userIds = users.map((u) => u.id);
  const [rolesMap, creditsMap, surveyRewardStatuses] = await Promise.all([
    getUserRolesBatch(userIds),
    getRemainingCreditsBatch(userIds),
    getActivationSurveyRewardStatusesByUserIds(userIds),
  ]);

  // Attach preloaded data to users
  const usersWithData: UserWithPreloadedData[] = users.map((user) => ({
    ...user,
    _roles: rolesMap.get(user.id) || [],
    _remainingCredits: creditsMap.get(user.id) || 0,
    _surveyRewardStatus:
      surveyRewardStatuses.get(user.id) || ACTIVATION_SURVEY_REWARD_NOT_SENT_STATUS,
  }));

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('list.crumbs.users'), is_active: true },
  ];

  const search: Search = {
    name: 'email',
    title: t('list.search.email.title'),
    placeholder: t('list.search.email.placeholder'),
    value: email,
  };

  const filters: Filter[] = [
    {
      name: 'reward',
      title: surveyRewardCopy.filterTitle,
      value: rewardFilter || 'all',
      options: [
        {
          value: 'all',
          label: surveyRewardCopy.filterAll,
        },
        {
          value: ACTIVATION_SURVEY_REWARD_PENDING_STATUS,
          label: surveyRewardCopy.filterPending,
        },
      ],
    },
  ];

  const table: Table = {
    columns: [
      { name: 'id', title: t('fields.id'), type: 'copy' },
      {
        name: 'name',
        title: t('fields.name'),
        callback: (item: UserWithPreloadedData) => (
          <Link
            className="hover:text-primary font-medium underline-offset-4 hover:underline"
            href={ADMIN_ROUTES.user(item.id)}
          >
            {item.name?.trim() || '-'}
          </Link>
        ),
      },
      {
        name: 'image',
        title: t('fields.avatar'),
        type: 'image',
        placeholder: '-',
      },
      { name: 'email', title: t('fields.email'), type: 'copy' },
      {
        name: 'roles',
        title: t('fields.roles'),
        // Using preloaded data instead of async callback (eliminates N+1 query)
        callback: (item: UserWithPreloadedData) => {
          const roles = item._roles;
          if (!roles || roles.length === 0) {
            return '-';
          }
          return (
            <div className="flex flex-col gap-2">
              {roles.map((role) => (
                <Badge key={role.id} variant="outline">
                  {role.title}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        name: 'emailVerified',
        title: t('fields.email_verified'),
        type: 'label',
        placeholder: '-',
      },
      {
        name: 'remainingCredits',
        title: t('fields.remaining_credits'),
        // Using preloaded data instead of async callback (eliminates N+1 query)
        callback: (item: UserWithPreloadedData) => {
          return (
            <div className="text-[var(--success)]">
              {item._remainingCredits}
            </div>
          );
        },
      },
      {
        name: 'surveyReward',
        title: surveyRewardCopy.columnTitle,
        callback: (item: UserWithPreloadedData) => {
          const status =
            item._surveyRewardStatus === ACTIVATION_SURVEY_REWARD_PENDING_STATUS
              ? surveyRewardCopy.statusPending
              : item._surveyRewardStatus === ACTIVATION_SURVEY_REWARD_GRANTED_STATUS
                ? surveyRewardCopy.statusGranted
                : surveyRewardCopy.statusNotSent;

          return <Badge variant="outline">{status}</Badge>;
        },
      },
      {
        name: 'locale',
        title: t('fields.locale_geo'),
        callback: (item: UserWithPreloadedData) => (
          <div className="space-y-1 text-sm">
            <div>{formatLocaleGeoSummary(item)}</div>
            {item.lastSeenUserAgent ? (
              <div className="text-muted-foreground max-w-xs truncate text-xs">
                {item.lastSeenUserAgent}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        name: 'lastSeenIpAddress',
        title: t('fields.device_ip'),
        type: 'copy',
        metadata: {
          maxLength: 120,
        },
        callback: (item: UserWithPreloadedData) => formatDeviceIpSummary(item),
      },
      {
        name: 'lastSeenAt',
        title: t('fields.last_seen_at'),
        type: 'time',
        placeholder: '-',
      },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'actions',
        title: t('fields.actions'),
        type: 'dropdown',
        callback: (item: UserWithPreloadedData) => [
          {
            name: 'view',
            title: t('list.buttons.view'),
            icon: 'RiEyeLine',
            url: ADMIN_ROUTES.user(item.id),
          },
          {
            name: 'edit',
            title: t('list.buttons.edit'),
            icon: 'RiEditLine',
            url: ADMIN_ROUTES.userEdit(item.id),
          },
          {
            name: 'edit-roles',
            title: t('list.buttons.edit_roles'),
            icon: 'Users',
            url: ADMIN_ROUTES.userEditRoles(item.id),
          },
        ],
      },
    ],
    data: usersWithData,
    pagination: {
      total,
      page,
      limit,
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} search={search} filters={filters} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
