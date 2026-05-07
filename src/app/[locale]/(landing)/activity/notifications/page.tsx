import { Bell, CheckCircle2, CircleAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Empty } from '@/shared/blocks/common/empty';
import { NotificationReadEffect } from '@/shared/blocks/notifications/notification-read-effect';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { getUserNotificationView } from '@/shared/lib/user-notification-copy';
import { buildActivityNotificationsPageHref } from '@/shared/lib/user-notification-links';
import {
  getUserNotifications,
  getUserNotificationsCount,
} from '@/shared/models/user-notification';
import { getUserInfo } from '@/shared/services/current-user';

function NotificationStatusIcon({ tone }: { tone: 'success' | 'error' | 'info' }) {
  if (tone === 'success') {
    return <CheckCircle2 className="text-primary size-5" />;
  }

  if (tone === 'error') {
    return <CircleAlert className="text-destructive size-5" />;
  }

  return <Bell className="text-muted-foreground size-5" />;
}

export default async function ActivityNotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const [{ locale }, { page: rawPage, pageSize: rawPageSize }] =
    await Promise.all([params, searchParams]);
  const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
  const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('activity.notifications');
  const [notifications, total] = await Promise.all([
    getUserNotifications({
      userId: user.id,
      page,
      limit: pageSize,
    }),
    getUserNotificationsCount(user.id),
  ]);

  const unreadNotificationIds = notifications
    .filter((notification) => !notification.readAt)
    .map((notification) => notification.id);
  const hasPreviousPage = page > 1;
  const hasNextPage = page * pageSize < total;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-6">
      <NotificationReadEffect notificationIds={unreadNotificationIds} />

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle>{t('title')}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {t('description')}
              </p>
            </div>
            <Badge variant="outline">
              {t('counts.total', { count: total })}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {notifications.length === 0 ? (
        <Empty message={t('empty')} />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const view = getUserNotificationView(notification, t);

            return (
              <Card
                key={notification.id}
                className={!notification.readAt ? 'border-primary/40' : undefined}
              >
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
                      <NotificationStatusIcon tone={view.tone} />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-foreground font-medium">
                          {view.title}
                        </p>
                        <Badge variant={notification.readAt ? 'outline' : 'secondary'}>
                          {notification.readAt ? t('badges.read') : t('badges.unread')}
                        </Badge>
                        <Badge variant="outline">{view.badge}</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm leading-6">
                        {view.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {dateFormatter.format(notification.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" asChild>
                      <Link href={view.actionPath}>{t('open_task')}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {hasPreviousPage || hasNextPage ? (
            <div className="flex flex-wrap justify-end gap-2">
              {hasPreviousPage ? (
                <Button variant="outline" asChild>
                  <Link href={buildActivityNotificationsPageHref(page - 1, pageSize)}>
                    {t('pagination.previous')}
                  </Link>
                </Button>
              ) : null}
              {hasNextPage ? (
                <Button variant="outline" asChild>
                  <Link href={buildActivityNotificationsPageHref(page + 1, pageSize)}>
                    {t('pagination.next')}
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
