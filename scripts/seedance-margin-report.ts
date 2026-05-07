import { pathToFileURL } from 'node:url';

import {
  OFFICIAL_REPLICATE_RATE_SOURCES,
  type SeedanceProfitabilityArgs as SeedanceMarginArgs,
  type SeedanceProfitabilityRow as SeedanceMarginRow,
  buildSeedanceProfitabilityRows,
  parseSeedanceProfitabilityArgs,
  runSeedanceProfitabilityReport,
} from './seedance-profitability-report';

export { OFFICIAL_REPLICATE_RATE_SOURCES };
export type { SeedanceMarginArgs, SeedanceMarginRow };

export function parseSeedanceMarginArgs(args: string[]) {
  return parseSeedanceProfitabilityArgs(args);
}

export function buildSeedanceMarginRows(input: SeedanceMarginArgs) {
  return buildSeedanceProfitabilityRows(input);
}

export async function runSeedanceMarginReport(args: string[]) {
  return runSeedanceProfitabilityReport(args);
}

function printUsage() {
  console.log(
    `
Usage:
  pnpm seedance:margin -- [options]

Deprecated path:
  NODE_OPTIONS=--conditions=react-server npx tsx scripts/seedance-margin-report.ts -- [options]

Prefer:
  NODE_OPTIONS=--conditions=react-server npx tsx scripts/seedance-profitability-report.ts -- [options]
`.trim()
  );
}

async function main() {
  try {
    await runSeedanceMarginReport(process.argv.slice(2));
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
