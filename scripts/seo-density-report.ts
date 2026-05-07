import { JSDOM } from 'jsdom';

const DEFAULT_BASE_URL = 'https://mogged.games';
const DEFAULT_PATHS = [
  '/',
  '/pricing',
  '/ai-image-generator',
  '/ai-video-generator',
  '/ai-video-generator/text-to-video',
  '/ai-video-generator/image-to-video',
  '/ai-video-generator/reference-to-video',
  '/mission',
] as const;

const TRACKED_TERMS = [
  'image',
  'image editor',
  'image editor ai',
  'ai image generator',
  'ai image editor',
  'photo',
  'picture',
  'edit',
  'online',
  'free',
  'no sign up',
] as const;

type ReportRow = {
  gram: string;
  count: number;
  density: number;
};

function extractDocumentText(document: Document) {
  const chunks: string[] = [];
  const walker = document.createTreeWalker(document.body, 4);
  let node = walker.nextNode();

  while (node) {
    const value = node.textContent?.trim();

    if (value) {
      chunks.push(value);
    }

    node = walker.nextNode();
  }

  return chunks.join(' ');
}

function getCliArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/\b([a-z])\s+-\s+([a-z])\b/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTopNgrams(words: string[], size: number, limit = 5) {
  const counts = new Map<string, number>();

  for (let index = 0; index <= words.length - size; index += 1) {
    const gram = words
      .slice(index, index + size)
      .join(' ')
      .trim();

    if (!gram) {
      continue;
    }

    counts.set(gram, (counts.get(gram) || 0) + 1);
  }

  const total = Math.max(words.length - size + 1, 1);

  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, limit)
    .map(([gram, count]) => ({
      gram,
      count,
      density: Number(((count / total) * 100).toFixed(2)),
    })) satisfies ReportRow[];
}

function countTrackedTerm(words: string[], term: string) {
  const parts = term.split(' ');
  const size = parts.length;
  let count = 0;

  for (let index = 0; index <= words.length - size; index += 1) {
    const gram = words.slice(index, index + size).join(' ');

    if (gram === term) {
      count += 1;
    }
  }

  const total = Math.max(words.length - size + 1, 1);

  return {
    term,
    count,
    density: Number(((count / total) * 100).toFixed(2)),
  };
}

async function fetchPageText(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) {
    throw new Error(`request failed for ${url}: ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html);
  const { document } = dom.window;

  document
    .querySelectorAll('script, style, svg, path, noscript')
    .forEach((node: Element) => node.remove());

  return normalizeText(extractDocumentText(document));
}

function printRows(title: string, rows: readonly ReportRow[]) {
  console.log(title);
  rows.forEach((row) => {
    console.log(`  ${row.gram} | count=${row.count} | density=${row.density}%`);
  });
}

async function main() {
  const baseUrl = getCliArg('--base-url') || DEFAULT_BASE_URL;
  const rawPaths = getCliArg('--paths');
  const paths = rawPaths
    ? rawPaths
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [...DEFAULT_PATHS];

  for (const path of paths) {
    const url = new URL(path, baseUrl).toString();
    const text = await fetchPageText(url);
    const words = text.split(' ').filter(Boolean);

    console.log(`\n=== ${path} ===`);
    console.log(`URL: ${url}`);
    console.log(`Total words: ${words.length}`);
    printRows('Top 5 1-word:', buildTopNgrams(words, 1));
    printRows('Top 5 2-word:', buildTopNgrams(words, 2));
    printRows('Top 5 3-word:', buildTopNgrams(words, 3));
    console.log('Tracked terms:');

    TRACKED_TERMS.map((term) => countTrackedTerm(words, term)).forEach(
      ({ term, count, density }) => {
        console.log(`  ${term} | count=${count} | density=${density}%`);
      }
    );
  }
}

main().catch((error) => {
  console.error('[seo-density-report] failed', error);
  process.exit(1);
});
