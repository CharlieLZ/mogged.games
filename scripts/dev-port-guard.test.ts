import { describe, expect, it } from 'vitest';

import {
  formatPortInUseMessage,
  parseLsofListeners,
  parsePort,
} from './dev-port-guard.mjs';

describe('dev port guard', () => {
  it('rejects missing or invalid ports before running lsof', () => {
    expect(() => parsePort('')).toThrow('missing port');
    expect(() => parsePort('abc')).toThrow('invalid port');
    expect(() => parsePort('70000')).toThrow('invalid port');
  });

  it('parses lsof listener rows into process details', () => {
    const listeners = parseLsofListeners(`
COMMAND   PID          USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node    37564 charliesimmon   20u  IPv6 0x9b5c88bad009ccc9      0t0  TCP *:3000 (LISTEN)
`);

    expect(listeners).toEqual([
      {
        command: 'node',
        name: '*:3000 (LISTEN)',
        pid: 37564,
      },
    ]);
  });

  it('prints the exact kill commands for the occupied port', () => {
    const message = formatPortInUseMessage(3000, [
      {
        command: 'node',
        name: '*:3000 (LISTEN)',
        pid: 37564,
      },
    ]);

    expect(message).toContain('3000 端口已被占用');
    expect(message).toContain('Port 3000 is already in use');
    expect(message).toContain('PID 37564 node *:3000 (LISTEN)');
    expect(message).toContain('kill 37564');
    expect(message).toContain('kill -9 37564');
    expect(message).toContain('lsof -nP -iTCP:3000 -sTCP:LISTEN');
  });
});
