import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getIndexNowKey } from '@/shared/lib/indexnow';

async function main() {
  const key = getIndexNowKey();
  const publicDir = path.join(process.cwd(), 'public');
  const outputPath = path.join(publicDir, `${key}.txt`);

  await mkdir(publicDir, { recursive: true });
  await writeFile(outputPath, key, 'utf8');

  console.log(`[indexnow] prepared ${outputPath}`);
}

main().catch((error) => {
  console.error('[indexnow] failed to prepare key file:', error);
  process.exit(1);
});
