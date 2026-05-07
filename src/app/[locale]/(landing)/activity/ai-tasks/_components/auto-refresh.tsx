'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useEffectEvent, useMemo, useRef } from 'react';

type RefreshResult = {
  results: Array<{ id: string; status: string; changed: boolean }>;
  hasAnyChange: boolean;
  refreshedCount: number;
  totalCount: number;
};

export function AutoRefresh({
  pendingTaskIds,
  intervalMs = 15000,
}: {
  pendingTaskIds: string[];
  intervalMs?: number;
}) {
  const router = useRouter();
  const isRefreshing = useRef(false);

  // Track IDs that have been confirmed completed to avoid re-checking
  const completedIdsRef = useRef<Set<string>>(new Set());

  const normalizedIds = useMemo(() => {
    const ids = pendingTaskIds.filter(Boolean);
    return Array.from(new Set(ids));
  }, [pendingTaskIds]);

  // Use stable key to detect content changes
  const idsKey = useMemo(() => [...normalizedIds].sort().join(','), [normalizedIds]);

  useEffect(() => {
    completedIdsRef.current.clear();
  }, [idsKey]);

  const refresh = useEffectEvent(async () => {
    const idsToRefresh = normalizedIds.filter(
      (id) => !completedIdsRef.current.has(id)
    );
    if (idsToRefresh.length === 0 || isRefreshing.current) return;

    isRefreshing.current = true;
    try {
      const response = await fetch('/api/user/ai-tasks/batch-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: idsToRefresh }),
      });

      if (!response.ok) {
        console.error('[AutoRefresh] Batch refresh failed:', response.status);
        return;
      }

      const data = await response.json();
      if (data.code !== 0) {
        console.error('[AutoRefresh] Batch refresh error:', data.message);
        return;
      }

      const result = data.data as RefreshResult;

      // Track completed tasks
      result.results.forEach((r) => {
        if (r.status !== 'pending' && r.status !== 'processing') {
          completedIdsRef.current.add(r.id);
        }
      });

      // Only refresh page if there are actual status changes
      if (result.hasAnyChange) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (error) {
      console.error('[AutoRefresh] Error:', error);
    } finally {
      isRefreshing.current = false;
    }
  });

  useEffect(() => {
    if (normalizedIds.length === 0) return;

    // Initial refresh on mount
    refresh();

    // Set up interval for subsequent refreshes
    const interval = setInterval(() => {
      refresh();
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [intervalMs, normalizedIds.length]);

  return null;
}
