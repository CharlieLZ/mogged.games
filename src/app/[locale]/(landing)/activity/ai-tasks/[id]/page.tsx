import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Empty } from '@/shared/blocks/common/empty';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { getAITasksPath } from '@/shared/lib/ai-task-links';
import { collectAITaskVisibleMediaItems } from '@/shared/lib/ai-task-visible-media';
import { findAITaskById } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/services/current-user';

export default async function AITaskDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [t, user, task] = await Promise.all([
    getTranslations('activity.aitasks'),
    getUserInfo(),
    findAITaskById(id),
  ]);

  if (!user || !task || task.userId !== user.id) {
    return <Empty message={t('detail.not_found')} />;
  }

  const mediaItems = collectAITaskVisibleMediaItems({
    status: task.status,
    taskInfo: task.taskInfo,
    taskResult: task.taskResult,
  });

  return (
    <div className="container py-6 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Link
              href={getAITasksPath()}
              className="text-muted-foreground text-sm underline hover:no-underline"
            >
              {t('detail.back')}
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{t('detail.title')}</h1>
              <Badge variant="outline">{task.status || '-'}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('detail.description')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={getAITasksPath()}>{t('detail.open_activity')}</Link>
            </Button>
            {task.status === 'pending' || task.status === 'processing' ? (
              <Button asChild>
                <Link href={`/activity/ai-tasks/${task.id}/refresh`}>
                  {t('detail.refresh')}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('fields.status')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{task.status || '-'}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('fields.provider')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {task.provider || '-'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('fields.model')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{task.model || '-'}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t('fields.cost_credits')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {typeof task.costCredits === 'number' ? task.costCredits : '-'}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('fields.prompt')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7">
              {task.prompt?.trim() || t('detail.prompt_empty')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('fields.result')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mediaItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t('detail.empty_result')}
              </p>
            ) : (
              mediaItems.map((item, index) => {
                const label =
                  item.type === 'audio'
                    ? t('list.download.audio', { index: index + 1 })
                    : item.type === 'video'
                      ? t('list.download.video', { index: index + 1 })
                      : t('list.download.image', { index: index + 1 });

                return (
                  <div
                    key={`${item.url}-${index}`}
                    className="space-y-3 rounded-2xl border p-4"
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        controls
                        className="max-h-[60vh] w-full rounded-xl"
                      >
                        Your browser does not support video playback.
                      </video>
                    ) : item.type === 'audio' ? (
                      <audio src={item.url} controls className="w-full">
                        Your browser does not support audio playback.
                      </audio>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={label}
                        className="max-h-[60vh] w-full rounded-xl object-contain"
                      />
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <a href={item.url} download>
                          {label}
                        </a>
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {t('detail.open_result')}
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
