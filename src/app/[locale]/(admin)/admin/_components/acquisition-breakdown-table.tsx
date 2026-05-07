'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import type { AcquisitionBreakdownStat } from '@/shared/models/admin-funnel';

type AcquisitionBreakdownTableProps = {
  stats: AcquisitionBreakdownStat[];
  valueLabel: string;
  signupsLabel: string;
  firstSuccessesLabel: string;
  checkoutStartsLabel: string;
  paidUsersLabel: string;
  signupToPaidLabel: string;
  emptyText: string;
  missingValueText: string;
  limit?: number;
};

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function AcquisitionBreakdownTable({
  stats,
  valueLabel,
  signupsLabel,
  firstSuccessesLabel,
  checkoutStartsLabel,
  paidUsersLabel,
  signupToPaidLabel,
  emptyText,
  missingValueText,
  limit = 8,
}: AcquisitionBreakdownTableProps) {
  const visibleStats = stats.slice(0, limit);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{valueLabel}</TableHead>
            <TableHead className="text-right">{signupsLabel}</TableHead>
            <TableHead className="text-right">{firstSuccessesLabel}</TableHead>
            <TableHead className="text-right">{checkoutStartsLabel}</TableHead>
            <TableHead className="text-right">{paidUsersLabel}</TableHead>
            <TableHead className="text-right">{signupToPaidLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleStats.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-muted-foreground text-center"
                colSpan={6}
              >
                {emptyText}
              </TableCell>
            </TableRow>
          ) : null}
          {visibleStats.map((stat) => (
            <TableRow key={stat.value}>
              <TableCell className="max-w-[240px] break-all font-medium">
                {stat.value === '(unattributed)' ? missingValueText : stat.value}
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
                {formatRate(stat.signupToPaidRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
