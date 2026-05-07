import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin AI tasks page rendering mode', () => {
  it('keeps the database-backed admin task list out of static generation', () => {
    const source = readFileSync(new URL('./page.tsx', import.meta.url), {
      encoding: 'utf8',
    });

    expect(source).toContain("export const dynamic = 'force-dynamic'");
  });
});
