import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { order } from '@/config/db/schema';

import {
  buildAcquisitionDimensionBreakdownStats,
  buildPaidOrderOccurredOnOrAfterFilter,
  buildDailyCohortFunnelStats,
  resolvePaidOrderOccurredAt,
  sortPaidOrdersByOccurredAt,
} from './admin-funnel';

vi.mock('server-only', () => ({}));

describe('admin funnel model', () => {
  it('prefers paidAt and falls back to createdAt when resolving paid order time', () => {
    const createdAt = new Date('2026-04-12T09:00:00Z');
    const paidAt = new Date('2026-04-12T09:10:00Z');

    expect(resolvePaidOrderOccurredAt({ createdAt, paidAt })).toEqual(paidAt);
    expect(
      resolvePaidOrderOccurredAt({
        createdAt,
        paidAt: null,
      })
    ).toEqual(createdAt);
  });

  it('sorts paid orders by the effective paid moment', () => {
    const sorted = sortPaidOrdersByOccurredAt([
      {
        id: 'late-created',
        createdAt: new Date('2026-04-12T09:30:00Z'),
        paidAt: null,
      },
      {
        id: 'early-paid',
        createdAt: new Date('2026-04-12T09:45:00Z'),
        paidAt: new Date('2026-04-12T09:05:00Z'),
      },
      {
        id: 'mid-paid',
        createdAt: new Date('2026-04-12T09:15:00Z'),
        paidAt: new Date('2026-04-12T09:20:00Z'),
      },
    ]);

    expect(sorted.map((row) => row.id)).toEqual([
      'early-paid',
      'mid-paid',
      'late-created',
    ]);
  });

  it('builds a paid-order lower-bound filter without COALESCE date binding', () => {
    const dialect = new PgDialect();
    const startDate = new Date('2026-04-12T00:00:00Z');
    const compiled = dialect.sqlToQuery(
      sql`select * from ${order} where ${buildPaidOrderOccurredOnOrAfterFilter(startDate)}`
    );

    expect(compiled.sql).toContain('"mogged_games"."order"."paid_at" >= $1');
    expect(compiled.sql).toContain(
      '"mogged_games"."order"."created_at" >= $2'
    );
    expect(compiled.sql).not.toContain('COALESCE');
    expect(compiled.params).toEqual([
      startDate.toISOString(),
      startDate.toISOString(),
    ]);
  });

  it('rolls up sequential funnel stages per signup cohort', () => {
    const stats = buildDailyCohortFunnelStats({
      periodKeys: ['2026-04-10', '2026-04-11'],
      journeys: [
        {
          userId: 'user-1',
          signupAt: new Date('2026-04-10T09:00:00Z'),
          firstSuccessfulGenerationAt: new Date('2026-04-10T09:05:00Z'),
          checkoutStartedAt: new Date('2026-04-10T09:10:00Z'),
          paidAt: new Date('2026-04-10T09:12:00Z'),
        },
        {
          userId: 'user-2',
          signupAt: new Date('2026-04-10T10:00:00Z'),
          firstSuccessfulGenerationAt: new Date('2026-04-10T10:05:00Z'),
        },
        {
          userId: 'user-3',
          signupAt: new Date('2026-04-11T08:00:00Z'),
        },
      ],
    });

    expect(stats).toEqual([
      {
        date: '2026-04-10',
        signups: 2,
        firstSuccessfulGenerations: 2,
        checkoutStarts: 1,
        paidUsers: 1,
        signupToFirstSuccessRate: 1,
        firstSuccessToCheckoutRate: 0.5,
        checkoutToPaidRate: 1,
        signupToPaidRate: 0.5,
      },
      {
        date: '2026-04-11',
        signups: 1,
        firstSuccessfulGenerations: 0,
        checkoutStarts: 0,
        paidUsers: 0,
        signupToFirstSuccessRate: 0,
        firstSuccessToCheckoutRate: 0,
        checkoutToPaidRate: 0,
        signupToPaidRate: 0,
      },
    ]);
  });

  it('does not count out-of-order checkout and paid timestamps', () => {
    const stats = buildDailyCohortFunnelStats({
      periodKeys: ['2026-04-12'],
      journeys: [
        {
          userId: 'user-1',
          signupAt: new Date('2026-04-12T09:00:00Z'),
          firstSuccessfulGenerationAt: new Date('2026-04-12T09:10:00Z'),
          checkoutStartedAt: new Date('2026-04-12T09:05:00Z'),
          paidAt: new Date('2026-04-12T09:20:00Z'),
        },
      ],
    });

    expect(stats[0]).toMatchObject({
      signups: 1,
      firstSuccessfulGenerations: 1,
      checkoutStarts: 0,
      paidUsers: 0,
      signupToFirstSuccessRate: 1,
      firstSuccessToCheckoutRate: 0,
      checkoutToPaidRate: 0,
      signupToPaidRate: 0,
    });
  });

  it('builds acquisition and cold start tuning breakdowns from acquisition data', () => {
    const stats = buildAcquisitionDimensionBreakdownStats({
      journeys: [
        {
          userId: 'user-1',
          signupAt: new Date('2026-04-10T09:00:00Z'),
          firstSuccessfulGenerationAt: new Date('2026-04-10T09:05:00Z'),
          checkoutStartedAt: new Date('2026-04-10T09:10:00Z'),
          paidAt: new Date('2026-04-10T09:12:00Z'),
        },
        {
          userId: 'user-2',
          signupAt: new Date('2026-04-10T10:00:00Z'),
          firstSuccessfulGenerationAt: new Date('2026-04-10T10:05:00Z'),
        },
        {
          userId: 'user-3',
          signupAt: new Date('2026-04-11T08:00:00Z'),
        },
      ],
      acquisitionByUserId: new Map([
        [
          'user-1',
          {
            utmCampaign: 'hh0414-en-t2v-mob-phr',
            utmAdgroup: 'hh0414-en-t2v-mob-phr-brand',
            utmWorkflow: 'text-to-video',
            utmMatch: 'phrase',
            countryCode: 'US',
            locale: 'en',
            utmLang: 'en',
            deviceType: 'mobile',
            utmDevice: 'mobile',
          },
        ],
        [
          'user-2',
          {
            utmCampaign: 'hh0414-en-t2v-mob-phr',
            utmAdgroup: 'hh0414-en-t2v-mob-phr-brand',
            utmWorkflow: 'text-to-video',
            utmMatch: 'phrase',
            countryCode: 'US',
            locale: 'fr',
            utmLang: null,
            deviceType: 'desktop',
            utmDevice: null,
          },
        ],
        [
          'user-3',
          {
            utmCampaign: 'hh0414-en-i2v-pc-exa',
            utmAdgroup: 'hh0414-en-i2v-pc-exa-brand',
            utmWorkflow: 'image-to-video',
            utmMatch: 'exact',
            countryCode: 'JP',
            locale: 'ja',
            utmLang: 'en',
            deviceType: 'tablet',
            utmDevice: 'mobile',
          },
        ],
      ]),
    });

    expect(stats.campaign[0]).toMatchObject({
      value: 'hh0414-en-t2v-mob-phr',
      signups: 2,
      paidUsers: 1,
    });
    expect(stats.adgroup[0]).toMatchObject({
      value: 'hh0414-en-t2v-mob-phr-brand',
      signups: 2,
    });
    expect(stats.workflow[0]).toMatchObject({
      value: 'text-to-video',
      signups: 2,
    });
    expect(stats.match[0]).toMatchObject({
      value: 'phrase',
      signups: 2,
    });
    expect(stats.country[0]).toMatchObject({
      value: 'US',
      signups: 2,
      paidUsers: 1,
    });
    expect(stats.language[0]).toMatchObject({
      value: 'en',
      signups: 2,
      paidUsers: 1,
    });
    expect(stats.device[0]).toMatchObject({
      value: 'mobile',
      signups: 2,
      paidUsers: 1,
    });
  });
});
