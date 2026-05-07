import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createGuestTaskToken, verifyGuestTaskToken } from './guest-task-token';

const originalAuthSecret = process.env.AUTH_SECRET;

describe('guest task token', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'guest-task-token-test-secret';
  });

  afterAll(() => {
    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it('verifies a token for the matching guest and task', () => {
    const token = createGuestTaskToken({
      guestIdHash: 'guest-hash-1',
      taskId: 'guest-task-1',
    });

    expect(
      verifyGuestTaskToken({
        guestIdHash: 'guest-hash-1',
        taskId: 'guest-task-1',
        token,
      })
    ).toMatchObject({
      guestIdHash: 'guest-hash-1',
      taskId: 'guest-task-1',
    });
  });

  it('rejects a token when the task or guest does not match', () => {
    const token = createGuestTaskToken({
      guestIdHash: 'guest-hash-1',
      taskId: 'guest-task-1',
    });

    expect(
      verifyGuestTaskToken({
        guestIdHash: 'guest-hash-2',
        taskId: 'guest-task-1',
        token,
      })
    ).toBeNull();
    expect(
      verifyGuestTaskToken({
        guestIdHash: 'guest-hash-1',
        taskId: 'guest-task-2',
        token,
      })
    ).toBeNull();
  });
});
