import {
  getAppDomain,
  getAppName,
  getSupportEmail,
} from '@/shared/lib/brand';
import { SITE_THEME_COLOR } from '@/shared/lib/site-visuals';
import type {
  AdminReportFailureReasonRow,
  AdminReportRefundRow,
  AdminReportTaskBreakdownRow,
  BingSiteReport,
  SiteMonitoringMetric,
} from '@/shared/models/admin-report';
import type { AdminReportEmailSummary } from '@/shared/services/admin-report-summary';

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;

const PALETTE = {
  accent: SITE_THEME_COLOR,
  accentSoft: '#edf3fb',
  pageBg: '#f5f7fb',
  cardBg: '#ffffff',
  border: '#d9e2ec',
  textStrong: '#0f172a',
  textMuted: '#475569',
  textSoft: '#64748b',
  tableStripe: '#fbfdff',
  warningSoft: '#fff7ed',
} as const;

type AdminReportEmailInput = {
  to: string[];
  summary: AdminReportEmailSummary;
};

type MetricCard = {
  label: string;
  value: string;
  delta?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatInteger(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

function formatCurrency(value: number) {
  return `$${(value / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDelta(current: number, previous: number, formatter = formatInteger) {
  const diff = current - previous;

  if (diff === 0) {
    return '较上期持平';
  }

  const prefix = diff > 0 ? '+' : '-';
  return `较上期 ${prefix}${formatter(Math.abs(diff))}`;
}

function formatIsoTime(value?: string | null) {
  if (!value) {
    return '暂无';
  }

  return value;
}

function formatPosition(value?: number | null) {
  if (!value || value <= 0) {
    return '暂无';
  }

  return value.toFixed(1);
}

function formatClsValue(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '暂无';
  }

  return value.toFixed(3);
}

function formatMs(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '暂无';
  }

  return `${Math.round(value)} ms`;
}

function getFrequencyLabel(
  frequency: AdminReportEmailSummary['window']['frequency']
) {
  if (frequency === 'weekly') {
    return '周报';
  }

  if (frequency === 'monthly') {
    return '月报';
  }

  return '日报';
}

function buildMetricCards(summary: AdminReportEmailSummary): MetricCard[] {
  return [
    {
      label: '注册用户',
      value: formatInteger(summary.current.signups),
      delta: formatDelta(summary.current.signups, summary.previous.signups),
    },
    {
      label: '付费用户',
      value: formatInteger(summary.current.paidUsers),
      delta: formatDelta(summary.current.paidUsers, summary.previous.paidUsers),
    },
    {
      label: '总收入',
      value: formatCurrency(summary.current.grossRevenue),
      delta: formatDelta(
        summary.current.grossRevenue,
        summary.previous.grossRevenue,
        formatCurrency
      ),
    },
    {
      label: '退款',
      value: `${formatInteger(summary.current.refundCount)} / ${formatCurrency(summary.current.refundAmount)}`,
      delta: formatDelta(summary.current.refundCount, summary.previous.refundCount),
    },
    {
      label: '积分消耗',
      value: formatInteger(summary.current.creditsConsumed),
      delta: formatDelta(
        summary.current.creditsConsumed,
        summary.previous.creditsConsumed
      ),
    },
    {
      label: '访客成本',
      value: formatInteger(summary.current.guestCreditsConsumed),
      delta: formatDelta(
        summary.current.guestCreditsConsumed,
        summary.previous.guestCreditsConsumed
      ),
    },
    {
      label: '新任务',
      value: formatInteger(summary.current.tasksCreated),
      delta: formatDelta(summary.current.tasksCreated, summary.previous.tasksCreated),
    },
    {
      label: '成功任务',
      value: `${formatInteger(summary.current.taskSucceeded)} / ${formatPercent(summary.current.successRate)}`,
      delta: formatDelta(
        summary.current.taskSucceeded,
        summary.previous.taskSucceeded
      ),
    },
    {
      label: '失败任务',
      value: formatInteger(summary.current.taskFailed),
      delta: formatDelta(summary.current.taskFailed, summary.previous.taskFailed),
    },
  ];
}

function renderMetricCardRows(cards: MetricCard[]) {
  const rows: string[] = [];

  for (let index = 0; index < cards.length; index += 2) {
    rows.push(`<tr>${renderMetricCards(cards.slice(index, index + 2))}</tr>`);
  }

  return rows.join('');
}

function renderMetricCards(cards: MetricCard[]) {
  return cards
    .map(
      (card) => `<td style="width:50%;padding:8px;vertical-align:top;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.cardBg};border:1px solid ${PALETTE.border};border-radius:14px;">
    <tr>
      <td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${PALETTE.textSoft};">${escapeHtml(card.label)}</p>
        <p style="margin:0 0 6px;font-size:22px;font-weight:700;line-height:1.2;color:${PALETTE.textStrong};">${escapeHtml(card.value)}</p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:${PALETTE.textMuted};">${escapeHtml(card.delta || '')}</p>
      </td>
    </tr>
  </table>
</td>`
    )
    .join('');
}

function renderTaskBreakdownRows(rows: AdminReportTaskBreakdownRow[]) {
  if (rows.length === 0) {
    return `<tr><td colspan="6" style="padding:14px 16px;color:${PALETTE.textSoft};">本期没有任务活动。</td></tr>`;
  }

  return rows
    .map(
      (row, index) => `<tr style="background:${index % 2 === 0 ? PALETTE.cardBg : PALETTE.tableStripe};">
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.scene)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.mediaType)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${formatInteger(row.created)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${formatInteger(row.succeeded)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${formatInteger(row.failed)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${formatInteger(row.canceled)}</td>
</tr>`
    )
    .join('');
}

function renderFailureReasons(rows: AdminReportFailureReasonRow[]) {
  if (rows.length === 0) {
    return `<p style="margin:0;color:${PALETTE.textSoft};">本期没有记录到失败原因。</p>`;
  }

  return rows
    .map(
      (row) => `<li style="margin:0 0 10px;">
  <strong>${escapeHtml(row.reason)}</strong>
  <span style="color:${PALETTE.textSoft};">（${formatInteger(row.count)} · ${escapeHtml(row.provider)} · ${escapeHtml(row.mediaType)} · ${escapeHtml(row.scene)}）</span>
</li>`
    )
    .join('');
}

function renderRecentRefundRows(rows: AdminReportRefundRow[]) {
  if (rows.length === 0) {
    return `<tr><td colspan="4" style="padding:14px 16px;color:${PALETTE.textSoft};">本期没有退款事件。</td></tr>`;
  }

  return rows
    .map(
      (row, index) => `<tr style="background:${index % 2 === 0 ? PALETTE.cardBg : PALETTE.tableStripe};">
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.provider)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.orderNo || 'unknown')}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${escapeHtml(row.currency?.toUpperCase() || 'USD')} ${formatCurrency(row.amount).replace('$', '')}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.createdAt.toISOString())}</td>
</tr>`
    )
    .join('');
}

function buildGoogleSearchText(summary: AdminReportEmailSummary) {
  const report = summary.googleSiteReport;

  if (!report) {
    return [];
  }

  const lines = [
    '',
    'Google 搜索表现：',
    `- 属性: ${report.property}`,
    `- 区间: ${report.searchPerformance.range.label}（${report.searchPerformance.range.startDate} ~ ${report.searchPerformance.range.endDate}，${report.searchPerformance.range.googleTimeZone}）`,
  ];

  if (report.searchPerformance.status === 'ok' && report.searchPerformance.totals) {
    lines.push(
      `- 点击: ${formatInteger(report.searchPerformance.totals.clicks)}`,
      `- 展现: ${formatInteger(report.searchPerformance.totals.impressions)}`,
      `- CTR: ${formatPercent(report.searchPerformance.totals.ctr)}`,
      `- 平均排名: ${formatPosition(report.searchPerformance.totals.position)}`
    );
  } else {
    lines.push(
      `- Google 搜索表现获取失败: ${report.searchPerformance.errorMessage || '未知错误'}`
    );
  }

  lines.push('', 'URL 检查：');
  if (report.urlInspection.status === 'ok') {
    for (const row of report.urlInspection.rows) {
      lines.push(
        `- ${row.path}: verdict=${row.verdict} / coverage=${row.coverageState} / noindex=${row.indexingState} / robots=${row.robotsTxtState}`
      );
    }
  } else {
    lines.push(`- URL 检查获取失败: ${report.urlInspection.errorMessage || '未知错误'}`);
  }

  lines.push('', 'Sitemap 状态：');
  if (report.sitemap.status === 'ok') {
    lines.push(
      `- 地址: ${report.sitemap.sitemapUrl}`,
      `- submitted/indexed: ${formatInteger(report.sitemap.contentsSubmitted)} / ${formatInteger(report.sitemap.contentsIndexed)}`,
      `- warnings/errors: ${formatInteger(report.sitemap.warnings)} / ${formatInteger(report.sitemap.errors)}`,
      `- last submitted: ${formatIsoTime(report.sitemap.lastSubmitted)}`
    );
  } else {
    lines.push(`- Sitemap 获取失败: ${report.sitemap.errorMessage || '未知错误'}`);
  }

  lines.push('', 'Core Web Vitals：');
  if (report.coreWebVitals.status === 'ok') {
    const fieldData = report.coreWebVitals.fieldData;
    lines.push(`- 数据来源: ${report.coreWebVitals.source || '未知'}`);
    if (fieldData) {
      lines.push(
        `- 源站体感: ${fieldData.overallCategory} / LCP ${formatMs(fieldData.largestContentfulPaintMs)} / INP ${formatMs(fieldData.interactionToNextPaintMs)} / CLS ${formatClsValue(fieldData.cumulativeLayoutShift)}`
      );
    }
    for (const snapshot of report.coreWebVitals.labSnapshots) {
      lines.push(
        `- ${snapshot.url} (${snapshot.strategy}): score=${snapshot.performanceScore ?? '暂无'} / LCP ${formatMs(snapshot.largestContentfulPaintMs)} / TBT ${formatMs(snapshot.totalBlockingTimeMs)} / CLS ${formatClsValue(snapshot.cumulativeLayoutShift)}`
      );
    }
  } else {
    lines.push(`- Core Web Vitals 获取失败: ${report.coreWebVitals.errorMessage || '未知错误'}`);
  }

  lines.push('', 'Search Console 检查卡：');
  for (const card of report.checkCards) {
    lines.push(`- ${card.title}: ${card.description} / ${card.href}`);
  }

  if (report.notes.length > 0) {
    lines.push('', '备注：', ...report.notes.map((note) => `- ${note}`));
  }

  return lines;
}

function formatSiteMonitoringMetric(metric: SiteMonitoringMetric) {
  return `${metric.name} ${metric.displayValue} (${metric.rating})`;
}

function buildBingSiteMonitoringText(summary: AdminReportEmailSummary) {
  const report = summary.siteMonitoring?.bing;

  if (!report) {
    return [];
  }

  return [
    '',
    'Bing 站点体检 / Bing Site Monitoring：',
    `- 状态: ${report.status}`,
    `- Summary: ${report.summaryMessage}`,
    `- Checked URLs: ${formatInteger(report.checkedUrlCount)} / Expected: ${formatInteger(report.expectedSitemapUrlCount)}`,
    `- Pass / Warning / Error: ${formatInteger(report.counts.passCount)} / ${formatInteger(report.counts.warningCount)} / ${formatInteger(report.counts.errorCount)}`,
    '',
    'Discovery Endpoints / 发现入口：',
    ...(report.discovery.length > 0
      ? report.discovery.map(
          (entry) =>
            `- ${entry.label}: ${entry.url} / ${entry.statusCode ?? 'unknown'}`
        )
      : ['- 暂无 Discovery 结果。']),
    '',
    'Top Queries / 热门查询：',
    ...(report.api.topQueries.length > 0
      ? report.api.topQueries.map(
          (row) =>
            `- ${row.label}: clicks ${formatInteger(row.clicks)} / impressions ${formatInteger(row.impressions)}`
        )
      : ['- 暂无 Bing query 数据。']),
    '',
    'Core Web Vitals / 核心网页指标：',
    ...(report.experience.cruxMetrics.length > 0
      ? report.experience.cruxMetrics.map(
          (metric) => `- CrUX ${formatSiteMonitoringMetric(metric)}`
        )
      : ['- 暂无 CrUX 指标。']),
    ...(report.experience.psiMobileMetrics.length > 0
      ? report.experience.psiMobileMetrics.map(
          (metric) => `- PSI Mobile ${formatSiteMonitoringMetric(metric)}`
        )
      : ['- 暂无 PSI Mobile 指标。']),
  ];
}

function buildTextSummary(summary: AdminReportEmailSummary) {
  const lines = [
    `${getAppName()} 管理员汇总`,
    `${getFrequencyLabel(summary.window.frequency)}: ${summary.window.periodKey}`,
    `统计窗口: ${summary.window.label}`,
    `时区: ${summary.timezone}`,
    '',
    `注册: ${formatInteger(summary.current.signups)}（${formatDelta(summary.current.signups, summary.previous.signups)}）`,
    `首次成功用户: ${formatInteger(summary.current.firstSuccessfulUsers)}`,
    `发起结账用户: ${formatInteger(summary.current.checkoutUsers)}`,
    `付费用户: ${formatInteger(summary.current.paidUsers)}`,
    `已支付订单: ${formatInteger(summary.current.paidOrders)}`,
    `总收入: ${formatCurrency(summary.current.grossRevenue)}`,
    `一次性收入: ${formatCurrency(summary.current.oneTimeRevenue)}`,
    `订阅收入: ${formatCurrency(summary.current.subscriptionRevenue)}`,
    `退款: ${formatInteger(summary.current.refundCount)} / ${formatCurrency(summary.current.refundAmount)}`,
    `争议: ${formatInteger(summary.current.disputeCount)}`,
    `净收入: ${formatCurrency(summary.current.netRevenue)}`,
    `积分消耗: ${formatInteger(summary.current.creditsConsumed)}`,
    `访客成本: ${formatInteger(summary.current.guestCreditsConsumed)}`,
    `积分发放: ${formatInteger(summary.current.creditsGranted)}`,
    `积分退款: ${formatInteger(summary.current.creditsRefunded)}`,
    `新任务: ${formatInteger(summary.current.tasksCreated)}`,
    `成功任务: ${formatInteger(summary.current.taskSucceeded)}`,
    `失败任务: ${formatInteger(summary.current.taskFailed)}`,
    `取消任务: ${formatInteger(summary.current.taskCanceled)}`,
    `任务成功率: ${formatPercent(summary.current.successRate)}`,
    '',
    '任务分布：',
    ...(summary.taskBreakdown.length > 0
      ? summary.taskBreakdown.map(
          (row) =>
            `- ${row.scene}（${row.mediaType}）：created ${row.created} / success ${row.succeeded} / failed ${row.failed} / canceled ${row.canceled}`
        )
      : ['- 本期没有任务活动。']),
    '',
    '失败原因：',
    ...(summary.failureReasons.length > 0
      ? summary.failureReasons.map(
          (row) =>
            `- ${row.reason}（${row.count} · ${row.provider} · ${row.mediaType} · ${row.scene}）`
        )
      : ['- 本期没有记录到失败原因。']),
    '',
    '最近退款：',
    ...(summary.recentRefunds.length > 0
      ? summary.recentRefunds.map(
          (row) =>
            `- ${row.provider} / ${row.orderNo || 'unknown'} / ${(row.currency || 'USD').toUpperCase()} ${formatCurrency(row.amount).replace('$', '')} / ${row.createdAt.toISOString()}`
        )
      : ['- 本期没有退款事件。']),
    ...(summary.googleSiteReport ? buildGoogleSearchText(summary) : []),
    ...(summary.siteMonitoring?.bing ? buildBingSiteMonitoringText(summary) : []),
  ];

  return lines.join('\n');
}

function renderSimpleDataRows(
  rows: Array<{
    key: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>,
  emptyText: string
) {
  if (rows.length === 0) {
    return `<tr><td colspan="5" style="padding:14px 16px;color:${PALETTE.textSoft};">${escapeHtml(emptyText)}</td></tr>`;
  }

  return rows
    .map(
      (row, index) => `<tr style="background:${index % 2 === 0 ? PALETTE.cardBg : PALETTE.tableStripe};">
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.key)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${formatInteger(row.clicks)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${formatInteger(row.impressions)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${formatPercent(row.ctr)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};text-align:right;">${formatPosition(row.position)}</td>
</tr>`
    )
    .join('');
}

function renderUrlInspectionRows(summary: AdminReportEmailSummary) {
  const report = summary.googleSiteReport;

  if (!report) {
    return `<tr><td colspan="5" style="padding:14px 16px;color:${PALETTE.textSoft};">暂无 URL 检查结果。</td></tr>`;
  }

  const rows = report.urlInspection.rows;

  if (rows.length === 0) {
    return `<tr><td colspan="5" style="padding:14px 16px;color:${PALETTE.textSoft};">暂无 URL 检查结果。</td></tr>`;
  }

  return rows
    .map(
      (row, index) => `<tr style="background:${index % 2 === 0 ? PALETTE.cardBg : PALETTE.tableStripe};">
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.path)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.verdict)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.coverageState)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.indexingState)}</td>
  <td style="padding:12px 14px;border-top:1px solid ${PALETTE.border};">${escapeHtml(row.robotsTxtState)}</td>
