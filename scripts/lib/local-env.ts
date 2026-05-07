import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_API_MD_PATH = '/Users/charliesimmon/clawd/API.md';

function trimValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseLineValue(rawValue: string) {
  const value = trimValue(rawValue);

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readKeyValueAssignments(
  filePath: string,
  options?: { preferFirstAssignment?: boolean }
) {
  if (!filePath || !existsSync(filePath)) {
    return {} as Record<string, string>;
  }

  const preferFirstAssignment = options?.preferFirstAssignment === true;
  const keys: Record<string, string> = {};
  const pattern = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/u;
  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = pattern.exec(line);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (preferFirstAssignment && key in keys) {
      continue;
    }

    keys[key] = parseLineValue(rawValue);
  }

  return keys;
}

export function preloadLocalEnvFiles(workspaceDir = process.cwd()) {
  const sources = [
    resolve(workspaceDir, '.env'),
    resolve(workspaceDir, '.env-ref'),
    DEFAULT_API_MD_PATH,
  ];

  for (const source of sources) {
    const values = readKeyValueAssignments(source, {
      preferFirstAssignment: true,
    });

    for (const [key, value] of Object.entries(values)) {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}
