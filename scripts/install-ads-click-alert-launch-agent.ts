import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const LAUNCH_AGENT_LABEL = 'com.imageeditorai.ads-click-alert';
const PREFERRED_DEPLOY_DIR = '/Users/project/脚本/google-ads/ads-click-alert';

type InstallArgs = {
  workspaceDir: string;
  deployDir?: string;
  printOnly: boolean;
};

type InstallContext = {
  sourceWorkspaceDir: string;
  workspaceDir: string;
  deployDir: string;
  legacyDeployDir: string;
  deployedScriptPath: string;
  sourceScriptPath: string;
  stateFilePath: string;
  legacyStateFilePath: string;
  stdoutLogPath: string;
  stderrLogPath: string;
  plistPath: string;
  tsxCliPath: string;
};

function parseInstallArgs(rawArgs: string[]): InstallArgs {
  const { values } = parseArgs({
    args: rawArgs.filter((arg) => arg !== '--'),
    options: {
      'workspace-dir': { type: 'string' },
      'deploy-dir': { type: 'string' },
      'print-only': { type: 'boolean' },
    },
    allowPositionals: false,
  });

  return {
    workspaceDir: resolve(trimString(values['workspace-dir']) || process.cwd()),
    deployDir: trimString(values['deploy-dir']) || undefined,
    printOnly: values['print-only'] ?? false,
  };
}

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
}

function resolveLegacyDeployDir(homeDir: string) {
  return join(
    homeDir,
    'Library',
    'Application Support',
    'ImageEditorAi',
    'ads-click-alert'
  );
}

