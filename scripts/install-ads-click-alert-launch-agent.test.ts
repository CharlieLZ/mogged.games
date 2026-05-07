import { describe, expect, it } from 'vitest';

import {
  buildInstallContext,
  buildLaunchAgentPlist,
} from './install-ads-click-alert-launch-agent';

describe('ads click alert installer', () => {
  it('supports deploying into the shared scripts directory', () => {
    const context = buildInstallContext({
      workspaceDir: '/repo/mogged.games',
      deployDir: '/Users/project/脚本/google-ads/ads-click-alert',
      homeDir: '/Users/tester',
    });

    expect(context.deployDir).toBe('/Users/project/脚本/google-ads/ads-click-alert');
    expect(context.deployedScriptPath).toBe(
      '/Users/project/脚本/google-ads/ads-click-alert/ads-click-alert.ts'
    );
    expect(context.legacyStateFilePath).toBe(
      '/Users/tester/Library/Application Support/ImageEditorAi/ads-click-alert/state.json'
    );
    expect(context.deployedScriptPath.startsWith('/repo/')).toBe(false);
  });

  it('writes the launch agent against the deployed runtime path', () => {
    const plist = buildLaunchAgentPlist({
      workingDirectory: '/repo/mogged.games',
      nodeExecutable: '/usr/local/bin/node',
      tsxCliPath: '/repo/mogged.games/node_modules/tsx/dist/cli.mjs',
      scriptPath: '/Users/project/脚本/google-ads/ads-click-alert/ads-click-alert.ts',
      stateFilePath: '/Users/project/脚本/google-ads/ads-click-alert/state.json',
      stdoutLogPath: '/Users/project/脚本/google-ads/ads-click-alert/stdout.log',
      stderrLogPath: '/Users/project/脚本/google-ads/ads-click-alert/stderr.log',
    });

    expect(plist).toContain(
      '<string>/Users/project/脚本/google-ads/ads-click-alert/ads-click-alert.ts</string>'
    );
    expect(plist).toContain('<string>--workspace-dir</string>');
    expect(plist).not.toContain('/repo/mogged.games/scripts/ads-click-alert');
  });

  it('normalizes worktree installs to a stable repo runtime path', () => {
    const context = buildInstallContext({
      workspaceDir:
        '/repo/mogged.games/.worktrees/ads-click-alert-followups',
      deployDir: '/Users/project/脚本/google-ads/ads-click-alert',
      homeDir: '/Users/tester',
    });

    expect(context.sourceScriptPath).toBe(
      '/repo/mogged.games/.worktrees/ads-click-alert-followups/scripts/ads-click-alert.ts'
    );
    expect(context.workspaceDir).toBe('/repo/mogged.games');
    expect(context.tsxCliPath).toBe(
      '/repo/mogged.games/node_modules/tsx/dist/cli.mjs'
    );
  });
});
