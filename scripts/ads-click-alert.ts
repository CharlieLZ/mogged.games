import { createHmac } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const DEFAULT_ALERT_CUSTOMER_ID = '8817947507';
export const DEFAULT_FIRST_THRESHOLD = 1;
export const DEFAULT_INTERVAL_CLICKS = 10;
export const DEFAULT_STATE_FILE = 'data/ads-click-alert/state.json';
export const DEFAULT_API_MD_PATH = '/Users/charliesimmon/clawd/API.md';
export const DEFAULT_SHARED_ENV_PATH = '/Users/project/脚本/google-ads/google-ads.env';
export const DEFAULT_WORKSPACE_DIR = process.cwd();
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_BASE_URL = 'https://googleads.googleapis.com';
const GOOGLE_ADS_API_VERSION = 'v22';

type AlertState = {
  accountDate: string;
  lastObservedClicks: number;
  lastAlertedThreshold: number;
  updatedAt?: string;
};

type SummaryMetrics = {
  clicks: number;
  impressions: number;
  costMicros: number;
  ctr: number;
  currencyCode: string;
};

type CampaignSnapshot = {
  name: string;
  clicks: number;
  impressions: number;
  costMicros: number;
};

type AdGroupSnapshot = {
  campaignName: string;
  name: string;
  clicks: number;
  impressions: number;
  costMicros: number;
};

type SearchTermSnapshot = {
  searchTerm: string;
  searchTermMatchType: string;
  device: string;
  adNetworkType: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  clicks: number;
  impressions: number;
  costMicros: number;
};

type KeywordSnapshot = {
  keywordText: string;
  keywordMatchType: string;
  device: string;
  adNetworkType: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  clicks: number;
  impressions: number;
  costMicros: number;
};

type AlertMessageInput = {
  accountName: string;
  customerId: string;
  accountDate: string;
  summary: SummaryMetrics;
  thresholds: number[];
  campaigns: CampaignSnapshot[];
  adGroups: AdGroupSnapshot[];
  searchTerms: SearchTermSnapshot[];
  keywords: KeywordSnapshot[];
};

type AlertDecisionInput = {
  accountDate: string;
  currentClicks: number;
  state?: AlertState | null;
  firstThreshold?: number;
  intervalClicks?: number;
};

type AlertDecision = {
  shouldAlert: boolean;
  triggeredThresholds: number[];
  nextState: AlertState;
};

type AdsClickAlertArgs = {
  customerId: string;
  firstThreshold: number;
  intervalClicks: number;
  stateFile: string;
  apiMdPath: string;
  sharedEnvPath: string;
  dryRun: boolean;
};

type GoogleAdsConfig = {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId: string;
  customerId: string;
};

type AccountSnapshot = {
  accountName: string;
  customerId: string;
  accountDate: string;
  timeZone: string;
  summary: SummaryMetrics;
  campaigns: CampaignSnapshot[];
  adGroups: AdGroupSnapshot[];
  searchTerms: SearchTermSnapshot[];
  keywords: KeywordSnapshot[];
};

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
}

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  return toPositiveInteger(trimString(process.env[name]), fallback);
}