</tr>`
    )
    .join('');
}

function renderGoogleSearchSection(summary: AdminReportEmailSummary) {
  const report = summary.googleSiteReport;

  if (!report) {
    return '';
  }

  const totals = report.searchPerformance.totals;
  const performanceBody =
    report.searchPerformance.status === 'ok' && totals
      ? `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">区间：${escapeHtml(
          `${report.searchPerformance.range.label}（${report.searchPerformance.range.startDate} ~ ${report.searchPerformance.range.endDate}，${report.searchPerformance.range.googleTimeZone}）`
        )}</p>
        <p style="margin:0 0 8px;color:${PALETTE.textMuted};">点击 ${formatInteger(totals.clicks)} / 展现 ${formatInteger(totals.impressions)} / CTR ${formatPercent(totals.ctr)} / 平均排名 ${formatPosition(totals.position)}</p>`
      : `<p style="margin:0;color:${PALETTE.textMuted};">Google 搜索表现获取失败：${escapeHtml(report.searchPerformance.errorMessage || '未知错误')}</p>`;

  const sitemapBody =
    report.sitemap.status === 'ok'
      ? `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">地址：${escapeHtml(report.sitemap.sitemapUrl)}</p>
        <p style="margin:0 0 8px;color:${PALETTE.textMuted};">submitted / indexed：${formatInteger(report.sitemap.contentsSubmitted)} / ${formatInteger(report.sitemap.contentsIndexed)}</p>
        <p style="margin:0 0 8px;color:${PALETTE.textMuted};">warnings / errors：${formatInteger(report.sitemap.warnings)} / ${formatInteger(report.sitemap.errors)}</p>
        <p style="margin:0;color:${PALETTE.textMuted};">last submitted：${escapeHtml(formatIsoTime(report.sitemap.lastSubmitted))}</p>`
      : `<p style="margin:0;color:${PALETTE.textMuted};">Sitemap 获取失败：${escapeHtml(report.sitemap.errorMessage || '未知错误')}</p>`;

  const coreWebVitalsBody =
    report.coreWebVitals.status === 'ok'
      ? `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">数据来源：${escapeHtml(report.coreWebVitals.source || '未知')}</p>
        ${
          report.coreWebVitals.fieldData
            ? `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">源站体感：${escapeHtml(report.coreWebVitals.fieldData.overallCategory)} / LCP ${formatMs(report.coreWebVitals.fieldData.largestContentfulPaintMs)} / INP ${formatMs(report.coreWebVitals.fieldData.interactionToNextPaintMs)} / CLS ${formatClsValue(report.coreWebVitals.fieldData.cumulativeLayoutShift)}</p>`
            : ''
        }
        ${
          report.coreWebVitals.labSnapshots.length > 0
            ? report.coreWebVitals.labSnapshots
                .map(
                  (snapshot) => `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">${escapeHtml(snapshot.url)}（${escapeHtml(snapshot.strategy)}）：score ${snapshot.performanceScore ?? '暂无'} / LCP ${formatMs(snapshot.largestContentfulPaintMs)} / TBT ${formatMs(snapshot.totalBlockingTimeMs)} / CLS ${formatClsValue(snapshot.cumulativeLayoutShift)}</p>`
                )
                .join('')
            : `<p style="margin:0;color:${PALETTE.textMuted};">暂无 PSI 快照。</p>`
        }`
      : `<p style="margin:0;color:${PALETTE.textMuted};">Core Web Vitals 获取失败：${escapeHtml(report.coreWebVitals.errorMessage || '未知错误')}</p>`;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
  <tr>
    <td style="padding:18px 18px 10px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Google 搜索表现</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 18px 18px;">${performanceBody}</td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};overflow:hidden;">
  <tr>
    <td style="padding:18px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Top Queries</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:${PALETTE.accentSoft};">
          <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Query</th>
          <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Clicks</th>
          <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Impressions</th>
          <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">CTR</th>
          <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Position</th>
        </tr>
        ${renderSimpleDataRows(report.searchPerformance.topQueries, '暂无 Query 数据。')}
      </table>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};overflow:hidden;">
  <tr>
    <td style="padding:18px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Top Pages</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:${PALETTE.accentSoft};">
          <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Page</th>
          <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Clicks</th>
          <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Impressions</th>
          <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">CTR</th>
          <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Position</th>
        </tr>
        ${renderSimpleDataRows(report.searchPerformance.topPages, '暂无 Page 数据。')}
      </table>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};overflow:hidden;">
  <tr>
    <td style="padding:18px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">URL 检查</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:${PALETTE.accentSoft};">
          <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Path</th>
          <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Verdict</th>
          <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Coverage</th>
          <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Noindex</th>
          <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Robots</th>
        </tr>
        ${
          report.urlInspection.status === 'ok'
            ? renderUrlInspectionRows(summary)
            : `<tr><td colspan="5" style="padding:14px 16px;color:${PALETTE.textSoft};">URL 检查获取失败：${escapeHtml(report.urlInspection.errorMessage || '未知错误')}</td></tr>`
        }
      </table>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
  <tr>
    <td style="padding:18px 18px 10px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Sitemap 状态</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 18px 18px;">${sitemapBody}</td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
  <tr>
    <td style="padding:18px 18px 10px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Core Web Vitals</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 18px 18px;">${coreWebVitalsBody}</td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
  <tr>
    <td style="padding:18px 18px 10px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Search Console 检查卡</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 18px 18px;">
      ${report.checkCards
        .map(
          (card) => `<p style="margin:0 0 12px;color:${PALETTE.textMuted};"><strong>${escapeHtml(card.title)}</strong>：${escapeHtml(card.description)}<br /><a href="${escapeHtml(card.href)}" style="color:${PALETTE.accent};text-decoration:none;">${escapeHtml(card.href)}</a></p>`
        )
        .join('')}
      ${
        report.notes.length > 0
          ? `<div style="padding:12px 14px;border-radius:12px;background:${PALETTE.accentSoft};">${report.notes
              .map(
                (note) =>
                  `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">${escapeHtml(note)}</p>`
              )
              .join('')}</div>`
          : ''
      }
    </td>
  </tr>
</table>`;
}

