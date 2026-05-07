import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
  getAIGenerationCostCredits,
  type AIGenerationScene,
} from '@/config/ai-model-registry';
import {
  getPricingCatalogItem,
  PRICING_CATALOG,
} from '@/config/website/pricing-catalog';
import { type SeedanceResolution } from '@/extensions/ai/seedance/types';

export const OFFICIAL_REPLICATE_RATE_SOURCES = {
  fast: 'https://replicate.com/bytedance/seedance-2.0-fast',
  standard: 'https://replicate.com/bytedance/seedance-2.0',
} as const;

const OFFICIAL_REPLICATE_COST_PER_SECOND = {
  fast: {
    '480p': {
      withoutVideoInput: 0.06,
      withVideoInput: 0.11,
    },
    '720p': {
      withoutVideoInput: 0.13,
      withVideoInput: 0.22,
    },
  },
  standard: {
    '480p': {
      withoutVideoInput: 0.07,
      withVideoInput: 0.13,
    },
    '720p': {
      withoutVideoInput: 0.17,
      withVideoInput: 0.29,
    },
  },
} as const;

export type SeedanceProfitabilityArgs = {
  scene: AIGenerationScene;
  duration: number;
  resolution: SeedanceResolution;
  fast: boolean;
  hasVideoInput: boolean;
  webSearch?: boolean;
  planIds: string[];
  officialCostPerSecond?: number;
};

export type SeedanceProfitabilityRow = {
  productId: string;
  credits: number;
  revenueUsd: number;
  officialCostUsd: number;
  grossProfitUsd: number;
  grossMarginPct: number;
  saleUsdPer100Credits: number;
};

function printUsage() {
  console.log(
    `
Usage:
  pnpm seedance:margin -- [options]

Options:
  --scene=<text-to-video|image-to-video|reference-to-video>
  --duration=<seconds>
  --resolution=<480p|720p>
  --fast
  --standard
  --has-video-input
  --web-search
  --plan=<all|product-id>      Repeatable or comma-separated
  --official-cost-per-second=<usd>
  --help
`.trim()
  );
}

function normalizeScene(value: string | undefined): AIGenerationScene {
  if (
    value === 'text-to-video' ||
    value === 'image-to-video' ||
    value === 'reference-to-video'
  ) {
    return value;
  }

  return 'text-to-video';
}

function normalizeResolution(value: string | undefined): SeedanceResolution {
  return value === '480p' ? '480p' : '720p';
}

function parseInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }

  return Math.floor(parsed);
}

function parseNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }

  return parsed;
}