function normalizeCustomerId(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function ensureDirectory(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function parseLineValue(rawValue: string) {
  const value = trimString(rawValue);

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function parsePreloadArgs(rawArgs: string[]) {
  const cleanedArgs = rawArgs.filter((arg) => arg !== '--');
  let workspaceDir = '';

  for (let index = 0; index < cleanedArgs.length; index += 1) {
    const token = cleanedArgs[index];
    if (token === '--workspace-dir' && cleanedArgs[index + 1]) {
      workspaceDir = cleanedArgs[index + 1];
      break;
    }

    if (token.startsWith('--workspace-dir=')) {
      workspaceDir = token.slice('--workspace-dir='.length);
      break;
    }
  }

  return {
    workspaceDir: resolve(
      trimString(workspaceDir) ||
        trimString(process.env.ADS_CLICKER_WORKSPACE_DIR) ||
        DEFAULT_WORKSPACE_DIR
    ),
  };
}

function isPlaceholderValue(value: unknown) {
  const normalized = trimString(value);
  if (!normalized) {
    return true;
  }

  return (
    normalized === '...' ||
    normalized.startsWith('TODO') ||
    normalized.includes('TODO') ||
    normalized.includes('YOUR_') ||
    normalized.startsWith('REPLACE_')
  );
}

function readKeyValueAssignments(
  filePath: string,
  options?: { preferFirstAssignment?: boolean }
) {
  if (!filePath || !existsSync(filePath)) {
    return {} as Record<string, string>;
  }

  const preferFirstAssignment = options?.preferFirstAssignment === true;
  const keys: Record<string, string> = {};
  const pattern = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/u;
  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = pattern.exec(line);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (preferFirstAssignment && key in keys) {
      continue;
    }

    keys[key] = parseLineValue(rawValue);
  }

  return keys;
}

function loadLocalEnvFiles(workspaceDir: string) {
  for (const envFile of [resolve(workspaceDir, '.env'), resolve(workspaceDir, '.env-ref')]) {
    const values = readKeyValueAssignments(envFile, {
      preferFirstAssignment: true,
    });

    for (const [key, value] of Object.entries(values)) {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function getConfigValue(
  envName: string,
  sharedEnv: Record<string, string>,
  apiMdEnv: Record<string, string>,
  overrideValue?: string
) {
  if (!isPlaceholderValue(overrideValue)) {
    return trimString(overrideValue);
  }

  const processValue = process.env[envName];
  if (!isPlaceholderValue(processValue)) {
    return trimString(processValue);
  }

  const sharedValue = sharedEnv[envName];
  if (!isPlaceholderValue(sharedValue)) {
    return trimString(sharedValue);
  }

  const apiMdValue = apiMdEnv[envName];
  if (!isPlaceholderValue(apiMdValue)) {
    return trimString(apiMdValue);
  }

  return '';
}

function loadGoogleAdsConfig(args: AdsClickAlertArgs): GoogleAdsConfig {
  const sharedEnv = readKeyValueAssignments(args.sharedEnvPath, {
    preferFirstAssignment: true,
  });
  const apiMdEnv = readKeyValueAssignments(args.apiMdPath);

  return {
    developerToken: getConfigValue(
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      sharedEnv,
      apiMdEnv
    ),
    clientId: getConfigValue('GOOGLE_ADS_CLIENT_ID', sharedEnv, apiMdEnv),
    clientSecret: getConfigValue(
      'GOOGLE_ADS_CLIENT_SECRET',
      sharedEnv,
      apiMdEnv
    ),
    refreshToken: getConfigValue(
      'GOOGLE_ADS_REFRESH_TOKEN',
      sharedEnv,
      apiMdEnv
    ),
    loginCustomerId: normalizeCustomerId(
      getConfigValue('GOOGLE_ADS_LOGIN_CUSTOMER_ID', sharedEnv, apiMdEnv)
    ),
    customerId: normalizeCustomerId(
      args.customerId ||
        getConfigValue('GOOGLE_ADS_CUSTOMER_ID', sharedEnv, apiMdEnv)
    ),
  };
}

function assertGoogleAdsConfig(config: GoogleAdsConfig) {
  const missing: string[] = [];

  if (!config.developerToken) missing.push('GOOGLE_ADS_DEVELOPER_TOKEN');
  if (!config.clientId) missing.push('GOOGLE_ADS_CLIENT_ID');
  if (!config.clientSecret) missing.push('GOOGLE_ADS_CLIENT_SECRET');
  if (!config.refreshToken) missing.push('GOOGLE_ADS_REFRESH_TOKEN');
  if (!config.loginCustomerId) missing.push('GOOGLE_ADS_LOGIN_CUSTOMER_ID');
  if (!config.customerId) missing.push('GOOGLE_ADS_CUSTOMER_ID');

  if (missing.length > 0) {
    throw new Error(`Missing Google Ads config: ${missing.join(', ')}`);
  }
}

function parseJsonIfPossible(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text().then((text) => ({ text }));
}

async function refreshGoogleAdsAccessToken(config: GoogleAdsConfig) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const payload = await parseJsonIfPossible(response);

  if (!response.ok || !trimString((payload as { access_token?: string }).access_token)) {
    throw new Error(
      `Failed to refresh Google Ads access token: ${response.status}`
    );
  }

  return trimString((payload as { access_token?: string }).access_token);
}

async function searchGoogleAds(
  config: GoogleAdsConfig,
  accessToken: string,
  query: string,
  pageToken?: string
) {
  const response = await fetch(
    `${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_API_VERSION}/customers/${config.customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'developer-token': config.developerToken,
        'login-customer-id': config.loginCustomerId,
      },
      body: JSON.stringify({
        query,
        ...(pageToken ? { pageToken } : {}),
      }),
    }
  );
  const payload = (await parseJsonIfPossible(response)) as {
    results?: Record<string, unknown>[];
    nextPageToken?: string;
    error?: { message?: string };
    text?: string;
  };

  if (!response.ok) {
    const message =
      payload.error?.message || payload.text || `status ${response.status}`;
    throw new Error(`Google Ads search failed: ${message}`);
  }

  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    nextPageToken: trimString(payload.nextPageToken),
  };
}

async function searchAllGoogleAdsRows(
  config: GoogleAdsConfig,
  accessToken: string,
  query: string
) {
  const rows: Record<string, unknown>[] = [];
  let pageToken = '';

  do {
    const response = await searchGoogleAds(config, accessToken, query, pageToken);
    rows.push(...response.results);
    pageToken = response.nextPageToken;
  } while (pageToken);

  return rows;
}

function formatDateForTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

function formatInteger(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

function formatCost(costMicros: number, currencyCode: string) {
  return `${currencyCode} ${(costMicros / 1_000_000).toFixed(2)}`;
}

function formatCtr(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function normalizeState(rawState: unknown): AlertState | null {
  if (!rawState || typeof rawState !== 'object') {
    return null;
  }

  const candidate = rawState as Partial<AlertState>;
  const accountDate = trimString(candidate.accountDate);
  if (!accountDate) {
    return null;
  }

  return {
    accountDate,
    lastObservedClicks: Math.max(0, Math.floor(toNumber(candidate.lastObservedClicks))),
    lastAlertedThreshold: Math.max(
      0,
      Math.floor(toNumber(candidate.lastAlertedThreshold))
    ),
    updatedAt: trimString(candidate.updatedAt) || undefined,
  };
}

function readAlertState(filePath: string) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    return normalizeState(raw);
  } catch (error) {
    console.warn('[ads-click-alert] failed to read state file', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function writeAlertState(filePath: string, state: AlertState) {
  ensureDirectory(filePath);
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function evaluateClickAlert(input: AlertDecisionInput): AlertDecision {
  const firstThreshold = Math.max(
    1,
    Math.floor(input.firstThreshold ?? DEFAULT_FIRST_THRESHOLD)
  );
  const intervalClicks = Math.max(
    1,
    Math.floor(input.intervalClicks ?? DEFAULT_INTERVAL_CLICKS)
  );
  const currentClicks = Math.max(0, Math.floor(input.currentClicks));

  const previousState =
    input.state && input.state.accountDate === input.accountDate
      ? input.state
      : {
          accountDate: input.accountDate,
          lastObservedClicks: 0,
          lastAlertedThreshold: 0,
        };

  const triggeredThresholds: number[] = [];

  if (
    previousState.lastAlertedThreshold < firstThreshold &&
    currentClicks >= firstThreshold
  ) {
    triggeredThresholds.push(firstThreshold);
  }

  for (let threshold = intervalClicks; threshold <= currentClicks; threshold += intervalClicks) {
    if (threshold === firstThreshold && triggeredThresholds.includes(firstThreshold)) {
      continue;
    }

    if (threshold > previousState.lastAlertedThreshold) {
      triggeredThresholds.push(threshold);
    }
  }

  const highestThreshold =
    triggeredThresholds.length > 0
      ? Math.max(...triggeredThresholds)
      : previousState.lastAlertedThreshold;

  return {
    shouldAlert: triggeredThresholds.length > 0,
    triggeredThresholds,
    nextState: {
      accountDate: input.accountDate,
      lastObservedClicks: currentClicks,
      lastAlertedThreshold: highestThreshold,
      updatedAt: new Date().toISOString(),
    },
  };
}

function formatCampaignRows(rows: CampaignSnapshot[], currencyCode: string) {
  if (rows.length === 0) {
    return ['top_campaigns:', '- no active campaigns today'];
  }

  return [
    'top_campaigns:',
    ...rows.map(
      (row, index) =>
        `${index + 1}. ${row.name} | clicks ${formatInteger(row.clicks)} | impr ${formatInteger(row.impressions)} | cost ${formatCost(row.costMicros, currencyCode)}`
    ),
  ];
}

function formatAdGroupRows(rows: AdGroupSnapshot[], currencyCode: string) {
  if (rows.length === 0) {
    return ['top_ad_groups:', '- no active ad groups today'];
  }

  return [
    'top_ad_groups:',
    ...rows.map(
      (row, index) =>
        `${index + 1}. ${row.campaignName} / ${row.name} | clicks ${formatInteger(row.clicks)} | impr ${formatInteger(row.impressions)} | cost ${formatCost(row.costMicros, currencyCode)}`
    ),
  ];
}

function formatSearchTermRows(
  rows: SearchTermSnapshot[],
  currencyCode: string
) {
  if (rows.length === 0) {
    return ['clicked_search_terms:', '- no clicked search terms today'];
  }

  return [
    'clicked_search_terms:',
    ...rows.map(
      (row, index) =>
        `${index + 1}. term "${row.searchTerm}" | term_match ${row.searchTermMatchType} | device ${row.device} | network ${row.adNetworkType} | campaign ${row.campaignName} (#${row.campaignId}) | ad_group ${row.adGroupName} (#${row.adGroupId}) | clicks ${formatInteger(row.clicks)} | impr ${formatInteger(row.impressions)} | cost ${formatCost(row.costMicros, currencyCode)}`
    ),
  ];
}

function formatKeywordRows(rows: KeywordSnapshot[], currencyCode: string) {
  if (rows.length === 0) {
    return ['clicked_keywords:', '- no clicked keywords today'];
  }

  return [
    'clicked_keywords:',
    ...rows.map(
      (row, index) =>
        `${index + 1}. keyword "${row.keywordText}" | keyword_match ${row.keywordMatchType} | device ${row.device} | network ${row.adNetworkType} | campaign ${row.campaignName} (#${row.campaignId}) | ad_group ${row.adGroupName} (#${row.adGroupId}) | clicks ${formatInteger(row.clicks)} | impr ${formatInteger(row.impressions)} | cost ${formatCost(row.costMicros, currencyCode)}`
    ),
  ];
}

export function buildAlertMessage(input: AlertMessageInput) {
  return [
    '[ads-click-alert]',
    `account: ${input.accountName} (${input.customerId})`,
    `date: ${input.accountDate}`,
    `thresholds: ${input.thresholds.join(', ')}`,
    `clicks: ${formatInteger(input.summary.clicks)}`,
    `impressions: ${formatInteger(input.summary.impressions)}`,
    `cost: ${formatCost(input.summary.costMicros, input.summary.currencyCode)}`,
    `ctr: ${formatCtr(input.summary.ctr)}`,
    ...formatSearchTermRows(input.searchTerms, input.summary.currencyCode),
    ...formatKeywordRows(input.keywords, input.summary.currencyCode),
    ...formatCampaignRows(input.campaigns, input.summary.currencyCode),
    ...formatAdGroupRows(input.adGroups, input.summary.currencyCode),
  ].join('\n');
}

async function generateFeishuSign(timestamp: string, secret: string) {
  return createHmac('sha256', `${timestamp}\n${secret}`).update('').digest('base64');
}

async function sendFeishuTextMessage(input: { webhookUrl: string; secret: string; text: string }) {
  if (!trimString(input.webhookUrl)) {
    throw new Error('Missing ADS_CLICKER_FEISHU_WEBHOOK_URL');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = {
    msg_type: 'text',
    content: {
      text: input.text,
    },
    ...(trimString(input.secret)
      ? {
          timestamp,
          sign: await generateFeishuSign(timestamp, input.secret),
        }
      : {}),
  };

  const response = await fetch(input.webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  const payload = (await parseJsonIfPossible(response)) as {
    code?: number;
    msg?: string;
  };

  if (!response.ok || payload.code !== 0) {
    throw new Error(
      `Feishu send failed: ${response.status} ${payload.msg ?? 'unknown_error'}`
    );
  }
}

async function collectAdsSnapshot(args: AdsClickAlertArgs) {
  const config = loadGoogleAdsConfig(args);
  assertGoogleAdsConfig(config);

  const accessToken = await refreshGoogleAdsAccessToken(config);
  const [accountRow] = await searchAllGoogleAdsRows(
    config,
    accessToken,
    `
SELECT
  customer.id,
  customer.descriptive_name,
  customer.currency_code,
  customer.time_zone
FROM customer
LIMIT 1
`.trim()
  );

  const customer = (accountRow?.customer ?? {}) as Record<string, unknown>;
  const accountName = trimString(customer.descriptiveName) || 'mogged';
  const timeZone = trimString(customer.timeZone) || 'UTC';
  const currencyCode = trimString(customer.currencyCode) || 'USD';
  const accountDate = formatDateForTimeZone(timeZone);

  const [summaryRow] = await searchAllGoogleAdsRows(
    config,
    accessToken,
    `
SELECT
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.cost_micros
FROM customer
WHERE segments.date DURING TODAY
`.trim()
  );

  const summaryMetrics = (summaryRow?.metrics ?? {}) as Record<string, unknown>;
  const campaigns = await searchAllGoogleAdsRows(
    config,
    accessToken,
    `
SELECT
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM campaign
WHERE campaign.status != 'REMOVED'
  AND metrics.impressions > 0
  AND segments.date DURING TODAY
ORDER BY metrics.clicks DESC, metrics.impressions DESC
LIMIT 5
`.trim()
  );
  const adGroups = await searchAllGoogleAdsRows(
    config,
    accessToken,
    `
SELECT
  campaign.name,
  ad_group.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM ad_group
WHERE ad_group.status != 'REMOVED'
  AND metrics.impressions > 0
  AND segments.date DURING TODAY
ORDER BY metrics.clicks DESC, metrics.impressions DESC
LIMIT 5
`.trim()
  );
  const searchTerms = await searchAllGoogleAdsRows(
    config,
    accessToken,
    `
SELECT
  campaign.id,
  campaign.name,
  ad_group.id,
  ad_group.name,
  search_term_view.search_term,
  segments.search_term_match_type,
  segments.device,
  segments.ad_network_type,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM search_term_view
WHERE campaign.status != 'REMOVED'
  AND ad_group.status != 'REMOVED'
  AND metrics.clicks > 0
  AND segments.date DURING TODAY
ORDER BY metrics.clicks DESC, metrics.impressions DESC
LIMIT 10
`.trim()
  );
  const keywords = await searchAllGoogleAdsRows(
    config,
    accessToken,
    `
SELECT
  campaign.id,
  campaign.name,
  ad_group.id,
  ad_group.name,
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  segments.device,
  segments.ad_network_type,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM keyword_view
WHERE campaign.status != 'REMOVED'
  AND ad_group.status != 'REMOVED'
  AND ad_group_criterion.status != 'REMOVED'
  AND metrics.clicks > 0
  AND segments.date DURING TODAY
ORDER BY metrics.clicks DESC, metrics.impressions DESC
LIMIT 10
`.trim()
  );

  return {
    accountName,
    customerId: config.customerId,
    accountDate,
    timeZone,
    summary: {
      clicks: Math.floor(toNumber(summaryMetrics.clicks)),
      impressions: Math.floor(toNumber(summaryMetrics.impressions)),
      costMicros: Math.floor(toNumber(summaryMetrics.costMicros)),
      ctr: toNumber(summaryMetrics.ctr),
      currencyCode,
    },
    campaigns: campaigns.map((row) => ({
      name: trimString((row.campaign as Record<string, unknown> | undefined)?.name) || 'Unnamed campaign',
      clicks: Math.floor(toNumber((row.metrics as Record<string, unknown> | undefined)?.clicks)),
      impressions: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.impressions)
      ),
      costMicros: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.costMicros)
      ),
    })),
    adGroups: adGroups.map((row) => ({
      campaignName:
        trimString((row.campaign as Record<string, unknown> | undefined)?.name) ||
        'Unnamed campaign',
      name:
        trimString((row.adGroup as Record<string, unknown> | undefined)?.name) ||
        'Unnamed ad group',
      clicks: Math.floor(toNumber((row.metrics as Record<string, unknown> | undefined)?.clicks)),
      impressions: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.impressions)
      ),
      costMicros: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.costMicros)
      ),
    })),
    searchTerms: searchTerms.map((row) => ({
      searchTerm:
        trimString(
          (row.searchTermView as Record<string, unknown> | undefined)?.searchTerm
        ) || '-',
      searchTermMatchType:
        trimString(
          (row.segments as Record<string, unknown> | undefined)
            ?.searchTermMatchType
        ) || '-',
      device:
        trimString((row.segments as Record<string, unknown> | undefined)?.device) ||
        '-',
      adNetworkType:
        trimString(
          (row.segments as Record<string, unknown> | undefined)?.adNetworkType
        ) || '-',
      campaignId:
        trimString((row.campaign as Record<string, unknown> | undefined)?.id) || '-',
      campaignName:
        trimString((row.campaign as Record<string, unknown> | undefined)?.name) ||
        'Unnamed campaign',
      adGroupId:
        trimString((row.adGroup as Record<string, unknown> | undefined)?.id) || '-',
      adGroupName:
        trimString((row.adGroup as Record<string, unknown> | undefined)?.name) ||
        'Unnamed ad group',
      clicks: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.clicks)
      ),
      impressions: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.impressions)
      ),
      costMicros: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.costMicros)
      ),
    })),
    keywords: keywords.map((row) => ({
      keywordText:
        trimString(
          (
            (row.adGroupCriterion as Record<string, unknown> | undefined)
              ?.keyword as Record<string, unknown> | undefined
          )?.text
        ) || '-',
      keywordMatchType:
        trimString(
          (
            (row.adGroupCriterion as Record<string, unknown> | undefined)
              ?.keyword as Record<string, unknown> | undefined
          )?.matchType
        ) || '-',
      device:
        trimString((row.segments as Record<string, unknown> | undefined)?.device) ||
        '-',
      adNetworkType:
        trimString(
          (row.segments as Record<string, unknown> | undefined)?.adNetworkType
        ) || '-',
      campaignId:
        trimString((row.campaign as Record<string, unknown> | undefined)?.id) || '-',
      campaignName:
        trimString((row.campaign as Record<string, unknown> | undefined)?.name) ||
        'Unnamed campaign',
      adGroupId:
        trimString((row.adGroup as Record<string, unknown> | undefined)?.id) || '-',
      adGroupName:
        trimString((row.adGroup as Record<string, unknown> | undefined)?.name) ||
        'Unnamed ad group',
      clicks: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.clicks)
      ),
      impressions: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.impressions)
      ),
      costMicros: Math.floor(
        toNumber((row.metrics as Record<string, unknown> | undefined)?.costMicros)
      ),
    })),
  } satisfies AccountSnapshot;
}

