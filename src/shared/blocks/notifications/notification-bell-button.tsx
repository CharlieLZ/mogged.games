'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/core/i18n/navigation';
import { useAppContext } from '@/shared/contexts/app';
import { fetchApiJson } from '@/shared/lib/api/client';
import { USER_NOTIFICATIONS_UPDATED_EVENT } from '@/shared/lib/user-notification-events';
import { getActivityNotificationsPath } from '@/shared/lib/user-notification-links';
import { cn } from '@/shared/lib/utils';

const DEFAULT_POLL_MS = 45_000;
const ERROR_POLL_MS = 120_000;

function clampUnreadCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

export function NotificationBellButton({ className }: { className?: string }) {
  const t = useTranslations('common.notifications');
  const pathname = usePathname();
  const { user, isCheckSign } = useAppContext();
  const [unreadCount, setUnreadCount] = useState(0);

  const displayCount = useMemo(() => {
    return unreadCount > 99 ? '99+' : String(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (isCheckSign || !user?.id) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    let timeoutId: number | null = null;

    const clearScheduledRefresh = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleRefresh = (delay: number) => {
      clearScheduledRefresh();
      timeoutId = window.setTimeout(() => {
        void refreshUnreadCount();
      }, delay);
    };

    const refreshUnreadCount = async () => {
      try {
        const response = await fetchApiJson<{ unreadCount?: number }>(
          '/api/notifications/unread-count',
          {
            method: 'POST',
            cache: 'no-store',
          }
        );

        if (!active) {
          return;
        }

        setUnreadCount(clampUnreadCount(response.data?.unreadCount));
        scheduleRefresh(DEFAULT_POLL_MS);
      } catch (error) {
        if (!active) {
          return;
        }

        console.error('[notification-bell] unread count refresh failed', {
          userId: user.id,
          pathname,
          error,
        });
        scheduleRefresh(ERROR_POLL_MS);
      }
    };

    const handleRefreshEvent = () => {
      void refreshUnreadCount();
    };

    void refreshUnreadCount();

    window.addEventListener('focus', handleRefreshEvent);
    window.addEventListener(
      USER_NOTIFICATIONS_UPDATED_EVENT,
      handleRefreshEvent as EventListener
    );

    return () => {
      active = false;
      clearScheduledRefresh();
      window.removeEventListener('focus', handleRefreshEvent);
      window.removeEventListener(
        USER_NOTIFICATIONS_UPDATED_EVENT,
        handleRefreshEvent as EventListener
      );
    };
  }, [isCheckSign, pathname, user?.id]);

  if (isCheckSign || !user?.id) {
    return null;
  }

  return (
    <Link
      href={getActivityNotificationsPath()}
      className={cn(
        'border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
        className
      )}
      aria-label={
        unreadCount > 0
          ? t('bell_with_count', { count: unreadCount })
          : t('bell')
      }
      title={
        unreadCount > 0
          ? t('bell_with_count', { count: unreadCount })
          : t('bell')
      }
    >
      <Bell className="size-4" />
      {unreadCount > 0 ? (
        <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs leading-none font-medium">
          {displayCount}
        </span>
      ) : null}
    </Link>
  );
}
