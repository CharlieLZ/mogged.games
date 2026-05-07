import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAITask,
  normalizeAITaskJsonFields,
  updateAITaskById,
} from './ai_task';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  consumeCredits: vi.fn(),
  getSnowId: vi.fn(() => 'refund-txn-1'),
  getUuid: vi.fn(() => 'refund-credit-1'),
  scheduleCreditBalanceChangeNotification: vi.fn(),
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

vi.mock('@/shared/lib/hash', () => ({
  getSnowId: mocks.getSnowId,
  getUuid: mocks.getUuid,
}));

vi.mock('./credit', async () => {
  const actual = await vi.importActual<typeof import('./credit')>('./credit');

  return {
    ...actual,
    consumeCredits: mocks.consumeCredits,
    scheduleCreditBalanceChangeNotification:
      mocks.scheduleCreditBalanceChangeNotification,
  };
});

describe('normalizeAITaskJsonFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.mockReset();
    mocks.consumeCredits.mockReset();
    mocks.scheduleCreditBalanceChangeNotification.mockReset();
  });

  it('converts historical string json fields into typed objects at the model boundary', () => {
    const normalized = normalizeAITaskJsonFields({
      id: 'task-1',
      options: '{"image_urls":["https://example.com/input.png"]}',
      taskInfo: '{"status":"processing"}',
      taskResult: '{"videos":["https://example.com/output.mp4"]}',
    });

    expect(normalized).toMatchObject({
      id: 'task-1',
      options: {
        image_urls: ['https://example.com/input.png'],
      },
      taskInfo: {
        status: 'processing',
      },
      taskResult: {
        videos: ['https://example.com/output.mp4'],
      },
    });
  });

  it('keeps already-normalized json payloads untouched', () => {
    const normalized = normalizeAITaskJsonFields({
      id: 'task-2',
      options: { fast: true },
      taskInfo: { status: 'done' },
      taskResult: { videos: ['https://example.com/output.mp4'] },
    });

    expect(normalized).toMatchObject({
      id: 'task-2',
      options: { fast: true },
      taskInfo: { status: 'done' },
      taskResult: { videos: ['https://example.com/output.mp4'] },
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createAITask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.mockReset();
    mocks.consumeCredits.mockReset();
    mocks.scheduleCreditBalanceChangeNotification.mockReset();
  });

  it('schedules a credits notification after a consumed credit record is committed', async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const tx = {
      insert: vi.fn(() => ({
        values: vi.fn((values) => ({
          returning: vi.fn().mockResolvedValue([values]),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: updateWhere,
        })),
      })),
    };

    mocks.db.mockReturnValue({
      transaction: vi.fn(async (execute) => execute(tx)),
    });
    mocks.consumeCredits.mockResolvedValue({
      id: 'credit-1',
      userId: 'user-1',
      transactionNo: 'txn-1',
      transactionType: 'consume',
      transactionScene: 'text-to-video',
      credits: -12,
      status: 'active',
    });

    await createAITask({
      id: 'task-1',
      userId: 'user-1',
      mediaType: 'video',
      provider: 'fal',
      model: 'seedance-2.0',
      prompt: 'a horse running on the beach',
      scene: 'text-to-video',
      status: 'processing',
      costCredits: 12,
      taskId: 'provider-task-1',
      options: { fast: true },
      taskInfo: { status: 'queued' },
      taskResult: null,
    });

    expect(mocks.scheduleCreditBalanceChangeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        credit: expect.objectContaining({
          id: 'credit-1',
          userId: 'user-1',
          transactionNo: 'txn-1',
          credits: -12,
        }),
      })
    );
  });

  it('writes task json payloads as structured jsonb values instead of string literals', async () => {
    const valuesSpy = vi.fn((values) => ({
      returning: vi.fn().mockResolvedValue([values]),
    }));
    const tx = {
      insert: vi.fn(() => ({
        values: valuesSpy,
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    };

    mocks.db.mockReturnValue({
      transaction: vi.fn(async (execute) => execute(tx)),
    });
    mocks.consumeCredits.mockResolvedValue(null);

    await createAITask({
      id: 'task-jsonb-create',
      userId: 'user-1',
      mediaType: 'video',
      provider: 'volcengine',
      model: 'doubao-seedance-2-0-fast-260128',
      prompt: 'safe prompt',
      scene: 'text-to-video',
      status: 'processing',
      costCredits: 0,
      taskId: 'provider-task-jsonb-create',
      taskInfo: {
        status: 'queued',
        errorCode: 'none',
      },
      taskResult: {
        id: 'provider-task-jsonb-create',
      },
    });

    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskInfo: {
          status: 'queued',
          errorCode: 'none',
        },
        taskResult: {
          id: 'provider-task-jsonb-create',
        },
      })
    );
  });
});

