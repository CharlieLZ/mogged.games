'use client';

import { Activity, CircleAlert, CircleCheck, CircleDashed } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import type { AIStudioAttempt } from '@/extensions/ai/types';
import { parseStudioTraceFromJson } from '@/shared/lib/ai-studio-trace';
import { cn } from '@/shared/lib/utils';

function getAttemptBadgeVariant(status: AIStudioAttempt['status']) {
  switch (status) {
    case 'success':
      return 'default';
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getAttemptIcon(status: AIStudioAttempt['status']) {
  switch (status) {
    case 'success':
      return <CircleCheck className="h-4 w-4 text-[var(--success)]" />;
    case 'failed':
      return <CircleAlert className="h-4 w-4 text-destructive" />;
    default:
      return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
  }
}

function getAttemptDotClass(status: AIStudioAttempt['status']) {
  switch (status) {
    case 'success':
      return 'border-[var(--success)] bg-[var(--success)]/15 text-[var(--success)]';
    case 'failed':
      return 'border-destructive bg-destructive/10 text-destructive';
    default:
      return 'border-muted-foreground/40 bg-muted text-muted-foreground';
  }
}

function getAttemptCardClass(status: AIStudioAttempt['status'], active: boolean) {
  return cn(
    'rounded-xl border bg-background/80 p-4 shadow-sm transition-colors',
    status === 'failed' && 'border-destructive/30 bg-destructive/5',
    status === 'success' && 'border-[var(--success)]/25 bg-[var(--success)]/5',
    active && 'ring-1 ring-primary/30'
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function StudioTraceCell({ taskInfo }: { taskInfo: unknown }) {
  const t = useTranslations('admin.aitasks.trace');
  const trace = parseStudioTraceFromJson(taskInfo);

  if (!trace) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const fallbackCount = Math.max(trace.attempts.length - 1, 0);
  const activeAttemptIndex = [...trace.attempts]
    .map((attempt, index) => ({ attempt, index }))
    .reverse()
    .find(
      ({ attempt }) =>
        attempt.status === 'success' &&
        attempt.provider === trace.activeProvider &&
        attempt.model === trace.activeModel
    )?.index;

  return (
    <Dialog>
      <div className="flex min-w-[220px] flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">
            {trace.activeProvider} / {trace.activeModel}
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          {t('summary', {
            attempts: trace.attempts.length,
            fallbacks: fallbackCount,
          })}
        </div>
        <DialogTrigger asChild>
          <Button variant="link" className="h-auto justify-start px-0 text-xs">
            {t('view')}
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-3">
            <div className="text-muted-foreground text-xs">{t('requested')}</div>
            <div className="mt-1 text-sm font-medium">
              {trace.requestedProvider} / {trace.requestedModel}
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-muted-foreground text-xs">{t('active')}</div>
            <div className="mt-1 text-sm font-medium">
              {trace.activeProvider} / {trace.activeModel}
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-muted-foreground text-xs">{t('summary', {
              attempts: trace.attempts.length,
              fallbacks: fallbackCount,
            })}</div>
            <div className="mt-1 text-sm font-medium">{formatDateTime(trace.updatedAt)}</div>
          </div>
          <div className="rounded-xl border p-3 md:col-span-2">
            <div className="text-muted-foreground text-xs">{t('scene')}</div>
            <div className="mt-1 text-sm font-medium">{trace.scene}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-muted-foreground text-xs">{t('updated_at')}</div>
            <div className="mt-1 text-sm font-medium">
              {formatDateTime(trace.updatedAt)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium">{t('attempt_chain')}</div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
            {trace.attempts.map((attempt, index) => (
              <div
                key={`${attempt.provider}-${attempt.model}-${index}`}
                className="flex items-center gap-2"
              >
                <Badge variant={getAttemptBadgeVariant(attempt.status)}>
                  {attempt.provider}
                </Badge>
                <span className="max-w-[180px] truncate text-sm">{attempt.model}</span>
                {index < trace.attempts.length - 1 ? (
                  <span className="text-muted-foreground text-xs">→</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="relative space-y-4 pl-6">
            <div className="bg-border absolute left-[11px] top-2 bottom-2 w-px" />
            {trace.attempts.map((attempt, index) => (
              <div
                key={`${attempt.provider}-${attempt.model}-detail-${index}`}
                className="relative"
              >
                <div
                  className={cn(
                    'absolute left-[-24px] top-5 flex h-6 w-6 items-center justify-center rounded-full border bg-background',
                    getAttemptDotClass(attempt.status)
                  )}
                >
                  {getAttemptIcon(attempt.status)}
                </div>
                <div
                  className={getAttemptCardClass(
                    attempt.status,
                    activeAttemptIndex === index
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium">
                          {t('attempt_index', { index: index + 1 })}
                        </span>
                        <Badge variant={getAttemptBadgeVariant(attempt.status)}>
                          {t(`status.${attempt.status}`)}
                        </Badge>
                        {activeAttemptIndex === index ? (
                          <Badge variant="outline">{t('active')}</Badge>
                        ) : null}
                      </div>
                      <div className="text-sm font-medium">
                        {attempt.label || `${attempt.provider} / ${attempt.model}`}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {attempt.provider} / {attempt.model}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-right text-xs">
                      {attempt.timestamp ? formatDateTime(attempt.timestamp) : '-'}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-muted-foreground text-xs">{t('provider')}</div>
                      <div>{attempt.provider}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{t('model')}</div>
                      <div>{attempt.model}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-muted-foreground text-xs">{t('label')}</div>
                      <div>{attempt.label || '-'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-muted-foreground text-xs">{t('error')}</div>
                      <div className="break-words whitespace-pre-wrap">
                        {attempt.error || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