function ensureParentDirectory(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function resolveDefaultDeployDir(homeDir: string) {
  const preferredParent = dirname(PREFERRED_DEPLOY_DIR);
  if (existsSync(preferredParent)) {
    return PREFERRED_DEPLOY_DIR;
  }

  return resolveLegacyDeployDir(homeDir);
}

function normalizeRuntimeWorkspaceDir(workspaceDir: string) {
  const marker = `${sep}.worktrees${sep}`;
  const normalizedPath = resolve(workspaceDir);
  const markerIndex = normalizedPath.indexOf(marker);

  if (markerIndex === -1) {
    return normalizedPath;
  }

  return normalizedPath.slice(0, markerIndex);
}

export function buildInstallContext(options?: {
  homeDir?: string;
  workspaceDir?: string;
  deployDir?: string;
}): InstallContext {
  const homeDir = options?.homeDir ?? homedir();
  const resolvedSourceWorkspaceDir = resolve(
    options?.workspaceDir ?? process.cwd()
  );
  const resolvedWorkspaceDir = normalizeRuntimeWorkspaceDir(
    resolvedSourceWorkspaceDir
  );
  const legacyDeployDir = resolveLegacyDeployDir(homeDir);
  const resolvedDeployDir = resolve(
    trimString(options?.deployDir) || resolveDefaultDeployDir(homeDir)
  );

  return {
    sourceWorkspaceDir: resolvedSourceWorkspaceDir,
    workspaceDir: resolvedWorkspaceDir,
    deployDir: resolvedDeployDir,
    legacyDeployDir,
    deployedScriptPath: join(resolvedDeployDir, 'ads-click-alert.ts'),
    sourceScriptPath: join(
      resolvedSourceWorkspaceDir,
      'scripts',
      'ads-click-alert.ts'
    ),
    stateFilePath: join(resolvedDeployDir, 'state.json'),
    legacyStateFilePath: join(legacyDeployDir, 'state.json'),
    stdoutLogPath: join(resolvedDeployDir, 'stdout.log'),
    stderrLogPath: join(resolvedDeployDir, 'stderr.log'),
    plistPath: join(homeDir, 'Library', 'LaunchAgents', `${LAUNCH_AGENT_LABEL}.plist`),
    tsxCliPath: resolve(
      resolvedWorkspaceDir,
      'node_modules',
      'tsx',
      'dist',
      'cli.mjs'
    ),
  };
}

export function buildLaunchAgentPlist(input: {
  workingDirectory: string;
  nodeExecutable: string;
  tsxCliPath: string;
  scriptPath: string;
  stdoutLogPath: string;
  stderrLogPath: string;
  stateFilePath: string;
}) {
  const args = [
    input.nodeExecutable,
    input.tsxCliPath,
    input.scriptPath,
    '--workspace-dir',
    input.workingDirectory,
    '--state-file',
    input.stateFilePath,
  ]
    .map((value) => `<string>${escapeXml(value)}</string>`)
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    ${args}
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(input.workingDirectory)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>300</integer>
  <key>StandardOutPath</key>
  <string>${escapeXml(input.stdoutLogPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(input.stderrLogPath)}</string>
</dict>
</plist>
`;
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function runLaunchctl(args: string[], options?: { allowFailure?: boolean }) {
  const result = spawnSync('launchctl', args, {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.status !== 0 && !options?.allowFailure) {
    throw new Error(
      `launchctl ${args.join(' ')} failed: ${result.stderr.trim() || result.stdout.trim()}`
    );
  }

  return result;
}

function normalizeSpawnOutput(value: string | Buffer | null | undefined) {
  return typeof value === 'string' ? value.trim() : value?.toString('utf8').trim() ?? '';
}

function launchctlErrorMessage(result: ReturnType<typeof spawnSync>) {
  return (
    normalizeSpawnOutput(result.stderr) ||
    normalizeSpawnOutput(result.stdout) ||
    'unknown launchctl error'
  );
}

async function main() {
  const args = parseInstallArgs(process.argv.slice(2));
  const context = buildInstallContext({
    workspaceDir: args.workspaceDir,
    deployDir: args.deployDir,
  });
  const plist = buildLaunchAgentPlist({
    workingDirectory: context.workspaceDir,
    nodeExecutable: process.execPath,
    tsxCliPath: context.tsxCliPath,
    scriptPath: context.deployedScriptPath,
    stdoutLogPath: context.stdoutLogPath,
    stderrLogPath: context.stderrLogPath,
    stateFilePath: context.stateFilePath,
  });

  if (args.printOnly) {
    console.log(plist);
    console.log(`workspace_dir=${context.workspaceDir}`);
    console.log(`deploy_dir=${context.deployDir}`);
    console.log(`deployed_script=${context.deployedScriptPath}`);
    console.log(`plist_path=${context.plistPath}`);
    console.log(`state_file=${context.stateFilePath}`);
    console.log(`stdout_log=${context.stdoutLogPath}`);
    console.log(`stderr_log=${context.stderrLogPath}`);
    return;
  }

  ensureParentDirectory(context.deployedScriptPath);
  ensureParentDirectory(context.stdoutLogPath);
  ensureParentDirectory(context.plistPath);
  copyFileSync(context.sourceScriptPath, context.deployedScriptPath);
  if (
    context.deployDir !== context.legacyDeployDir &&
    !existsSync(context.stateFilePath) &&
    existsSync(context.legacyStateFilePath)
  ) {
    copyFileSync(context.legacyStateFilePath, context.stateFilePath);
  }
  writeFileSync(context.plistPath, plist, 'utf8');

  const uid = String(process.getuid?.() ?? '');
  const domainTarget = uid ? `gui/${uid}` : 'gui/501';

  runLaunchctl(['bootout', domainTarget, context.plistPath], { allowFailure: true });
  runLaunchctl(['bootstrap', domainTarget, context.plistPath]);
  const kickstartResult = runLaunchctl(
    ['kickstart', '-k', `${domainTarget}/${LAUNCH_AGENT_LABEL}`],
    { allowFailure: true }
  );

  if (kickstartResult.status !== 0) {
    console.warn('[ads-click-alert:install] kickstart skipped', {
      error: launchctlErrorMessage(kickstartResult),
    });
  }

  console.log(`Installed and started ${LAUNCH_AGENT_LABEL}`);
  console.log(`deploy_dir=${context.deployDir}`);
  console.log(`deployed_script=${context.deployedScriptPath}`);
  console.log(`plist_path=${context.plistPath}`);
  console.log(`state_file=${context.stateFilePath}`);
  console.log(`stdout_log=${context.stdoutLogPath}`);
  console.log(`stderr_log=${context.stderrLogPath}`);
}

if (isMainModule()) {
  main().catch((error) => {
    console.error('[ads-click-alert:install] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  });
}
