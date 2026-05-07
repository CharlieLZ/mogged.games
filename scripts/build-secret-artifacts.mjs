#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseDotenv } from 'dotenv';

const EMPTY_NEXT_ENV_CONTENT = [
  '// Runtime env is provided by Cloudflare/Vercel bindings.',
  'export const production = {};',
  'export const development = {};',
  'export const test = {};',
  '',
].join('\n');

const SENSITIVE_KEY_PATTERN =
  /(^|_)(API_KEY|AUTH_SECRET|ACCESS_KEY|CLIENT_SECRET|DATABASE_URL|DB_URL|JWT|KEY|PASSWORD|PRIVATE|PRIVATE_KEY|SECRET|SIGNING_SECRET|TOKEN|WEBHOOK_SECRET|WEBHOOK_URL)(_|$)/i;

const PUBLIC_ENV_KEYS = new Set([
  'ADSENSE_CODE',
  'GOOGLE_CLIENT_ID',
  'PAYPAL_CLIENT_ID',
  'R2_ACCOUNT_ID',
  'R2_BUCKET_NAME',
  'R2_DOMAIN',
  'R2_ENDPOINT',
  'STRIPE_PUBLISHABLE_KEY',
]);

const PLACEHOLDER_VALUES = new Set([
  'changeme',
  'change-me',
  'creem_xxx',
  'example',
  'none',
  'null',
  'placeholder',
  'replace',
  'secret',
  'todo',
  'undefined',
  'xxx',
  'xxxx',
  '替换',
]);

const ENV_FILE_PATTERN = /^\.env(?:$|[.-].*)|^\.env-ref$|^\.dev\.vars(?:$|\..*)$/;
const ENV_EXAMPLE_PATTERN =
  /^\.env(?:\.example|\.sample|\.template)$|^\.dev\.vars(?:\.example|\.sample|\.template)$/;
const MAX_SCAN_FILE_BYTES = 64 * 1024 * 1024;

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function relativePath(cwd, filePath) {
  return toPosixPath(path.relative(cwd, filePath));
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function dirExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function normalizeEnvValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function isPublicEnvKey(key) {
  return key.startsWith('NEXT_PUBLIC_') || PUBLIC_ENV_KEYS.has(key);
}

function isSensitiveEnvKey(key) {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function isPlaceholderValue(value) {
  const normalized = normalizeEnvValue(value);
  const lowerValue = normalized.toLowerCase();

  return (
    normalized.length < 8 ||
    PLACEHOLDER_VALUES.has(lowerValue) ||
    /(?:^|[-_])x{3,}(?:$|[-_])/i.test(normalized) ||
    /^your[-_a-z0-9]*$/i.test(normalized) ||
    /^(?:sk|pk|whsec|rk|ak|as)?[-_]?example/i.test(normalized)
  );
}

function isLocalEnvFileName(fileName) {
  return ENV_FILE_PATTERN.test(fileName) && !ENV_EXAMPLE_PATTERN.test(fileName);
}

export function discoverLocalEnvFiles(cwd = process.cwd()) {
  return fs
    .readdirSync(cwd, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isLocalEnvFileName(entry.name))
    .map((entry) => path.join(cwd, entry.name))
    .sort();
}

export function readLocalEnvRecords({ cwd = process.cwd() } = {}) {
  return discoverLocalEnvFiles(cwd).map((filePath) => ({
    filePath: relativePath(cwd, filePath),
    vars: parseDotenv(fs.readFileSync(filePath, 'utf8')),
  }));
}

export function collectSensitiveEnvValues(envRecords) {
  const secrets = [];
  const seen = new Set();

  for (const record of envRecords) {
    for (const [key, rawValue] of Object.entries(record.vars ?? {})) {
      const value = normalizeEnvValue(rawValue);
      const dedupeKey = `${key}\0${value}`;

      if (
        !key ||
        !value ||
        seen.has(dedupeKey) ||
        isPublicEnvKey(key) ||
        !isSensitiveEnvKey(key) ||
        isPlaceholderValue(value)
      ) {
        continue;
      }

      seen.add(dedupeKey);
      secrets.push({
        key,
        value,
        sourceFile: record.filePath,
      });
    }
  }

  return secrets;
}

function getArtifactRoots(cwd, nextOnly) {
  const roots = [
    '.next/standalone',
    '.next/server',
    '.next/static',
    'public',
  ];

  if (!nextOnly) {
    roots.push('.open-next');
  }

  return roots.map((root) => path.join(cwd, root));
}

function walkFiles(root, visitor) {
  if (!dirExists(root)) {
    return;
  }

  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile()) {
        visitor(entryPath);
      }
    }
  }
}

function isGeneratedEnvFile(filePath) {
  return isLocalEnvFileName(path.basename(filePath));
}

function scanFileForSecrets({ cwd, filePath, secrets }) {
  const stat = fs.statSync(filePath);

  if (stat.size > MAX_SCAN_FILE_BYTES || secrets.length === 0) {
    return [];
  }

  const content = fs.readFileSync(filePath);
  const leaks = [];

  for (const secret of secrets) {
    if (content.includes(Buffer.from(secret.value))) {
      leaks.push({
        kind: 'secret-value',
        key: secret.key,
        filePath: relativePath(cwd, filePath),
        sourceFile: secret.sourceFile,
      });
    }
  }

  return leaks;
}

