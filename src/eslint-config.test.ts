import { describe, expect, it } from 'vitest';

function hasIgnores(
  config: unknown
): config is {
  ignores: string[];
} {
  return (
    typeof config === 'object' &&
    config !== null &&
    'ignores' in config &&
    Array.isArray(config.ignores)
  );
}

describe('eslint config ignores', () => {
  it('ignores nested worktrees so local audit workspaces do not pollute lint runs', async () => {
    const { default: eslintConfig } = await import('../eslint.config.mjs');
    const baseConfig = eslintConfig.find(hasIgnores);

    expect(baseConfig).toBeDefined();
    expect(baseConfig?.ignores).toContain('.worktrees/**');
  });
});
