import { submitIndexNowUrls } from '@/shared/lib/indexnow';
import { getSiteSitemap } from '@/shared/lib/site-discovery';

function printHelp() {
  console.log(`
Usage:
  pnpm indexnow:all
  npx tsx scripts/indexnow-submit.ts --all
  npx tsx scripts/indexnow-submit.ts --url=https://mogged.games/pricing
  npx tsx scripts/indexnow-submit.ts --url=https://mogged.games/pricing --url=https://mogged.games/mission
`);
}

function getFlagValues(argv: string[], flag: string) {
  return argv
    .filter((arg) => arg.startsWith(`${flag}=`))
    .map((arg) => arg.slice(flag.length + 1))
    .filter(Boolean);
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  const submitAll = argv.includes('--all');
  const explicitUrls = getFlagValues(argv, '--url');

  if (!submitAll && explicitUrls.length === 0) {
    throw new Error('Provide --all or at least one --url=... argument.');
  }

  const urls = submitAll
    ? getSiteSitemap().map((entry) => entry.url)
    : explicitUrls;

  const result = await submitIndexNowUrls(urls);

  console.log(`[indexnow] host: ${result.host}`);
  console.log(`[indexnow] submitted urls: ${result.submittedUrls.length}`);

  result.batches.forEach((batch, index) => {
    console.log(
      `[indexnow] batch ${index + 1}: status=${batch.status} urls=${batch.submittedCount}`
    );

    if (batch.body) {
      console.log(`[indexnow] batch ${index + 1} response: ${batch.body}`);
    }
  });
}

main().catch((error) => {
  console.error('[indexnow] submission failed:', error);
  process.exit(1);
});
