import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  consumeCredits,
  CreditStatus,
  CreditTransactionType,
  grantCreditsForNewUser,
  revokeUnusedCreditsByOrderNo,
  scheduleCreditGrantNotification,
} from './credit';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  sendCreditsNotification: vi.fn(),
  getAllConfigs: vi.fn(),
  getSnowId: vi.fn(() => 'txn-signup-1'),
  getUuid: vi.fn(() => 'credit-signup-1'),
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

vi.mock('@/extensions/notification', () => ({
  sendCreditsNotification: mocks.sendCreditsNotification,
}));

vi.mock('@/shared/lib/hash', () => ({
  getSnowId: mocks.getSnowId,
  getUuid: mocks.getUuid,
}));

vi.mock('./config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

type MockTx = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

function createBalanceSelectResult(total: string) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([{ total }]),
    })),
  };
}

function createBatchSelectResult(rows: Array<Record<string, unknown>>) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            for: vi.fn().mockResolvedValue(rows),
          })),
        })),
      })),
    })),
  };
}

function createMockTx(): MockTx & {
  updateWhere: ReturnType<typeof vi.fn>;
  insertValues: ReturnType<typeof vi.fn>;
} {
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const insertValues = vi.fn().mockResolvedValue(undefined);

  return {
    select: vi
      .fn()
      .mockImplementationOnce(() => createBalanceSelectResult('10'))
      .mockImplementationOnce(() =>
        createBatchSelectResult([
          {
            id: 'grant-1',
            remainingCredits: 4,
            transactionNo: 'grant-no-1',
            expiresAt: null,
          },
        ])
      )
      .mockImplementationOnce(() => createBatchSelectResult([])),
    updateWhere,
    insertValues,
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere,
      })),
    })),
    insert: vi.fn(() => ({
      values: insertValues,
    })),
  };
}

function createRevokeTx(grantCredit?: Record<string, unknown>) {
  const selectLimit = vi
    .fn()
    .mockResolvedValue(grantCredit ? [grantCredit] : []);
  const selectWhere = vi.fn(() => ({
    limit: selectLimit,
  }));
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({
    where: updateWhere,
  }));

  return {
    selectLimit,
    selectWhere,
    updateWhere,
    updateSet,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: selectWhere,
      })),
    })),
    update: vi.fn(() => ({
      set: updateSet,
    })),
  };
}

describe('consumeCredits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.mockReset();
    mocks.sendCreditsNotification.mockReset();
  });

  it('throws before writing any consumption record when the locked grant rows cannot cover the request', async () => {
    const tx = createMockTx();

    await expect(
      consumeCredits({
        userId: 'user-1',
        credits: 10,
        scene: 'text-to-video',
        description: 'generate video',
        tx,
      })
    ).rejects.toThrow('Insufficient credits after locking grants, 4 < 10');

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.insertValues).not.toHaveBeenCalled();
  });

  it('sends credits notifications for non-zero deductions too', async () => {
    mocks.db.mockReturnValue({
      select: vi
        .fn()
        .mockImplementationOnce(() => createBalanceSelectResult('88')),
    });
    mocks.sendCreditsNotification.mockResolvedValue({
      code: 0,
      msg: 'ok',
    });

    await scheduleCreditGrantNotification({
      credit: {
        id: 'credit-consume-1',
        userId: 'user-1',
        userEmail: 'charlie@example.com',
        orderNo: 'order-123',
        subscriptionNo: '',
        transactionNo: 'txn-123',
        transactionType: CreditTransactionType.CONSUME,
        transactionScene: 'text-to-video',
        credits: -12,
        remainingCredits: 0,
        description: 'generate video',
        expiresAt: null,
        status: CreditStatus.ACTIVE,
        metadata: {
          type: 'ai-task',
          taskId: 'task-42',
          mediaType: 'video',
        },
      },
      email: 'charlie@example.com',
      name: 'Charlie',
      source: 'consume_credits',
      context: {
        locale: 'en',
        countryCode: 'US',
        regionCode: 'US-CA',
        userAgent: 'Mozilla/5.0',
        deviceType: 'desktop',
      },
    });

    expect(mocks.sendCreditsNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'charlie@example.com',
        name: 'Charlie',
        userId: 'user-1',
        amount: -12,
        balanceAfter: 88,
        transactionType: CreditTransactionType.CONSUME,
        scene: 'text-to-video',
        description: 'generate video',
        orderNo: 'order-123',
        transactionNo: 'txn-123',
        source: 'consume_credits',
        creditId: 'credit-consume-1',
        relatedTaskId: 'task-42',
        metadataType: 'ai-task',
        metadataKeys: expect.arrayContaining(['type', 'taskId', 'mediaType']),
      })
    );
  });
});

