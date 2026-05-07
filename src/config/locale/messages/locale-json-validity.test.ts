import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function collectJsonFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(entryPath);
    }
  }

  return files;
}

describe('locale message json validity', () => {
  it('keeps every locale message file parseable as strict json', () => {
    const messagesRoot = path.join(
      process.cwd(),
      'src/config/locale/messages'
    );
    const jsonFiles = collectJsonFiles(messagesRoot);

    expect(jsonFiles.length).toBeGreaterThan(0);

    for (const filePath of jsonFiles) {
      const relativePath = path.relative(process.cwd(), filePath);
      const content = fs.readFileSync(filePath, 'utf8');

      expect(() => JSON.parse(content), relativePath).not.toThrow();
    }
  });
});
