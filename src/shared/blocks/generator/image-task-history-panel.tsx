'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Expand,
  History,
  Loader2,
  PencilLine,
  RefreshCcw,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LazyImage } from '@/shared/blocks/common/lazy-image';
import {
  getImageModelOption,
  type ImageModelKey,
} from '@/shared/blocks/generator/image-generator-config';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  formatImageTaskHistoryTimestamp,
  type ImageTaskHistoryEntry,
} from '@/shared/lib/image-task-history';
import { cn } from '@/shared/lib/utils';

function RecentTaskStatusBadge({
  status,
}: {
  status: ImageTaskHistoryEntry['status'];
}) {
  const t = useTranslations('ai.image.generator');

  const content = (() => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: t('status.success'),
          className: 'border-success/30 bg-success/10 text-success',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          label: t('status.failed'),
          className: 'border-destructive/30 bg-destructive/10 text-destructive',
        };
      case 'canceled':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          label: t('status.canceled'),
          className: 'border-warning/30 bg-warning/10 text-warning-foreground',
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          label: t('status.processing'),
          className: 'border-border/70 bg-muted/60 text-muted-foreground',
        };
      case 'pending':
      default:
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          label: t('status.pending'),
          className: 'border-border/70 bg-muted/60 text-muted-foreground',
        };
    }
  })();

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 rounded-full px-2.5 py-1 text-xs',
        content.className
      )}
    >
      {content.icon}
      {content.label}
    </Badge>
  );
}

function getModelDisplayName(
  modelKey: ImageModelKey | undefined,
  t: ReturnType<typeof useTranslations>,
  tKey: string
): string | null {
  if (!modelKey) {
    return null;
  }

  try {
    const option = getImageModelOption(modelKey);

    return t(`${tKey}.${option.translationKey}.name`);
  } catch {
    return null;
  }
}

function RecentTaskFullPreviewDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: ImageTaskHistoryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('ai.image.generator');

  if (entry.media.length === 0) {
    return null;
  }

  const promptText = entry.prompt.trim() || t('recent_tasks_prompt_empty');
  const modelDisplayName = getModelDisplayName(
    entry.modelKey,
    t,
    'models.options'
  );
  const timestamp = formatImageTaskHistoryTimestamp(entry.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('recent_tasks_preview')}</DialogTitle>
          <DialogDescription className="sr-only">
            {promptText}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 space-y-2 rounded-xl border px-4 py-3">
            <p className="text-foreground/90 text-sm leading-relaxed font-semibold">
              {promptText}
            </p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              {timestamp ? (
                <span className="border-border/60 bg-background rounded-full border px-2.5 py-1">
                  {timestamp}
                </span>
              ) : null}
              {modelDisplayName ? (
                <span className="border-border/60 bg-background flex items-center gap-1.5 rounded-full border px-2.5 py-1">
                  <WandSparkles className="h-3 w-3" />
                  {modelDisplayName}
                </span>
              ) : null}
              {entry.imageResolution ? (
                <span className="border-border/60 bg-background rounded-full border px-2.5 py-1">
                  {entry.imageResolution}
                </span>
              ) : null}
              {entry.imageAspectRatio ? (
                <span className="border-border/60 bg-background rounded-full border px-2.5 py-1">
                  {entry.imageAspectRatio}
                </span>
              ) : null}
            </div>
          </div>

          {entry.media.map((item) => (
            <div key={item.id} className="space-y-2">
              {item.type === 'image' ? (
                <LazyImage
                  src={item.url}
                  alt={item.prompt || t('generated_image')}
                  className="max-h-[70vh] w-full rounded-xl object-contain"
                />
              ) : (
                <video
                  src={item.url}
                  controls
                  className="max-h-[70vh] w-full rounded-xl"
                />
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImageTaskHistoryPanel({
  entries,
  total,
  isGuestHistory,
  isLoading,
  deletingTaskId,
  downloadingMediaId,
  onCopyPrompt,
  onDownload,
  onReprompt,
  onRegenerate,
  onUpscale,
  onDelete,
}: {
  entries: ImageTaskHistoryEntry[];
  total: number;
  isGuestHistory: boolean;
  isLoading: boolean;
  deletingTaskId: string | null;
  downloadingMediaId: string | null;
  onCopyPrompt: (entry: ImageTaskHistoryEntry) => void;
  onDownload: (entry: ImageTaskHistoryEntry) => void;
  onReprompt: (entry: ImageTaskHistoryEntry) => void;
  onRegenerate: (entry: ImageTaskHistoryEntry) => void;
  onUpscale: (entry: ImageTaskHistoryEntry) => void;
  onDelete: (entry: ImageTaskHistoryEntry) => void;
}) {
  const t = useTranslations('ai.image.generator');
  const [previewEntry, setPreviewEntry] =
    useState<ImageTaskHistoryEntry | null>(null);
  const previewOpen = Boolean(previewEntry);
  const emptyStateText = isGuestHistory
    ? t('recent_tasks_guest_empty')
    : t('recent_tasks_empty');

  return (
    <>
      <Card
        data-slot="recent-tasks-panel"
        className="border-border/60 bg-card/95 gap-0 overflow-hidden rounded-[1.75rem] py-0 shadow-sm"
      >
        <CardHeader className="border-border/50 bg-background/55 gap-4 border-b px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              {isGuestHistory ? (
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                  {t('guest_history_title')}
                </p>
              ) : null}
              <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15">
                  <History className="h-4.5 w-4.5" />
                </span>
                <span>{t('recent_tasks_title')}</span>
              </CardTitle>
            </div>
            <Badge
              data-slot="recent-tasks-count"
              variant="secondary"
              className="bg-background text-foreground rounded-full border px-3 py-1 text-xs font-semibold shadow-sm"
            >
              {t('recent_tasks_count', {
                shown: entries.length,
                total,
              })}
            </Badge>
          </div>
          {isGuestHistory ? (
            <div
              data-slot="recent-tasks-guest-notice"
              className="border-border/60 bg-background/80 flex items-start gap-3 rounded-2xl border px-4 py-3"
            >
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-xl border">
                <AlertCircle className="h-4 w-4" />
              </span>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('guest_history_notice')}
              </p>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="px-5 py-5 sm:px-6">
          {isLoading && entries.length === 0 ? (
            <div
              data-slot="recent-tasks-empty-state"
              className="border-border/60 bg-background/75 flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] border border-dashed px-6 text-center"
            >
              <span className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-2xl border">
                <Loader2 className="h-5 w-5 animate-spin" />
              </span>
              <p className="text-foreground text-sm font-semibold">
                {t('recent_tasks_loading')}
              </p>
            </div>
          ) : entries.length > 0 ? (
            <ScrollArea className="max-h-[min(72rem,calc(100dvh-9rem))] pr-1">
              <div data-slot="recent-tasks-list" className="space-y-4">
                {entries.map((entry) => {
                  const promptText =
                    entry.prompt.trim() || t('recent_tasks_prompt_empty');
                  const primaryMedia = entry.media[0] || null;
                  const isDeleting = deletingTaskId === entry.id;
                  const isDownloading =
                    primaryMedia && downloadingMediaId === primaryMedia.id;
                  const canDownload = Boolean(primaryMedia?.url);
                  const canUpscale =
                    entry.status === 'success' &&
                    primaryMedia?.type === 'image' &&
                    Boolean(primaryMedia.url);
                  const modelDisplayName = getModelDisplayName(
                    entry.modelKey,
                    t,
                    'models.options'
                  );
                  const hasPendingStatus =
                    entry.status === 'pending' || entry.status === 'processing';

                  return (
                    <article
                      data-slot="recent-task-card"
                      key={entry.id}
                      className="border-border/60 bg-background/80 space-y-3 rounded-[1.4rem] border p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                            {formatImageTaskHistoryTimestamp(entry.createdAt)}
                          </p>
                          {modelDisplayName ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 rounded-full text-xs"
                            >
                              <WandSparkles className="h-3 w-3" />
                              {modelDisplayName}
                            </Badge>
                          ) : null}
                        </div>
                        <RecentTaskStatusBadge status={entry.status} />
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="line-clamp-3 cursor-pointer text-sm font-semibold hover:underline"
                          onClick={() => onCopyPrompt(entry)}
                          title={t('recent_tasks_copy_prompt')}
                        >
                          {promptText}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          data-slot="recent-task-prompt-copy"
                          className="size-9 shrink-0 rounded-full"
                          title={t('recent_tasks_copy_prompt')}
                          onClick={() => onCopyPrompt(entry)}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">
                            {t('recent_tasks_copy_prompt')}
                          </span>
                        </Button>
                      </div>

                      {primaryMedia ? (
                        <button
                          type="button"
                          className="border-border/70 bg-card hover:border-primary/40 focus-visible:ring-ring/45 w-full overflow-hidden rounded-2xl border text-left transition-colors focus-visible:ring-4 focus-visible:outline-none"
                          onClick={() => setPreviewEntry(entry)}
                          title={t('recent_tasks_preview')}
                        >
                          <LazyImage
                            src={primaryMedia.url}
                            alt={primaryMedia.prompt || t('generated_image')}
                            className="h-auto w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="border-border/70 text-muted-foreground flex min-h-40 items-center justify-center rounded-2xl border border-dashed px-4 text-sm">
                          {t(`status.${entry.status}`)}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          data-slot="recent-task-download"
                          className="size-10 rounded-full"
                          onClick={() => onDownload(entry)}
                          disabled={!canDownload || isDeleting || isDownloading}
                          title={t('recent_tasks_download')}
                        >
                          {isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {t('recent_tasks_download')}
                          </span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          data-slot="recent-task-expand"
                          className="size-10 rounded-full"
                          onClick={() => setPreviewEntry(entry)}
                          disabled={entry.media.length === 0}
                          title={t('recent_tasks_preview')}
                        >
                          <Expand className="h-4 w-4" />
                          <span className="sr-only">
                            {t('recent_tasks_preview')}
                          </span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-slot="recent-task-reprompt"
                          className="rounded-full px-4"
                          onClick={() => onReprompt(entry)}
                          disabled={isDeleting}
                        >
                          <PencilLine className="h-4 w-4" />
                          {t('recent_tasks_reprompt')}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-slot="recent-task-regenerate"
                          className="rounded-full px-4"
                          onClick={() => onRegenerate(entry)}
                          disabled={isDeleting || hasPendingStatus}
                        >
                          <RefreshCcw className="h-4 w-4" />
                          {t('recent_tasks_regenerate')}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-slot="recent-task-upscale"
                          className="rounded-full px-4"
                          onClick={() => onUpscale(entry)}
                          disabled={!canUpscale || isDeleting}
                        >
                          <Sparkles className="h-4 w-4" />
                          {t('recent_tasks_upscale')}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          data-slot="recent-task-delete"
                          className="ml-auto size-10 rounded-full"
                          onClick={() => onDelete(entry)}
                          disabled={isDeleting}
                          title={t('recent_tasks_delete')}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {t('recent_tasks_delete')}
                          </span>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div
              data-slot="recent-tasks-empty-state"
              className="from-background to-muted/30 border-border/60 flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] border border-dashed bg-gradient-to-br px-6 text-center"
            >
              <span className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/15">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="text-foreground max-w-sm text-sm font-semibold leading-6">
                {emptyStateText}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {previewEntry ? (
        <RecentTaskFullPreviewDialog
          key={previewEntry.id}
          entry={previewEntry}
          open={previewOpen}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewEntry(null);
            }
          }}
        />
      ) : null}
    </>
  );
}
