import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAdminPermission } from '@/core/rbac';
import { AITaskStatus } from '@/extensions/ai/types';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  ADMIN_ROUTES,
  buildAdminHref,
  getRouteSearchParam,
  parseAdminPagination,
  type RouteSearchParams,
} from '@/shared/lib/admin-routes';
import { getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import { Button, Crumb, Search, Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

import { RefreshControls } from './_components/refresh-controls';
import { StudioTraceCell } from './_components/studio-trace-cell';
import { TaskResultCell } from './_components/task-result-cell';
import { TaskPreview } from './task-preview';

export const dynamic = 'force-dynamic';

export default async function AiTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAdminPermission(PERMISSIONS.AITASKS_READ, locale);

  const t = await getTranslations('admin.aitasks');

  const resolvedSearchParams = await searchParams;
  const { page, limit } = parseAdminPagination(resolvedSearchParams);
  const type = getRouteSearchParam(resolvedSearchParams.type);
  const email = getRouteSearchParam(resolvedSearchParams.email);
  const mediaType = !type || type === 'all' ? undefined : type;

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('list.crumbs.ai-tasks'), is_active: true },
  ];

  const total = await getAITasksCount({
    mediaType,
    userEmail: email,
  });

  const aiTasks = await getAITasks({
    getUser: true,
    page,
    limit,
    mediaType,
    userEmail: email,
  });

  const pendingTaskIds = aiTasks
    .filter(
      (task) =>
        task.status === AITaskStatus.PENDING ||
        task.status === AITaskStatus.PROCESSING
    )
    .map((task) => task.id);

  const table: Table = {
    columns: [
      { name: 'id', title: t('fields.task_id'), type: 'copy' },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      { name: 'user', title: t('fields.user'), type: 'user' },
      { name: 'status', title: t('fields.status'), type: 'label' },
      { name: 'costCredits', title: t('fields.cost_credits'), type: 'label' },
      { name: 'mediaType', title: t('fields.media_type'), type: 'label' },
      { name: 'scene', title: t('fields.scene'), type: 'label' },
      { name: 'provider', title: t('fields.provider'), type: 'label' },
      { name: 'model', title: t('fields.model'), type: 'label' },
      {
        name: 'trace',
        title: t('fields.trace'),
        callback: (item: { taskInfo: unknown }) => {
          return <StudioTraceCell taskInfo={item.taskInfo} />;
        },
      },
      { name: 'prompt', title: t('fields.prompt'), type: 'copy' },
      { name: 'options', title: t('fields.options'), type: 'json_preview' },
      {
        name: 'taskResult',
        title: t('fields.result'),
        callback: (item: {
          taskResult: unknown;
          status: string;
          options?: unknown;
          scene?: string | null;
        }) => {
          return (
            <TaskResultCell
              taskResult={item.taskResult}
              status={item.status}
              options={item.options}
              scene={item.scene}
            />
          );
        },
      },
      {
        name: 'preview',
        title: t('fields.preview'),
        callback: (item: {
          taskInfo: unknown;
          mediaType: string;
          status: string;
        }) => {
          return (
            <TaskPreview
              taskInfo={item.taskInfo}
              mediaType={item.mediaType}
              status={item.status}
            />
          );
        },
      },
    ],
    data: aiTasks,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const actions: Button[] = [];

  const search: Search = {
    name: 'email',
    title: t('list.search.email.title'),
    placeholder: t('list.search.email.placeholder'),
    value: email,
  };

  const tabs: Tab[] = [
    {
      title: t('list.tabs.all'),
      name: 'all',
      url: ADMIN_ROUTES.AI_TASKS,
      is_active: !mediaType,
    },
    {
      title: t('list.tabs.image'),
      name: 'image',
      url: buildAdminHref(ADMIN_ROUTES.AI_TASKS, { type: 'image' }),
      is_active: mediaType === 'image',
    },
    {
      title: t('list.tabs.video'),
      name: 'video',
      url: buildAdminHref(ADMIN_ROUTES.AI_TASKS, { type: 'video' }),
      is_active: mediaType === 'video',
    },
    {
      title: t('list.tabs.audio'),
      name: 'audio',
      url: buildAdminHref(ADMIN_ROUTES.AI_TASKS, { type: 'audio' }),
      is_active: mediaType === 'audio',
    },
    {
      title: t('list.tabs.text'),
      name: 'text',
      url: buildAdminHref(ADMIN_ROUTES.AI_TASKS, { type: 'text' }),
      is_active: mediaType === 'text',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <RefreshControls pendingTaskIds={pendingTaskIds} />
        <MainHeader
          title={t('list.title')}
          tabs={tabs}
          actions={actions}
          search={search}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
