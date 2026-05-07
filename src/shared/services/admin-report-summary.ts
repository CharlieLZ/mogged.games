import type { AdminReportWindow } from '@/shared/lib/admin-report-period';
import type {
  BingSiteReport,
  GoogleSiteReport,
  SiteMonitoringReportSet,
} from '@/shared/models/admin-report';
import { getAdminReportDigestData } from '@/shared/models/admin-report';

import { buildGoogleSiteReport } from './google-site-report';
import {
  buildBingSiteReportError,
  getBingSiteReport,
} from './site-monitoring/bing-site-report';

export type AdminReportEmailSummary = Omit<
  Awaited<ReturnType<typeof getAdminReportDigestData>>,
  'googleSiteReport' | 'siteMonitoring'
> & {
  googleSiteReport: GoogleSiteReport;
  siteMonitoring?: SiteMonitoringReportSet | null;
};

function shouldIncludeBingSiteMonitoring() {
  return process.env.ADMIN_REPORT_INCLUDE_BING_SITE_MONITORING !== 'false';
}

function logBingSummaryFailure(error: unknown) {
  console.error('[admin-report] bing site monitoring failed', {
    error: error instanceof Error ? error.message : String(error),
  });
}

function withBingSiteMonitoring(
  baseSummary: Awaited<ReturnType<typeof getAdminReportDigestData>>,
  bingSiteReport: BingSiteReport | null
) {
  if (!bingSiteReport) {
    return baseSummary.siteMonitoring ?? undefined;
  }

  return {
    ...(baseSummary.siteMonitoring || {}),
    bing: bingSiteReport,
  } satisfies SiteMonitoringReportSet;
}

export async function getAdminReportEmailSummary({
  window,
}: {
  window: AdminReportWindow;
}): Promise<AdminReportEmailSummary> {
  const [baseSummary, googleSiteReport, bingSiteReport] = await Promise.all([
    getAdminReportDigestData({
      window,
    }),
    buildGoogleSiteReport({
      frequency: window.frequency,
      now: window.endAt,
    }),
    shouldIncludeBingSiteMonitoring()
      ? getBingSiteReport({
          now: window.endAt,
        }).catch((error) => {
          logBingSummaryFailure(error);

          return buildBingSiteReportError({
            message: error instanceof Error ? error.message : String(error),
            now: window.endAt,
          });
        })
      : Promise.resolve(null),
  ]);

  return {
    ...baseSummary,
    googleSiteReport,
    siteMonitoring: withBingSiteMonitoring(baseSummary, bingSiteReport),
  } satisfies AdminReportEmailSummary;
}
