'use client';

import { useEffect } from 'react';

import { fetchApiJson } from '@/shared/lib/api/client';
import { USER_NOTIFICATIONS_UPDATED_EVENT } from '@/shared/lib/user-notification-events';

export function NotificationReadEffect({
  notificationIds,
}: {
  notificationIds: string[];
}) {
  const serializedNotificationIds = JSON.stringify(notificationIds);

  useEffect(() => {
    const ids = JSON.parse(serializedNotificationIds) as string[];

    if (!ids.length) {
      return;
    }

    let active = true;

    const markAsRead = async () => {
      try {
        const response = await fetchApiJson<{ updatedCount?: number }>(
          '/api/notifications/mark-read',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notificationIds: ids,
            }),
          }
        );

        if (!active) {
          return;
        }

        if ((response.data?.updatedCount || 0) > 0) {
          window.dispatchEvent(new Event(USER_NOTIFICATIONS_UPDATED_EVENT));
        }
      } catch (error) {
        console.error('[notification-read-effect] failed', {
          notificationIds: ids,
          error,
        });
      }
    };

    void markAsRead();

    return () => {
      active = false;
    };
  }, [serializedNotificationIds]);

  return null;
}
