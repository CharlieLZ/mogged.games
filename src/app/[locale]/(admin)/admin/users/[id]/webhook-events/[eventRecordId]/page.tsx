import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAdminPermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common/empty';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { ADMIN_ROUTES } from '@/shared/lib/admin-routes';
import { getDayjs } from '@/shared/lib/dayjs';
import { findUserById } from '@/shared/models/user';
import {
  findWebhookEventByIdAndRelatedUserId,
  getWebhookEventAttemptsByWebhookEventId,
} from '@/shared/models/webhook_event';
import { Crumb } from '@/shared/types/blocks/common';

function formatText(value?: string | null) {
  return value?.trim() || '-';
}

function formatDateTime(
  value: Date | null | undefined,
  locale: string
): string {
  if (!value) {
    return '-';
  }

  return getDayjs(value, locale).format('YYYY-MM-DD HH:mm:ss');
}

function formatDuration(value?: number | null): string {
  if (value === null || value === undefined || value < 0) {
    return '-';
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  if (value < 60 * 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${(value / (60 * 1000)).toFixed(2)} min`;
}

function prettySerializedJson(value?: string | null): string {
  if (!value) {
    return '-';
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function renderCodeBlock(value?: string | null) {
  const formatted = value?.trim();
  if (!formatted) {
    return <div className="text-muted-foreground text-sm">-</div>;
  }

  return (
    <pre className="bg-muted/40 max-h-[520px] overflow-auto rounded-lg border p-4 text-xs break-all whitespace-pre-wrap">
      {formatted}
    </pre>
  );
}

function renderAttemptCodeBlock(value?: string | null) {
  const formatted = value?.trim();
  if (!formatted) {
    return null;
  }

  return (
    <pre className="bg-muted/30 max-h-72 overflow-auto rounded-md border p-3 text-xs break-all whitespace-pre-wrap">
      {formatted}
    </pre>
  );
}

export default async function UserWebhookEventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; eventRecordId: string }>;
}) {
  const { locale, id, eventRecordId } = await params;
  setRequestLocale(locale);

  await requireAdminPermission(PERMISSIONS.USERS_READ, locale);

  const [user, event] = await Promise.all([
    findUserById(id),
    findWebhookEventByIdAndRelatedUserId({
      id: eventRecordId,
      userId: id,
    }),
  ]);

  if (!user) {
    return <Empty message="User not found" />;
  }

  if (!event) {
    return <Empty message="Webhook event not found" />;
  }

  const attempts = await getWebhookEventAttemptsByWebhookEventId(event.id);

  const t = await getTranslations('admin.users');
  const replayCount = Math.max((event.deliveryCount || 1) - 1, 0);
  const missingAttemptCount = Math.max(
    (event.deliveryCount || 0) - attempts.length,
    0
  );

  const crumbs: Crumb[] = [
    { title: t('detail.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('detail.crumbs.users'), url: ADMIN_ROUTES.USERS },
    { title: t('detail.crumbs.detail'), url: ADMIN_ROUTES.user(user.id) },
    { title: t('webhook_detail.crumbs.detail'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t('webhook_detail.title')}
          actions={[
            {
              title: t('webhook_detail.actions.back_to_user'),
              url: ADMIN_ROUTES.user(user.id),
            },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t('webhook_detail.cards.event.title')}</CardTitle>
              <CardDescription>
                {t('webhook_detail.cards.event.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.provider')}
                </div>
                <div>{formatText(event.provider)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.source')}
                </div>
                <div>{formatText(event.source)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.event_type')}
                </div>
                <div>{formatText(event.eventType)}</div>
                <div className="text-muted-foreground text-xs">
                  {formatText(event.rawEventType)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.event_id')}
                </div>
                <div className="break-all">{formatText(event.eventId)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.status')}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{formatText(event.status)}</Badge>
                  <Badge variant="outline">
                    {formatText(event.lastDeliveryStatus)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('webhook_detail.cards.replay.title')}</CardTitle>
              <CardDescription>
                {t('webhook_detail.cards.replay.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.delivery_count')}
                  </div>
                  <div>{event.deliveryCount || 1}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.replay_count')}
                  </div>
                  <div>{replayCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.first_received_at')}
                  </div>
                  <div>{formatDateTime(event.createdAt, locale)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.last_received_at')}
                  </div>
                  <div>{formatDateTime(event.lastReceivedAt, locale)}</div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('webhook_detail.replay_note')}
                </div>
                <div>
                  {replayCount > 0
                    ? t('webhook_detail.replay_detected', {
                        deliveries: event.deliveryCount || 1,
                        replays: replayCount,
                      })
                    : t('webhook_detail.replay_clean')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t('webhook_detail.cards.processing.title')}
              </CardTitle>
              <CardDescription>
                {t('webhook_detail.cards.processing.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.processing_started_at')}
                  </div>
                  <div>
                    {formatDateTime(event.lastProcessingStartedAt, locale)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.processing_finished_at')}
                  </div>
                  <div>
                    {formatDateTime(event.lastProcessingFinishedAt, locale)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.processing_duration')}
                  </div>
                  <div>{formatDuration(event.lastProcessingDurationMs)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t('fields.processed_at')}
                  </div>
                  <div>{formatDateTime(event.processedAt, locale)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('webhook_detail.cards.request.title')}</CardTitle>
              <CardDescription>
                {t('webhook_detail.cards.request.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.device_ip')}
                </div>
                <div>{formatText(event.requestIpAddress)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.path')}
                </div>
                <div className="break-all">{formatText(event.requestPath)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.user_agent')}
                </div>
                <div className="break-all">
                  {formatText(event.requestUserAgent)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('webhook_detail.cards.binding.title')}</CardTitle>
              <CardDescription>
                {t('webhook_detail.cards.binding.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.name')}
                </div>
                <div>{formatText(user.name)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.email')}
                </div>
                <div>{formatText(user.email)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.order_no')}
                </div>
                <div>{formatText(event.relatedOrderNo)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {t('fields.subscription_id')}
                </div>
                <div>{formatText(event.relatedSubscriptionId)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('webhook_detail.cards.timeline.title')}</CardTitle>
              <CardDescription>
                {t('webhook_detail.cards.timeline.description', {
                  count: attempts.length,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {missingAttemptCount > 0 ? (
                <div className="bg-warning/10 text-warning-foreground border-warning/30 rounded-lg border px-4 py-3 text-sm">
                  {t('webhook_detail.timeline_partial', {
                    missing: missingAttemptCount,
                  })}
                </div>
              ) : null}
              {attempts.length > 0 ? (
                attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="rounded-xl border p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {t('webhook_detail.attempt_label', {
                          number: attempt.attemptNumber,
                        })}
                      </Badge>
                      <Badge variant="outline">
                        {formatText(attempt.deliveryStatus)}
                      </Badge>
                      <Badge variant="outline">
                        {formatText(attempt.processingStatus)}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
                      <div>
                        <div className="text-muted-foreground text-xs">
                          {t('fields.received_at')}
                        </div>
                        <div>{formatDateTime(attempt.receivedAt, locale)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          {t('fields.processing_duration')}
                        </div>
                        <div>
                          {formatDuration(attempt.processingDurationMs)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          {t('fields.processing_started_at')}
                        </div>
                        <div>
                          {formatDateTime(attempt.processingStartedAt, locale)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          {t('fields.processing_finished_at')}
                        </div>
                        <div>
                          {formatDateTime(attempt.processingFinishedAt, locale)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          {t('fields.device_ip')}
                        </div>
                        <div>{formatText(attempt.requestIpAddress)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          {t('fields.path')}
                        </div>
                        <div className="break-all">
                          {formatText(attempt.requestPath)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="text-muted-foreground mb-2 text-xs">
                          {t('fields.user_agent')}
                        </div>
                        <div className="text-sm break-all">
                          {formatText(attempt.requestUserAgent)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-2 text-xs">
                          {t('fields.error_message')}
                        </div>
                        {renderAttemptCodeBlock(attempt.errorMessage) || (
                          <div className="text-sm">-</div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-2 text-xs">
                          {t('fields.error_stack')}
                        </div>
                        {renderAttemptCodeBlock(attempt.errorStack) || (
                          <div className="text-sm">-</div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-2 text-xs">
                          {t('fields.payload')}
                        </div>
                        {renderAttemptCodeBlock(
                          prettySerializedJson(attempt.payload)
                        ) || <div className="text-sm">-</div>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">
                  {t('webhook_detail.timeline_empty')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('webhook_detail.cards.error.title')}</CardTitle>
              <CardDescription>
                {t('webhook_detail.cards.error.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-muted-foreground mb-2 text-xs">
                  {t('fields.error_message')}
                </div>
                {renderCodeBlock(event.errorMessage)}
              </div>
              <div>
                <div className="text-muted-foreground mb-2 text-xs">
                  {t('fields.error_stack')}
                </div>
                {renderCodeBlock(event.errorStack)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('webhook_detail.cards.payload.title')}</CardTitle>
              <CardDescription>
                {t('webhook_detail.cards.payload.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderCodeBlock(prettySerializedJson(event.payload))}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