describe('updateAITaskById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.mockReset();
    mocks.consumeCredits.mockReset();
    mocks.getSnowId.mockClear();
    mocks.getUuid.mockClear();
    mocks.scheduleCreditBalanceChangeNotification.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a usable refund credit when the original grant expires before the refund is applied', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T09:00:00.000Z'));

    const insertValues = vi.fn().mockResolvedValue(undefined);
    const deleteConsumedWhere = vi.fn().mockResolvedValue(undefined);
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'task-1',
        userId: 'user-1',
        status: 'failed',
        taskInfo: null,
        taskResult: null,
      },
    ]);

    const tx = {
      select: vi.fn().mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: 'credit-consume-1',
              userId: 'user-1',
              userEmail: 'charlie@example.com',
              transactionNo: 'txn-consume-1',
              transactionType: 'consume',
              transactionScene: 'text-to-video',
              credits: -12,
              description: 'generate video',
              status: 'active',
              createdAt: new Date('2026-05-01T09:00:00.000Z'),
              consumedDetail: [
                {
                  creditId: 'grant-1',
                  creditsConsumed: 12,
                  expiresAt: '2026-05-01T11:00:00.000Z',
                },
              ],
              metadata: {
                type: 'ai-task',
                taskId: 'task-1',
                mediaType: 'video',
              },
            },
          ]),
        })),
      })),
      insert: vi.fn(() => ({
        values: insertValues,
      })),
      update: vi
        .fn()
        .mockImplementationOnce(() => ({
          set: vi.fn(() => ({
            where: deleteConsumedWhere,
          })),
        }))
        .mockImplementationOnce(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning,
            })),
          })),
        })),
    };

    mocks.db.mockReturnValue({
      transaction: vi.fn(async (execute) => execute(tx)),
    });

    await updateAITaskById('task-1', {
      status: 'failed',
      creditId: 'credit-consume-1',
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'refund-credit-1',
        userId: 'user-1',
        userEmail: 'charlie@example.com',
        transactionNo: 'refund-txn-1',
        transactionType: 'refund',
        transactionScene: 'text-to-video',
        credits: 12,
        remainingCredits: 12,
        expiresAt: new Date('2026-05-03T11:00:00.000Z'),
        status: 'active',
        metadata: expect.objectContaining({
          type: 'ai-task',
          taskId: 'task-1',
          mediaType: 'video',
          refundStatus: 'failed',
        }),
      })
    );
    expect(deleteConsumedWhere).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleCreditBalanceChangeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'ai_task_refund',
        credit: expect.objectContaining({
          userId: 'user-1',
          transactionType: 'refund',
          credits: 12,
          expiresAt: new Date('2026-05-03T11:00:00.000Z'),
        }),
      })
    );
  });

  it('schedules a refund notification after restoring consumed credits for failed tasks', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T08:00:00.000Z'));

    const insertValues = vi.fn().mockResolvedValue(undefined);
    const deleteConsumedWhere = vi.fn().mockResolvedValue(undefined);
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'task-1',
        userId: 'user-1',
        status: 'failed',
        taskInfo: null,
        taskResult: null,
      },
    ]);

    const tx = {
      select: vi.fn().mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: 'credit-1',
              userId: 'user-1',
              userEmail: 'charlie@example.com',
              transactionNo: 'txn-1',
              transactionType: 'consume',
              transactionScene: 'text-to-video',
              credits: -12,
              description: 'generate video',
              status: 'active',
              createdAt: new Date('2026-05-01T08:00:00.000Z'),
              consumedDetail: [
                {
                  creditId: 'grant-1',
                  creditsConsumed: 12,
                  expiresAt: '2026-05-10T08:00:00.000Z',
                },
              ],
              metadata: {
                type: 'ai-task',
                taskId: 'task-1',
                mediaType: 'video',
              },
            },
          ]),
        })),
      })),
      insert: vi.fn(() => ({
        values: insertValues,
      })),
      update: vi
        .fn()
        .mockImplementationOnce(() => ({
          set: vi.fn(() => ({
            where: deleteConsumedWhere,
          })),
        }))
        .mockImplementationOnce(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning,
            })),
          })),
        })),
    };

    mocks.db.mockReturnValue({
      transaction: vi.fn(async (execute) => execute(tx)),
    });

    await updateAITaskById('task-1', {
      status: 'failed',
      creditId: 'credit-1',
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        credits: 12,
        remainingCredits: 12,
        transactionType: 'refund',
        expiresAt: new Date('2026-05-15T08:00:00.000Z'),
      })
    );
    expect(mocks.scheduleCreditBalanceChangeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'ai_task_refund',
        credit: expect.objectContaining({
          id: 'refund-credit-1',
          userId: 'user-1',
          credits: 12,
          transactionType: 'refund',
          transactionScene: 'text-to-video',
          transactionNo: 'refund-txn-1',
          metadata: expect.objectContaining({
            type: 'ai-task',
            taskId: 'task-1',
            mediaType: 'video',
          }),
        }),
      })
    );
  });

  it('keeps refund credits non-expiring when the source expiry cannot be recovered', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));

    const insertValues = vi.fn().mockResolvedValue(undefined);
    const deleteConsumedWhere = vi.fn().mockResolvedValue(undefined);
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'task-1',
        userId: 'user-1',
        status: 'failed',
        taskInfo: null,
        taskResult: null,
      },
    ]);

    const tx = {
      select: vi.fn().mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: 'credit-1',
              userId: 'user-1',
              userEmail: 'charlie@example.com',
              transactionNo: 'txn-1',
              transactionType: 'consume',
              transactionScene: 'text-to-video',
              credits: -12,
              description: 'generate video',
              status: 'active',
              createdAt: new Date('2026-05-01T10:00:00.000Z'),
              consumedDetail: [
                {
                  creditId: 'grant-1',
                  creditsConsumed: 12,
                },
              ],
              metadata: {
                type: 'ai-task',
                taskId: 'task-1',
                mediaType: 'video',
              },
            },
          ]),
        })),
      })),
      insert: vi.fn(() => ({
        values: insertValues,
      })),
      update: vi
        .fn()
        .mockImplementationOnce(() => ({
          set: vi.fn(() => ({
            where: deleteConsumedWhere,
          })),
        }))
        .mockImplementationOnce(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning,
            })),
          })),
        })),
    };

    mocks.db.mockReturnValue({
      transaction: vi.fn(async (execute) => execute(tx)),
    });

    await updateAITaskById('task-1', {
      status: 'failed',
      creditId: 'credit-1',
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        transactionType: 'refund',
        credits: 12,
        expiresAt: null,
      })
    );
  });

  it('keeps refund notifications idempotent when the consumed credit was already deleted', async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'task-1',
        userId: 'user-1',
        status: 'failed',
        taskInfo: null,
        taskResult: null,
      },
    ]);

    const tx = {
      select: vi.fn().mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: 'credit-1',
              userId: 'user-1',
              transactionNo: 'txn-1',
              transactionType: 'consume',
              transactionScene: 'text-to-video',
              credits: -12,
              description: 'generate video',
              status: 'deleted',
              consumedDetail: [],
              metadata: {
                type: 'ai-task',
                taskId: 'task-1',
              },
            },
          ]),
        })),
      })),
      update: vi.fn().mockImplementationOnce(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning,
          })),
        })),
      })),
    };

    mocks.db.mockReturnValue({
      transaction: vi.fn(async (execute) => execute(tx)),
    });

    await updateAITaskById('task-1', {
      status: 'failed',
      creditId: 'credit-1',
    });

    expect(
      mocks.scheduleCreditBalanceChangeNotification
    ).not.toHaveBeenCalled();
  });

  it('updates task json payloads as structured jsonb values instead of string literals', async () => {
    const setSpy = vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'task-1',
            userId: 'user-1',
            status: 'processing',
            taskInfo: {
              status: 'processing',
              errorCode: 'OutputVideoSensitiveContentDetected',
            },
            taskResult: {
              error: {
                code: 'OutputVideoSensitiveContentDetected',
              },
            },
          },
        ]),
      })),
    }));

    const tx = {
      select: vi.fn(),
      update: vi.fn(() => ({
        set: setSpy,
      })),
    };

    mocks.db.mockReturnValue({
      transaction: vi.fn(async (execute) => execute(tx)),
    });

    await updateAITaskById('task-1', {
      status: 'processing',
      taskInfo: {
        status: 'processing',
        errorCode: 'OutputVideoSensitiveContentDetected',
      },
      taskResult: {
        error: {
          code: 'OutputVideoSensitiveContentDetected',
        },
      },
    });

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        taskInfo: {
          status: 'processing',
          errorCode: 'OutputVideoSensitiveContentDetected',
        },
        taskResult: {
          error: {
            code: 'OutputVideoSensitiveContentDetected',
          },
        },
      })
    );
  });
});
