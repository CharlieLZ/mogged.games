import { ADMIN_ROUTES } from '@/shared/lib/admin-routes';

import {
  requireAdminAccess,
  requireAllPermissions,
  requirePermission,
} from './permission';

export async function requireAdminArea(locale: string) {
  await requireAdminAccess({
    redirectUrl: ADMIN_ROUTES.NO_PERMISSION,
    locale,
  });
}

export async function requireAdminPermission(code: string, locale: string) {
  await requirePermission({
    code,
    redirectUrl: ADMIN_ROUTES.NO_PERMISSION,
    locale,
  });
}

export async function requireAdminAllPermissions(
  codes: string[],
  locale: string
) {
  await requireAllPermissions({
    codes,
    redirectUrl: ADMIN_ROUTES.NO_PERMISSION,
    locale,
  });
}