export function parseAdsClickAlertArgs(rawArgs: string[]): AdsClickAlertArgs {
  const { values } = parseArgs({
    args: rawArgs.filter((arg) => arg !== '--'),
    options: {
      customer: { type: 'string' },
      'workspace-dir': { type: 'string' },
      'first-threshold': { type: 'string' },
      'interval-clicks': { type: 'string' },
      'state-file': { type: 'string' },
      'api-md-path': { type: 'string' },
      'shared-env-path': { type: 'string' },
      'dry-run': { type: 'boolean' },
    },
    allowPositionals: false,
  });

  return {
    customerId: normalizeCustomerId(values.customer) || DEFAULT_ALERT_CUSTOMER_ID,
    firstThreshold: toPositiveInteger(
      values['first-threshold'],
      readPositiveIntegerEnv(
        'ADS_CLICKER_FIRST_THRESHOLD',
        DEFAULT_FIRST_THRESHOLD
      )
    ),
    intervalClicks: toPositiveInteger(
      values['interval-clicks'],
      readPositiveIntegerEnv(
        'ADS_CLICKER_INTERVAL_CLICKS',
        DEFAULT_INTERVAL_CLICKS
      )
    ),
    stateFile:
      trimString(values['state-file']) ||
      trimString(process.env.ADS_CLICKER_STATE_FILE) ||
      DEFAULT_STATE_FILE,
    apiMdPath: trimString(values['api-md-path']) || DEFAULT_API_MD_PATH,
    sharedEnvPath:
      trimString(values['shared-env-path']) || DEFAULT_SHARED_ENV_PATH,
    dryRun: values['dry-run'] ?? false,
  };
}

