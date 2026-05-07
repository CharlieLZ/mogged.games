#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export function parsePort(rawPort) {
  const value = String(rawPort ?? '').trim();

  if (!value) {
    throw new Error('[dev-port-guard] missing port');
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `[dev-port-guard] invalid port "${value}". Expected an integer from 1 to 65535.`
    );
  }

  return port;
}

export function parseLsofListeners(output) {
  const listenersByPid = new Map();

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('COMMAND ')) {
      continue;
    }

    const columns = line.split(/\s+/);
    const pid = Number(columns[1]);

    if (!Number.isInteger(pid) || pid < 1) {
      continue;
    }

    listenersByPid.set(pid, {
      command: columns[0],
      name: columns.slice(8).join(' '),
      pid,
    });
  }

  return Array.from(listenersByPid.values()).sort((left, right) => {
    return left.pid - right.pid;
  });
}

export function formatPortInUseMessage(port, listeners) {
  const pids = listeners.map((listener) => listener.pid).join(' ');
  const processLines = listeners
    .map((listener) => {
      const name = listener.name ? ` ${listener.name}` : '';
      return `- PID ${listener.pid} ${listener.command}${name}`;
    })
    .join('\n');

  return [
    `[dev-port-guard] ${port} 端口已被占用，Next.js 无法绑定这个端口。`,
    `[dev-port-guard] Port ${port} is already in use, so Next.js cannot bind it.`,
    '',
    '占用进程 / Listening process:',
    processLines,
    '',
    '关闭该端口 / Stop the process:',
    `kill ${pids}`,
    '',
    '如果进程不退出，再用强制关闭 / If it refuses to stop, force it:',
    `kill -9 ${pids}`,
    '',
    '重新查看占用 / Re-check the port:',
    `lsof -nP -iTCP:${port} -sTCP:LISTEN`,
  ].join('\n');
}

export function readPortListeners(port) {
  try {
    const output = execFileSync(
      'lsof',
      ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    return parseLsofListeners(output);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 1
    ) {
      return [];
    }

    throw error;
  }
}

export function main(argv = process.argv) {
  const port = parsePort(argv[2] ?? process.env.PORT ?? '3000');
  const listeners = readPortListeners(port);

  if (listeners.length === 0) {
    return 0;
  }

  console.error(formatPortInUseMessage(port, listeners));
  return 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exit(main());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '[dev-port-guard] unknown error';
    console.error(message);
    process.exit(1);
  }
}
