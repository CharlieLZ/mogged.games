import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('common copy module boundaries', () => {
  it('keeps server-safe copy helpers separate from client hooks', () => {
    const commonCopyModule = readProjectFile('src/shared/lib/common-copy.ts');

    expect(commonCopyModule).not.toMatch(/^'use client';/);
    expect(commonCopyModule).toContain('export function getCommonCopy');
    expect(commonCopyModule).not.toMatch(/\buseState\b/);
    expect(commonCopyModule).not.toMatch(/\buseEffect\b/);

    const clientHookModule = readProjectFile(
      'src/shared/lib/use-client-common-copy.ts'
    );

    expect(clientHookModule).toMatch(/^'use client';/);
    expect(clientHookModule).toContain('export function useClientCommonCopy');
  });
});
