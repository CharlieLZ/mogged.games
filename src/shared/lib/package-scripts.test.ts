import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('package scripts', () => {
  it('generates docs source before typecheck for worktree-safe hooks', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.scripts?.pretypecheck).toBe(
      'node scripts/run-local-binary.mjs fumadocs-mdx'
    );
    expect(packageJson.scripts?.typecheck).toBe(
      'node scripts/run-local-binary.mjs tsc --noEmit --incremental false'
    );
    expect(packageJson.scripts?.['gate:pre-commit']).toBe('pnpm typecheck');
  });
});
