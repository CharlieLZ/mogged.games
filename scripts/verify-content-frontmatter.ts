import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { findUnsafeSingleQuotedFrontmatterValues } from '../src/shared/lib/content-frontmatter-quote-safety';

const CONTENT_PAGES_DIR = path.join(process.cwd(), 'content/pages');

function main() {
  const files = readdirSync(CONTENT_PAGES_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .sort();
  const issues: string[] = [];

  for (const file of files) {
    const filePath = path.join(CONTENT_PAGES_DIR, file);
    const source = readFileSync(filePath, 'utf8');
    const fileIssues = findUnsafeSingleQuotedFrontmatterValues(source);

    for (const issue of fileIssues) {
      issues.push(
        `${file}:${issue.line} ${issue.key} uses YAML single quotes with an unescaped apostrophe; switch to double quotes or escape it as ''.`
      );
    }
  }

  if (issues.length === 0) {
    console.log('[content-frontmatter] quote safety passed');
    return;
  }

  console.error('[content-frontmatter] quote safety failed');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }

  process.exitCode = 1;
}

main();
