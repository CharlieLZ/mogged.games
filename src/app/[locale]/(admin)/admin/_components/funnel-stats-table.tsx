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
import type {
  DailyFunnelStat,
  MonthlyFunnelStat,
} from '@/shared/models/admin-funnel';

type FunnelStat = DailyFunnelStat | MonthlyFunnelStat;

interface FunnelStatsTableProps {
  stats: FunnelStat[];
  translationNamespace: 'admin.daily' | 'admin.monthly';
  periodLabel: 'date' | 'month';
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function isDailyStat(stat: FunnelStat): stat is DailyFunnelStat {
  return 'date' in stat;
}

export function FunnelStatsTable({
  stats,
  translationNamespace,
  periodLabel,
}: FunnelStatsTableProps) {
  const t = useTranslations(translationNamespace);

  const totals = stats.reduce(
    (acc, stat) => ({
      signups: acc.signups + stat.signups,
      firstSuccessfulGenerations:
        acc.firstSuccessfulGenerations + stat.firstSuccessfulGenerations,
      checkoutStarts: acc.checkoutStarts + stat.checkoutStarts,
      paidUsers: acc.paidUsers + stat.paidUsers,
    }),
    {
      signups: 0,
      firstSuccessfulGenerations: 0,
      checkoutStarts: 0,
      paidUsers: 0,
    }
  );

  const totalRates = {
    signupToFirstSuccessRate:
      totals.signups > 0
        ? totals.firstSuccessfulGenerations / totals.signups
        : 0,
    firstSuccessToCheckoutRate:
      totals.firstSuccessfulGenerations > 0
        ? totals.checkoutStarts / totals.firstSuccessfulGenerations
        : 0,
    checkoutToPaidRate:
      totals.checkoutStarts > 0 ? totals.paidUsers / totals.checkoutStarts : 0,
    signupToPaidRate:
      totals.signups > 0 ? totals.paidUsers / totals.signups : 0,
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">
              {t(`funnel.table.${periodLabel}`)}
            </TableHead>
            <TableHead className="text-right">
              {t('funnel.table.signups')}
            </TableHead>
            <TableHead className="text-right">
              {t('funnel.table.first_successful_generations')}
            </TableHead>
            <TableHead className="text-right">
              {t('funnel.table.checkout_starts')}
            </TableHead>
            <TableHead className="text-right">
              {t('funnel.table.paid_users')}
            </TableHead>
            <TableHead className="text-right">
              {t('funnel.table.signup_to_first_success')}
            </TableHead>
            <TableHead className="text-right">
              {t('funnel.table.first_success_to_checkout')}
            </TableHead>
            <TableHead className="text-right">
              {t('funnel.table.checkout_to_paid')}
            </TableHead>
            <TableHead className="text-right">
              {t('funnel.table.signup_to_paid')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-muted/50 font-medium">
            <TableCell>{t('funnel.table.total')}</TableCell>
            <TableCell className="text-right">{totals.signups}</TableCell>
            <TableCell className="text-right">
              {totals.firstSuccessfulGenerations}
            </TableCell>
            <TableCell className="text-right">
              {totals.checkoutStarts}
            </TableCell>
            <TableCell className="text-right">{totals.paidUsers}</TableCell>
            <TableCell className="text-right">
              {formatRate(totalRates.signupToFirstSuccessRate)}
            </TableCell>
            <TableCell className="text-right">
              {formatRate(totalRates.firstSuccessToCheckoutRate)}
            </TableCell>
            <TableCell className="text-right">
              {formatRate(totalRates.checkoutToPaidRate)}
            </TableCell>
            <TableCell className="text-right">
              {formatRate(totalRates.signupToPaidRate)}
            </TableCell>
          </TableRow>
          {stats.map((stat) => (
            <TableRow key={isDailyStat(stat) ? stat.date : stat.month}>
              <TableCell className="font-medium">
                {isDailyStat(stat)
                  ? new Date(stat.date).toLocaleDateString('en-CA')
                  : stat.month}
              </TableCell>
              <TableCell className="text-right">{stat.signups}</TableCell>
              <TableCell className="text-right">
                {stat.firstSuccessfulGenerations}
              </TableCell>
              <TableCell className="text-right">
                {stat.checkoutStarts}
              </TableCell>
              <TableCell className="text-right">{stat.paidUsers}</TableCell>
              <TableCell className="text-right">
                {formatRate(stat.signupToFirstSuccessRate)}
              </TableCell>
              <TableCell className="text-right">
                {formatRate(stat.firstSuccessToCheckoutRate)}
              </TableCell>
              <TableCell className="text-right">
                {formatRate(stat.checkoutToPaidRate)}
              </TableCell>
              <TableCell className="text-right">
                {formatRate(stat.signupToPaidRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
