'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '@/shared/components/ui/button';

type RefreshResult = {
  results: Array<{ id: string; status: string; changed: boolean }>;
  hasAnyChange: boolean;
  refreshedCount: number;
  totalCount: number;
};

export function RefreshControls({
  pendingTaskIds,
  intervalMs = 15000,
  maxPerTick = 10,
}: {
  pendingTaskIds: string[];
  intervalMs?: number;
  maxPerTick?: number;
}) {
  const router = useRouter();
  const t = useTranslations('admin.aitasks.refresh');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedIds = useMemo(() => {
    const ids = pendingTaskIds.filter(Boolean);
    return Array.from(new Set(ids));
  }, [pendingTaskIds]);

  // Use stable key to detect content changes
  const idsKey = useMemo(() => [...normalizedIds].sort().join(','), [normalizedIds]);

  // Track IDs that have been confirmed completed to avoid re-checking
  const completedIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    completedIdsRef.current.clear();
    setCompletedCount(0);
    setErrorMessage(null);
    setLastRunAt(null);
  }, [idsKey]);

  const refreshOnce = useEffectEvent(async (isManual = false) => {
    const idsToRefresh = normalizedIds
      .filter((id) => !completedIdsRef.current.has(id))
      .slice(0, Math.max(1, maxPerTick));

    if (idsToRefresh.length === 0) {
      setCompletedCount(completedIdsRef.current.size);
      return;
    }

    if (isRefreshing && !isManual) return;

    setIsRefreshing(true);

    try {
      const response = await fetch('/api/admin/ai-tasks/batch-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: idsToRefresh }),
      });

      if (!response.ok) {
        console.error('[RefreshControls] Batch refresh failed:', response.status);
        setErrorMessage(`刷新失败，状态码 ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.code !== 0) {
        console.error('[RefreshControls] Batch refresh error:', data.message);
        setErrorMessage(data.message || '刷新失败，请稍后重试');
        return;
      }

      setErrorMessage(null);

      const result = data.data as RefreshResult;
      setLastRunAt(new Date());

      // Track completed tasks
      result.results.forEach((r) => {
        if (r.status !== 'pending' && r.status !== 'processing') {
          completedIdsRef.current.add(r.id);
        }
      });

      const pendingCount = normalizedIds.filter(
        (id) => !completedIdsRef.current.has(id)
      ).length;

      setCompletedCount(completedIdsRef.current.size);

      if (result.hasAnyChange) {
        startTransition(() => {
          router.refresh();
        });
      }

      if (pendingCount === 0) {
        stopAutoRefresh();
        setIsRefreshing(false);
        return;
      }
    } catch (error) {
      console.error('[RefreshControls] Error:', error);
      setErrorMessage('刷新失败，请稍后重试');
    } finally {
      setIsRefreshing(false);
    }
  });

  useEffect(() => {
    stopAutoRefresh();
    if (normalizedIds.length === 0) return;

    // Initial refresh on mount
    refreshOnce(false);

    // Clear any previous interval before creating a new one
    stopAutoRefresh();
    intervalRef.current = setInterval(() => {
      const pendingCount = normalizedIds.filter(
        (id) => !completedIdsRef.current.has(id)
      ).length;
      if (pendingCount === 0) {
        stopAutoRefresh();
        return;
      }
      refreshOnce(false);
    }, intervalMs);

    return () => stopAutoRefresh();
  }, [intervalMs, normalizedIds, stopAutoRefresh]);

  if (normalizedIds.length === 0) {
    return null;
  }

  const stillPending = normalizedIds.length - completedCount;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
      <div className="text-muted-foreground text-sm">
        {stillPending > 0 ? (
          <>
            {t('pending_tasks', { count: stillPending, interval: Math.round(intervalMs / 1000) })}
            {completedCount > 0 && (
              <span className="text-green-500 ml-2">
                {t('completed_count', { count: completedCount })}
              </span>
            )}
          </>
        ) : (
          <span className="text-green-500">{t('all_completed')}</span>
        )}
        {lastRunAt && t('last_check', { time: lastRunAt.toLocaleTimeString() })}
        {errorMessage && <div className="text-destructive text-xs">{errorMessage}</div>}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => refreshOnce(true)}
        disabled={stillPending === 0 || isRefreshing}
      >
        {isRefreshing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('refreshing')}
          </>
        ) : (
          t('refresh_now')
        )}
      </Button>
    </div>
  );
}
