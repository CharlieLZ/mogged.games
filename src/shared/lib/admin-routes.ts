import { Nav, NavItem } from '@/shared/types/blocks/common';
import { Sidebar } from '@/shared/types/blocks/dashboard';

export const ADMIN_ROUTES = {
  ROOT: '/admin',
  NO_PERMISSION: '/admin/no-permission',
  USERS: '/admin/users',
  user: (id: string) => `/admin/users/${id}`,
  userEdit: (id: string) => `/admin/users/${id}/edit`,
  userEditRoles: (id: string) => `/admin/users/${id}/edit-roles`,
  userWebhookEvent: (userId: string, eventRecordId: string) =>
    `/admin/users/${userId}/webhook-events/${eventRecordId}`,
  ROLES: '/admin/roles',
  roleEdit: (id: string) => `/admin/roles/${id}/edit`,
  roleEditPermissions: (id: string) => `/admin/roles/${id}/edit-permissions`,
  PERMISSIONS: '/admin/permissions',
  PAYMENTS: '/admin/payments',
  SUBSCRIPTIONS: '/admin/subscriptions',
  CREDITS: '/admin/credits',
  AI_TASKS: '/admin/ai-tasks',
  AI_TASK_REFRESH: (id: string) => `/admin/ai-tasks/${id}/refresh`,
  APIKEYS: '/admin/apikeys',
  SETTINGS: '/admin/settings',
  settingsTab: (tab: string) => buildAdminHref('/admin/settings', { tab }),
  DAILY: '/admin/daily',
  WEEKLY: '/admin/weekly',
  MONTHLY: '/admin/monthly',
} as const;

const KNOWN_ADMIN_NAV_ROUTES = new Set<string>([
  ADMIN_ROUTES.ROOT,
  ADMIN_ROUTES.USERS,
  ADMIN_ROUTES.ROLES,
  ADMIN_ROUTES.PERMISSIONS,
  ADMIN_ROUTES.PAYMENTS,
  ADMIN_ROUTES.SUBSCRIPTIONS,
  ADMIN_ROUTES.CREDITS,
  ADMIN_ROUTES.AI_TASKS,
  ADMIN_ROUTES.APIKEYS,
  ADMIN_ROUTES.SETTINGS,
  ADMIN_ROUTES.DAILY,
  ADMIN_ROUTES.WEEKLY,
  ADMIN_ROUTES.MONTHLY,
]);

export type RouteSearchParamValue = string | string[] | undefined;
export type RouteSearchParams = Record<string, RouteSearchParamValue>;

function normalizeSingleSearchParam(value: RouteSearchParamValue) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return value?.trim() || undefined;
}

function parsePositiveIntParam(
  value: RouteSearchParamValue,
  fallback: number,
  options: {
    min?: number;
    max?: number;
  } = {}
) {
  const min = options.min ?? 1;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  const normalized = normalizeSingleSearchParam(value);

  if (!normalized) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function normalizeNavItem(
  item: NavItem,
  options: {
    repositoryUrl: string;
    supportMailto: string;
  }
): NavItem | null {
  const urlFromIcon =
    item.icon === 'Github'
      ? options.repositoryUrl
      : item.icon === 'Mail'
        ? options.supportMailto
        : item.url;

  const children = item.children
    ?.map((child) => normalizeNavItem(child, options))
    .filter(Boolean) as NavItem[] | undefined;

  if (
    urlFromIcon?.startsWith(ADMIN_ROUTES.ROOT) &&
    !KNOWN_ADMIN_NAV_ROUTES.has(urlFromIcon)
  ) {
    if (!children?.length) {
      return null;
    }

    return {
      ...item,
      url: undefined,
      children,
    };
  }

  return {
    ...item,
    url: urlFromIcon,
    children,
  };
}

function normalizeNav(
  nav: Nav | undefined,
  options: {
    repositoryUrl: string;
    supportMailto: string;
  }
) {
  if (!nav?.items?.length) {
    return nav;
  }

  const items = nav.items
    .map((item) => normalizeNavItem(item, options))
    .filter(Boolean) as NavItem[];

  if (!items.length) {
    return undefined;
  }

  return {
    ...nav,
    items,
  };
}

export function resolveAdminSidebar(
  sidebar: Sidebar,
  options: {
    repositoryUrl: string;
    supportMailto: string;
  }
): Sidebar {
  return {
    ...sidebar,
    main_navs: sidebar.main_navs
      ?.map((nav) => normalizeNav(nav, options))
      .filter(Boolean) as Nav[] | undefined,
    bottom_nav: normalizeNav(sidebar.bottom_nav, options),
    user: sidebar.user
      ? {
          ...sidebar.user,
          nav: normalizeNav(sidebar.user.nav, options),
        }
      : sidebar.user,
    footer: sidebar.footer
      ? {
          ...sidebar.footer,
          nav: normalizeNav(sidebar.footer.nav, options),
        }
      : sidebar.footer,
  };
}

export function getRouteSearchParam(
  value: RouteSearchParamValue
): string | undefined {
  return normalizeSingleSearchParam(value);
}

export function parseAdminPagination(
  searchParams: RouteSearchParams,
  options: {
    defaultPage?: number;
    defaultPageSize?: number;
    maxPageSize?: number;
  } = {}
) {
  const defaultPage = options.defaultPage ?? 1;
  const defaultPageSize = options.defaultPageSize ?? 30;
  const maxPageSize = options.maxPageSize ?? 100;

  return {
    page: parsePositiveIntParam(searchParams.page, defaultPage, {
      min: 1,
      max: 10_000,
    }),
    limit: parsePositiveIntParam(searchParams.pageSize, defaultPageSize, {
      min: 1,
      max: maxPageSize,
    }),
  };
}

export function parseAdminLimit(
  value: RouteSearchParamValue,
  options: {
    defaultLimit?: number;
    min?: number;
    max?: number;
  } = {}
) {
  const defaultLimit = options.defaultLimit ?? 20;

  return parsePositiveIntParam(value, defaultLimit, {
    min: options.min ?? 1,
    max: options.max ?? 100,
  });
}

export function buildAdminHref(
  basePath: string,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  if (!query) {
    return basePath;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