describe('grantCreditsForNewUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.mockReset();
    mocks.sendCreditsNotification.mockReset();
    mocks.getAllConfigs.mockReset();
    mocks.getSnowId.mockClear();
    mocks.getUuid.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses a two week expiration when initial credit validity is not configured', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T10:30:00.000Z'));

    const returning = vi.fn().mockResolvedValue([
      {
        id: 'credit-signup-1',
      },
    ]);
    const onConflictDoNothing = vi.fn(() => ({
      returning,
    }));
    const values = vi.fn(() => ({
      onConflictDoNothing,
    }));
    const insert = vi.fn(() => ({
      values,
    }));
    const select = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ total: '150' }]),
        })),
      }));

    mocks.db.mockReturnValue({
      insert,
      select,
    });
    mocks.getAllConfigs.mockResolvedValue({
      initial_credits_enabled: 'true',
      initial_credits_amount: '150',
      initial_credits_valid_days: '',
      initial_credits_description: 'Welcome credits',
    });
    mocks.sendCreditsNotification.mockResolvedValue({
      code: 0,
      msg: 'ok',
    });

    await grantCreditsForNewUser({
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      requestContext: {
        locale: 'en',
        countryCode: 'US',
        regionCode: 'US-CA',
        userAgent: 'Mozilla/5.0',
        deviceType: 'desktop',
      },
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        credits: 150,
        remainingCredits: 150,
        transactionNo: 'signup_bonus:user-1',
        expiresAt: new Date('2026-05-17T10:30:00.000Z'),
        metadata: {
          source: 'signup_bonus',
        },
      })
    );
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it('reduces signup bonus credits to one for restricted countries', async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'credit-signup-1',
      },
    ]);
    const onConflictDoNothing = vi.fn(() => ({
      returning,
    }));
    const values = vi.fn(() => ({
      onConflictDoNothing,
    }));
    const insert = vi.fn(() => ({
      values,
    }));
    const select = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ total: '1' }]),
        })),
      }));

    mocks.db.mockReturnValue({
      insert,
      select,
    });
    mocks.getAllConfigs.mockResolvedValue({
      initial_credits_enabled: 'true',
      initial_credits_amount: '150',
      initial_credits_valid_days: '14',
      initial_credits_description: 'Welcome credits',
    });

    await grantCreditsForNewUser({
      id: 'user-restricted',
      email: 'restricted@example.com',
      name: 'Restricted User',
      requestContext: {
        countryCode: 'IN',
      },
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        credits: 1,
        remainingCredits: 1,
        transactionNo: 'signup_bonus:user-restricted',
      })
    );
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate an existing signup gift grant when auth hooks retry', async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 'existing-signup-gift' }]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const insert = vi.fn();

    mocks.db.mockReturnValue({
      select: vi.fn(() => ({ from })),
      insert,
    });
    mocks.getAllConfigs.mockResolvedValue({
      initial_credits_enabled: 'true',
      initial_credits_amount: '150',
      initial_credits_valid_days: '14',
      initial_credits_description: 'Welcome credits',
    });

    await grantCreditsForNewUser({
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
    });

    expect(limit).toHaveBeenCalledWith(1);
    expect(insert).not.toHaveBeenCalled();
    expect(mocks.sendCreditsNotification).not.toHaveBeenCalled();
  });

  it('skips notification when a concurrent signup gift insert already won', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const onConflictDoNothing = vi.fn(() => ({
      returning,
    }));
    const values = vi.fn(() => ({
      onConflictDoNothing,
    }));
    const insert = vi.fn(() => ({
      values,
    }));
    const select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    }));

    mocks.db.mockReturnValue({
      select,
      insert,
    });
    mocks.getAllConfigs.mockResolvedValue({
      initial_credits_enabled: 'true',
      initial_credits_amount: '150',
      initial_credits_valid_days: '14',
      initial_credits_description: 'Welcome credits',
    });

    await grantCreditsForNewUser({
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionNo: 'signup_bonus:user-1',
      })
    );
    expect(mocks.sendCreditsNotification).not.toHaveBeenCalled();
  });
});

describe('revokeUnusedCreditsByOrderNo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.mockReset();
  });

  it('revokes remaining grant credits in a managed transaction and appends revocation metadata', async () => {
    const tx = createRevokeTx({
      id: 'grant-1',
      remainingCredits: 7,
      description: 'Starter pack',
      metadata: {
        source: 'checkout',
      },
    });
    const transaction = vi.fn((callback: (executor: typeof tx) => unknown) =>
      callback(tx)
    );

    mocks.db.mockReturnValue({
      transaction,
    });

    const revokedCredits = await revokeUnusedCreditsByOrderNo({
      orderNo: ' order_123 ',
      reason: 'fraud_warning',
    });

    expect(revokedCredits).toBe(7);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        remainingCredits: 0,
        status: CreditStatus.EXPIRED,
        expiresAt: expect.any(Date),
        description:
          'Starter pack | Unused credits revoked after fraud_warning',
        metadata: expect.objectContaining({
          source: 'checkout',
          revokedBy: 'payment_webhook',
          revokedReason: 'fraud_warning',
          revokedAt: expect.any(String),
          revokedCredits: 7,
        }),
      })
    );
  });

  it('uses the provided transaction and skips writes when no revocable credits remain', async () => {
    const tx = createRevokeTx({
      id: 'grant-1',
      remainingCredits: 0,
      description: 'Starter pack',
      metadata: {},
    });

    const revokedCredits = await revokeUnusedCreditsByOrderNo({
      orderNo: 'order_123',
      tx,
    });

    expect(revokedCredits).toBe(0);
    expect(mocks.db).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.updateSet).not.toHaveBeenCalled();
  });
});
