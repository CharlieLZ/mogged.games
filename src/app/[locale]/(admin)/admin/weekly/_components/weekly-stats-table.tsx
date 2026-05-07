'use client';

import { useTranslations } from 'next-intl';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import type { WeeklyStat } from '@/shared/models/admin-daily';

interface WeeklyStatsTableProps {
  stats: WeeklyStat[];
}

export function WeeklyStatsTable({ stats }: WeeklyStatsTableProps) {
  const t = useTranslations('admin.weekly');

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // 计算总计
  const totals = stats.reduce(
    (acc, stat) => ({
      users: acc.users + stat.users,
      payments: acc.payments + stat.payments,
      subscriptions: acc.subscriptions + stat.subscriptions,
      creditsConsumed: acc.creditsConsumed + stat.creditsConsumed,
      guestCreditsConsumed:
        acc.guestCreditsConsumed + stat.guestCreditsConsumed,
      creditsGranted: acc.creditsGranted + stat.creditsGranted,
      orders: acc.orders + stat.orders,
    }),
    {
      users: 0,
      payments: 0,
      subscriptions: 0,
      creditsConsumed: 0,
      guestCreditsConsumed: 0,
      creditsGranted: 0,
      orders: 0,
    }
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">{t('table.week')}</TableHead>
            <TableHead className="w-[180px]">{t('table.period')}</TableHead>
            <TableHead className="text-right">{t('table.users')}</TableHead>
            <TableHead className="text-right">{t('table.orders')}</TableHead>
            <TableHead className="text-right">{t('table.payments')}</TableHead>
            <TableHead className="text-right">{t('table.subscriptions')}</TableHead>
            <TableHead className="text-right">{t('table.credits_consumed')}</TableHead>
            <TableHead className="text-right">
              {t('table.guest_credits_consumed')}
            </TableHead>
            <TableHead className="text-right">{t('table.credits_granted')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* 总计行 */}
          <TableRow className="bg-muted/50 font-medium">
            <TableCell colSpan={2}>{t('table.total')}</TableCell>
            <TableCell className="text-right">{totals.users}</TableCell>
            <TableCell className="text-right">{totals.orders}</TableCell>
            <TableCell className="text-right">{formatMoney(totals.payments)}</TableCell>
            <TableCell className="text-right">{formatMoney(totals.subscriptions)}</TableCell>
            <TableCell className="text-right">{totals.creditsConsumed}</TableCell>
            <TableCell className="text-right">
              {totals.guestCreditsConsumed}
            </TableCell>
            <TableCell className="text-right">{totals.creditsGranted}</TableCell>
          </TableRow>
          {/* 每周数据 */}
          {stats.map((stat) => (
            <TableRow key={stat.week}>
              <TableCell className="font-medium">{stat.week}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {stat.weekStart} ~ {stat.weekEnd}
              </TableCell>
              <TableCell className="text-right">{stat.users || '-'}</TableCell>
              <TableCell className="text-right">{stat.orders || '-'}</TableCell>
              <TableCell className="text-right">
                {stat.payments ? formatMoney(stat.payments) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {stat.subscriptions ? formatMoney(stat.subscriptions) : '-'}
              </TableCell>
              <TableCell className="text-right">{stat.creditsConsumed || '-'}</TableCell>
              <TableCell className="text-right">
                {stat.guestCreditsConsumed || '-'}
              </TableCell>
              <TableCell className="text-right">{stat.creditsGranted || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
