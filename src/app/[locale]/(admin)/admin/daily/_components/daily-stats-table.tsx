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
import type { DailyStat } from '@/shared/models/admin-daily';

interface DailyStatsTableProps {
  stats: DailyStat[];
}

export function DailyStatsTable({ stats }: DailyStatsTableProps) {
  const t = useTranslations('admin.daily');

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD 格式
  };

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
            <TableHead className="w-[120px]">{t('table.date')}</TableHead>
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
            <TableCell>{t('table.total')}</TableCell>
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
          {/* 每日数据 */}
          {stats.map((stat) => (
            <TableRow key={stat.date}>
              <TableCell className="font-medium">{formatDate(stat.date)}</TableCell>
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
