import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({
    type: 'and',
    conditions,
  })),
  eq: vi.fn((column: unknown, value: unknown) => ({
    type: 'eq',
    column,
    value,
  })),
  insert: vi.fn(),
  getUuid: vi.fn(() => 'user-role-id'),
}));

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>(
    'drizzle-orm'
  );

  return {
    ...actual,
    and: mocks.and,
    eq: mocks.eq,
  };
});

vi.mock('@/core/db', () => ({
  db: () => ({
    insert: mocks.insert,
  }),
}));

vi.mock('@/shared/lib/hash', () => ({
  getUuid: mocks.getUuid,
}));

import { userRole } from '@/config/db/schema';

import { assignRoleToUser, buildUserRoleMatchCondition } from './rbac';

describe('rbac role assignment helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUuid.mockReturnValue('user-role-id');
  });

  it('builds a user role lookup condition that matches both user and role ids', () => {
    const condition = buildUserRoleMatchCondition('user-123', 'role-456');

    expect(mocks.eq).toHaveBeenNthCalledWith(1, userRole.userId, 'user-123');
    expect(mocks.eq).toHaveBeenNthCalledWith(2, userRole.roleId, 'role-456');
    expect(mocks.and).toHaveBeenCalledWith(
      {
        type: 'eq',
        column: userRole.userId,
        value: 'user-123',
      },
      {
        type: 'eq',
        column: userRole.roleId,
        value: 'role-456',
      }
    );
    expect(condition).toEqual({
      type: 'and',
      conditions: [
        {
          type: 'eq',
          column: userRole.userId,
          value: 'user-123',
        },
        {
          type: 'eq',
          column: userRole.roleId,
          value: 'role-456',
        },
      ],
    });
  });

  it('stores expiresAt when assigning an expiring role to a user', async () => {
    const expiresAt = new Date('2026-04-20T00:00:00.000Z');
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'user-role-id',
        userId: 'user-123',
        roleId: 'role-456',
        expiresAt,
      },
    ]);
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoNothing }));

    mocks.insert.mockReturnValue({ values });

    await assignRoleToUser('user-123', 'role-456', expiresAt);

    expect(values).toHaveBeenCalledWith({
      id: 'user-role-id',
      userId: 'user-123',
      roleId: 'role-456',
      expiresAt,
    });
  });
});