function renderBingMetricParagraphs(
  metrics: SiteMonitoringMetric[],
  label: string
) {
  if (metrics.length === 0) {
    return `<p style="margin:0;color:${PALETTE.textMuted};">暂无 ${escapeHtml(label)} 数据。</p>`;
  }

  return metrics
    .map(
      (metric) => `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">${escapeHtml(
        `${label}: ${formatSiteMonitoringMetric(metric)}`
      )}</p>`
    )
    .join('');
}

function renderBingSiteMonitoringSection(report: BingSiteReport) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
  <tr>
    <td style="padding:18px 18px 10px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Bing 站点体检 / Bing Site Monitoring</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 18px 18px;">
      <p style="margin:0 0 8px;color:${PALETTE.textMuted};">状态：${escapeHtml(report.status)} / ${escapeHtml(report.summaryMessage)}</p>
      <p style="margin:0 0 8px;color:${PALETTE.textMuted};">Checked URLs：${formatInteger(report.checkedUrlCount)} / Expected：${formatInteger(report.expectedSitemapUrlCount)}</p>
      <p style="margin:0;color:${PALETTE.textMuted};">Pass / Warning / Error：${formatInteger(report.counts.passCount)} / ${formatInteger(report.counts.warningCount)} / ${formatInteger(report.counts.errorCount)}</p>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};overflow:hidden;">
  <tr>
    <td style="padding:18px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Discovery Endpoints / 发现入口</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 18px 18px;">
      ${
        report.discovery.length > 0
          ? report.discovery
              .map(
                (entry) => `<p style="margin:0 0 8px;color:${PALETTE.textMuted};"><strong>${escapeHtml(entry.label)}</strong>：${escapeHtml(entry.url)} / ${escapeHtml(`${entry.statusCode ?? 'unknown'}`)}</p>`
              )
              .join('')
          : `<p style="margin:0;color:${PALETTE.textMuted};">暂无 Discovery 结果。</p>`
      }
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};overflow:hidden;">
  <tr>
    <td style="padding:18px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Top Queries / 热门查询</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 18px 18px;">
      ${
        report.api.topQueries.length > 0
          ? report.api.topQueries
              .map(
                (row) => `<p style="margin:0 0 8px;color:${PALETTE.textMuted};"><strong>${escapeHtml(row.label)}</strong>：clicks ${formatInteger(row.clicks)} / impressions ${formatInteger(row.impressions)}</p>`
              )
              .join('')
          : `<p style="margin:0;color:${PALETTE.textMuted};">暂无 Bing query 数据。</p>`
      }
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
  <tr>
    <td style="padding:18px 18px 10px;">
      <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">Core Web Vitals / 核心网页指标</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 18px 18px;">
      ${
        report.experience.message
          ? `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">${escapeHtml(report.experience.message)}</p>`
          : ''
      }
      ${renderBingMetricParagraphs(report.experience.cruxMetrics, 'CrUX')}
      ${renderBingMetricParagraphs(report.experience.psiMobileMetrics, 'PSI Mobile')}
      ${
        report.experience.psiMobileScore !== null
          ? `<p style="margin:0 0 8px;color:${PALETTE.textMuted};">PSI Mobile Score：${escapeHtml(formatPercent(report.experience.psiMobileScore))}</p>`
          : ''
      }
      ${
        report.experience.psiDesktopScore !== null
          ? `<p style="margin:0;color:${PALETTE.textMuted};">PSI Desktop Score：${escapeHtml(formatPercent(report.experience.psiDesktopScore))}</p>`
          : ''
      }
    </td>
  </tr>