export function findBuildSecretLeaks({
  cwd = process.cwd(),
  nextOnly = false,
  envRecords = readLocalEnvRecords({ cwd }),
} = {}) {
  const secrets = collectSensitiveEnvValues(envRecords);
  const leaks = [];

  for (const root of getArtifactRoots(cwd, nextOnly)) {
    walkFiles(root, (filePath) => {
      if (isGeneratedEnvFile(filePath)) {
        leaks.push({
          kind: 'env-file',
          key: path.basename(filePath),
          filePath: relativePath(cwd, filePath),
        });
        return;
      }

      leaks.push(...scanFileForSecrets({ cwd, filePath, secrets }));
    });
  }

  const seen = new Set();
  return leaks.filter((leak) => {
    const fingerprint = `${leak.kind}\0${leak.key}\0${leak.filePath}`;
    if (seen.has(fingerprint)) {
      return false;
    }
    seen.add(fingerprint);
    return true;
  });
}

export function formatSecretLeakReport(leaks) {
  if (leaks.length === 0) {
    return '[build-secrets] no secret-bearing build artifacts found';
  }

  return [
    '[build-secrets] found secret-bearing build artifacts:',
    ...leaks.map((leak) =>
      leak.kind === 'env-file'
        ? `  - env file: ${leak.filePath}`
        : `  - ${leak.key}: ${leak.filePath}`
    ),
    '[build-secrets] values are redacted; move them to runtime secret stores.',
  ].join('\n');
}

function normalizeDockerIgnorePattern(pattern) {
  return pattern.trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

export function validateDockerIgnore({ cwd = process.cwd() } = {}) {
  const dockerIgnorePath = path.join(cwd, '.dockerignore');
  const requiredPatterns = ['.env*', '.dev.vars*', '.open-next', '.next'];

  if (!fileExists(dockerIgnorePath)) {
    return requiredPatterns.map((pattern) => ({
      pattern,
      reason: '.dockerignore is missing',
    }));
  }

  const patterns = new Set(
    fs
      .readFileSync(dockerIgnorePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('!'))
      .map(normalizeDockerIgnorePattern)
  );

  return requiredPatterns
    .filter((pattern) => !patterns.has(pattern))
    .map((pattern) => ({
      pattern,
      reason: `missing ${pattern} in .dockerignore`,
    }));
}

export function formatDockerIgnoreReport(issues) {
  if (issues.length === 0) {
    return '[build-secrets] Docker context ignore rules are present';
  }

  return [
    '[build-secrets] Docker context can include local env files:',
    ...issues.map((issue) => `  - ${issue.pattern}: ${issue.reason}`),
  ].join('\n');
}

export function sanitizeBuildArtifacts({
  cwd = process.cwd(),
  nextOnly = false,
} = {}) {
  const actions = [];
  const nextEnvPath = path.join(cwd, '.open-next', 'cloudflare', 'next-env.mjs');

  if (!nextOnly && fileExists(nextEnvPath)) {
    fs.writeFileSync(nextEnvPath, EMPTY_NEXT_ENV_CONTENT, 'utf8');
    actions.push({
      type: 'rewrite-next-env',
      filePath: relativePath(cwd, nextEnvPath),
    });
  }

  const envFileRoots = nextOnly
    ? [path.join(cwd, '.next', 'standalone')]
    : [path.join(cwd, '.next', 'standalone'), path.join(cwd, '.open-next')];

  for (const root of envFileRoots) {
    walkFiles(root, (filePath) => {
      if (!isGeneratedEnvFile(filePath)) {
        return;
      }

      fs.unlinkSync(filePath);
      actions.push({
        type: 'remove-env-file',
        filePath: relativePath(cwd, filePath),
      });
    });
  }

  return { actions };
}

function parseCliArgs(argv) {
  const options = {
    command: 'guard',
    cwd: process.cwd(),
    nextOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === 'guard' || arg === 'sanitize') {
      options.command = arg;
      continue;
    }

    if (arg === '--next-only') {
      options.nextOnly = true;
      continue;
    }

    if (arg === '--cwd') {
      options.cwd = path.resolve(argv[index + 1] || options.cwd);
      index += 1;
      continue;
    }

    if (arg.startsWith('--cwd=')) {
      options.cwd = path.resolve(arg.slice('--cwd='.length));
    }
  }

  return options;
}

function printSanitizeResult(result) {
  if (result.actions.length === 0) {
    console.log('[build-secrets] no generated env artifacts to sanitize');
    return;
  }

  console.log('[build-secrets] sanitized generated env artifacts:');
  for (const action of result.actions) {
    console.log(`  - ${action.type}: ${action.filePath}`);
  }
}

function runGuard(options) {
  const dockerIssues = validateDockerIgnore({ cwd: options.cwd });
  const leaks = findBuildSecretLeaks(options);

  if (dockerIssues.length > 0 || leaks.length > 0) {
    console.error(formatDockerIgnoreReport(dockerIssues));
    console.error(formatSecretLeakReport(leaks));
    process.exit(1);
  }

  console.log(formatDockerIgnoreReport(dockerIssues));
  console.log(formatSecretLeakReport(leaks));
}

function runCli() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.command === 'sanitize') {
    printSanitizeResult(sanitizeBuildArtifacts(options));
    return;
  }

  runGuard(options);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === invokedFile) {
  runCli();
}