function normalizePlanIds(values: string[] | undefined) {
  const requested = Array.from(
    new Set(
      (values || [])
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

  if (requested.length === 0 || requested.includes('all')) {
    return PRICING_CATALOG.map((item) => item.productId);
  }

  const catalogIds = new Set(PRICING_CATALOG.map((item) => item.productId));
  const invalid = requested.filter((item) => !catalogIds.has(item));
  if (invalid.length > 0) {
    throw new Error(`Unknown plan id(s): ${invalid.join(', ')}`);
  }

  return requested;
}

function resolveOfficialCostPerSecond(input: {
  fast: boolean;
  resolution: SeedanceResolution;
  hasVideoInput: boolean;
  officialCostPerSecond?: number;
}) {
  if (input.officialCostPerSecond !== undefined) {
    return input.officialCostPerSecond;
  }

  const speed = input.fast ? 'fast' : 'standard';
  const inputMode = input.hasVideoInput ? 'withVideoInput' : 'withoutVideoInput';

  return OFFICIAL_REPLICATE_COST_PER_SECOND[speed][input.resolution][inputMode];
}

function roundMetric(value: number) {
  return Number(value.toFixed(6));
}

export function parseSeedanceProfitabilityArgs(
  args: string[]
): SeedanceProfitabilityArgs {
  const rawArgs = args.filter((arg) => arg !== '--');
  const { values } = parseArgs({
    args: rawArgs,
    options: {
      help: { type: 'boolean' },
      scene: { type: 'string' },
      duration: { type: 'string' },
      resolution: { type: 'string' },
      fast: { type: 'boolean' },
      standard: { type: 'boolean' },
      'has-video-input': { type: 'boolean' },
      'web-search': { type: 'boolean' },
      plan: { type: 'string', multiple: true },
      'official-cost-per-second': { type: 'string' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    throw new Error('HELP_REQUESTED');
  }

  return {
    scene: normalizeScene(values.scene),
    duration: parseInteger(values.duration, 15),
    resolution: normalizeResolution(values.resolution),
    fast: values.standard ? false : values.fast ?? true,
    hasVideoInput: values['has-video-input'] ?? false,
    webSearch: values['web-search'] ?? false,
    planIds: normalizePlanIds(values.plan),
    officialCostPerSecond: parseNumber(values['official-cost-per-second']),
  };
}

export function buildSeedanceProfitabilityRows(
  input: SeedanceProfitabilityArgs
): SeedanceProfitabilityRow[] {
  const officialCostPerSecond = resolveOfficialCostPerSecond(input);

  return input.planIds.map((planId) => {
    const item = getPricingCatalogItem(planId);
    if (!item) {
      throw new Error(`Unknown pricing catalog product: ${planId}`);
    }

    const credits = getAIGenerationCostCredits(input.scene, {
      durationSeconds: input.duration,
      resolution: input.resolution,
      fast: input.fast,
      webSearch: input.webSearch ?? false,
      hasVideoInput: input.hasVideoInput,
    });
    const revenueUsd = (item.amount / 100 / item.credits) * credits;
    const officialCostUsd = input.duration * officialCostPerSecond;
    const grossProfitUsd = revenueUsd - officialCostUsd;
    const grossMarginPct =
      revenueUsd === 0 ? 0 : (grossProfitUsd / revenueUsd) * 100;
    const saleUsdPer100Credits = (item.amount / 100 / item.credits) * 100;

    return {
      productId: item.productId,
      credits,
      revenueUsd: roundMetric(revenueUsd),
      officialCostUsd: roundMetric(officialCostUsd),
      grossProfitUsd: roundMetric(grossProfitUsd),
      grossMarginPct: roundMetric(grossMarginPct),
      saleUsdPer100Credits: roundMetric(saleUsdPer100Credits),
    };
  });
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

function pad(value: string, width: number) {
  return value.padEnd(width, ' ');
}

function printRows(rows: SeedanceProfitabilityRow[]) {
  const header = [
    pad('plan', 16),
    pad('credits', 8),
    pad('revenue', 10),
    pad('cost', 10),
    pad('profit', 10),
    pad('margin', 8),
    pad('sell/100cr', 11),
  ].join(' ');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const row of rows) {
    console.log(
      [
        pad(row.productId, 16),
        pad(String(row.credits), 8),
        pad(formatUsd(row.revenueUsd), 10),
        pad(formatUsd(row.officialCostUsd), 10),
        pad(formatUsd(row.grossProfitUsd), 10),
        pad(formatPct(row.grossMarginPct), 8),
        pad(formatUsd(row.saleUsdPer100Credits), 11),
      ].join(' ')
    );
  }
}

export async function runSeedanceProfitabilityReport(args: string[]) {
  const options = parseSeedanceProfitabilityArgs(args);
  const officialCostPerSecond = resolveOfficialCostPerSecond(options);
  const benchmarkUrl = options.fast
    ? OFFICIAL_REPLICATE_RATE_SOURCES.fast
    : OFFICIAL_REPLICATE_RATE_SOURCES.standard;
  const rows = buildSeedanceProfitabilityRows(options);

  console.log(
    JSON.stringify(
      {
        source: 'replicate-bytedance-official-model-pages',
        benchmarkUrl,
        scene: options.scene,
        duration: options.duration,
        resolution: options.resolution,
        fast: options.fast,
        hasVideoInput: options.hasVideoInput,
        webSearch: options.webSearch ?? false,
        officialCostPerSecond,
      },
      null,
      2
    )
  );
  printRows(rows);
}

async function main() {
  try {
    await runSeedanceProfitabilityReport(process.argv.slice(2));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'HELP_REQUESTED') {
      printUsage();
      process.exit(0);
    }

    console.error(message);
    printUsage();
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