</table>`;
}

export function buildAdminReportEmail({
  to,
  summary,
}: AdminReportEmailInput) {
  const frequencyLabel = getFrequencyLabel(summary.window.frequency);
  const cards = buildMetricCards(summary);
  const subject = `[${getAppName()}] 管理员汇总 | ${frequencyLabel} | ${summary.window.periodKey}`;
  const text = buildTextSummary(summary);
  const html = `
<body style="margin:0;padding:0;background:${PALETTE.pageBg};font-family:${FONT};color:${PALETTE.textStrong};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.pageBg};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;background:${PALETTE.cardBg};border:1px solid ${PALETTE.border};border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:${PALETTE.accentSoft};border-bottom:1px solid ${PALETTE.border};">
              <p style="margin:0 0 8px;font-size:13px;color:${PALETTE.textSoft};">${escapeHtml(getAppName())}</p>
              <h1 style="margin:0 0 10px;font-size:28px;line-height:1.2;color:${PALETTE.textStrong};">管理员汇总</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:${PALETTE.textMuted};">${escapeHtml(
                `${frequencyLabel} · ${summary.window.periodKey} · ${summary.window.label} · ${summary.timezone}`
              )}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${renderMetricCardRows(cards)}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
                <tr>
                  <td style="padding:18px 18px 10px;">
                    <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">转化漏斗</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 18px 18px;">
                    <p style="margin:0 0 8px;color:${PALETTE.textMuted};">注册 ${formatInteger(summary.current.signups)} → 首次成功 ${formatInteger(summary.current.firstSuccessfulUsers)} → 结账 ${formatInteger(summary.current.checkoutUsers)} → 付费 ${formatInteger(summary.current.paidUsers)}</p>
                    <p style="margin:0;color:${PALETTE.textSoft};">注册到付费转化率：${formatPercent(
                      summary.current.signups > 0
                        ? summary.current.paidUsers / summary.current.signups
                        : 0
                    )}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
                <tr>
                  <td style="padding:18px 18px 10px;">
                    <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">收入与积分</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 18px 18px;">
                    <p style="margin:0 0 8px;color:${PALETTE.textMuted};">一次性收入：${formatCurrency(summary.current.oneTimeRevenue)}</p>
                    <p style="margin:0 0 8px;color:${PALETTE.textMuted};">订阅收入：${formatCurrency(summary.current.subscriptionRevenue)}</p>
                    <p style="margin:0 0 8px;color:${PALETTE.textMuted};">净收入：${formatCurrency(summary.current.netRevenue)}</p>
                    <p style="margin:0 0 8px;color:${PALETTE.textMuted};">积分消耗：${formatInteger(summary.current.creditsConsumed)}</p>
                    <p style="margin:0 0 8px;color:${PALETTE.textMuted};">访客成本：${formatInteger(summary.current.guestCreditsConsumed)}</p>
                    <p style="margin:0 0 8px;color:${PALETTE.textMuted};">积分发放：${formatInteger(summary.current.creditsGranted)}</p>
                    <p style="margin:0;color:${PALETTE.textMuted};">积分退款：${formatInteger(summary.current.creditsRefunded)}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};overflow:hidden;">
                <tr>
                  <td style="padding:18px;">
                    <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">任务分布</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr style="background:${PALETTE.accentSoft};">
                        <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Workflow</th>
                        <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Media</th>
                        <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Created</th>
                        <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Success</th>
                        <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Failed</th>
                        <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Canceled</th>
                      </tr>
                      ${renderTaskBreakdownRows(summary.taskBreakdown)}
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};">
                <tr>
                  <td style="padding:18px 18px 10px;">
                    <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">失败原因</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 18px 18px;">
                    <ol style="margin:0;padding-left:20px;color:${PALETTE.textMuted};">
                      ${renderFailureReasons(summary.failureReasons)}
                    </ol>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${PALETTE.border};border-radius:14px;background:${PALETTE.cardBg};overflow:hidden;">
                <tr>
                  <td style="padding:18px;">
                    <h2 style="margin:0;font-size:18px;color:${PALETTE.textStrong};">最近退款</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr style="background:${PALETTE.warningSoft};">
                        <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Provider</th>
                        <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Order</th>
                        <th align="right" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Amount</th>
                        <th align="left" style="padding:12px 14px;font-size:12px;color:${PALETTE.textSoft};">Created At</th>
                      </tr>
                      ${renderRecentRefundRows(summary.recentRefunds)}
                    </table>
                  </td>
                </tr>
              </table>

              ${summary.googleSiteReport ? renderGoogleSearchSection(summary) : ''}
              ${summary.siteMonitoring?.bing ? renderBingSiteMonitoringSection(summary.siteMonitoring.bing) : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid ${PALETTE.border};background:${PALETTE.pageBg};">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${PALETTE.textSoft};">这封内部汇总邮件对应站点 ${escapeHtml(getAppDomain())}。如果报表链路异常，请联系 ${escapeHtml(getSupportEmail())}。</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`;

  return {
    to,
    subject,
    text,
    html,
    replyTo: getSupportEmail(),
    tags: ['admin-report', `${summary.window.frequency}-report`],
    headers: {
      'X-ImageEditorAi-Email': 'admin-report',
      'X-ImageEditorAi-Report-Frequency': summary.window.frequency,
      'X-ImageEditorAi-Report-Period-Key': summary.window.periodKey,
    },
  };
}