export async function runAdsClickAlert(rawArgs: string[]) {
  const preloadArgs = parsePreloadArgs(rawArgs);
  loadLocalEnvFiles(preloadArgs.workspaceDir);

  const args = parseAdsClickAlertArgs(rawArgs);
  const snapshot = await collectAdsSnapshot(args);
  const previousState = readAlertState(args.stateFile);
  const decision = evaluateClickAlert({
    accountDate: snapshot.accountDate,
    currentClicks: snapshot.summary.clicks,
    state: previousState,
    firstThreshold: args.firstThreshold,
    intervalClicks: args.intervalClicks,
  });

  console.log('[ads-click-alert] snapshot', {
    customerId: snapshot.customerId,
    accountDate: snapshot.accountDate,
    clicks: snapshot.summary.clicks,
    impressions: snapshot.summary.impressions,
    costMicros: snapshot.summary.costMicros,
    thresholds: decision.triggeredThresholds,
    shouldAlert: decision.shouldAlert,
  });

  if (decision.shouldAlert) {
    const message = buildAlertMessage({
      accountName: snapshot.accountName,
      customerId: snapshot.customerId,
      accountDate: snapshot.accountDate,
      summary: snapshot.summary,
      thresholds: decision.triggeredThresholds,
      campaigns: snapshot.campaigns,
      adGroups: snapshot.adGroups,
      searchTerms: snapshot.searchTerms,
      keywords: snapshot.keywords,
    });

    if (args.dryRun) {
      console.log(message);
      return {
        alerted: false,
        dryRun: true,
        snapshot,
        decision,
      };
    }

    await sendFeishuTextMessage({
      webhookUrl: process.env.ADS_CLICKER_FEISHU_WEBHOOK_URL ?? '',
      secret: process.env.ADS_CLICKER_FEISHU_TOKEN ?? '',
      text: message,
    });
    writeAlertState(args.stateFile, decision.nextState);

    return {
      alerted: true,
      dryRun: false,
      snapshot,
      decision,
    };
  }

  if (!args.dryRun) {
    writeAlertState(args.stateFile, decision.nextState);
  }

  return {
    alerted: false,
    dryRun: args.dryRun,
    snapshot,
    decision,
  };
}

if (isMainModule()) {
  runAdsClickAlert(process.argv.slice(2)).catch((error) => {
    console.error('[ads-click-alert] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  });
}
