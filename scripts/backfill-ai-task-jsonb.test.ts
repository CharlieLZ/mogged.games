import { describe, expect, it } from 'vitest';

import { buildLegacyAITaskJsonbPatch } from './backfill-ai-task-jsonb.shared';

describe('ai task jsonb backfill helpers', () => {
  it('builds a structured patch for legacy stringified json payloads', () => {
    expect(
      buildLegacyAITaskJsonbPatch({
        id: 'task-1',
        taskInfoRaw:
          '{"status":"failed","errorCode":"OutputVideoSensitiveContentDetected"}',
        taskResultRaw:
          '{"error":{"code":"OutputVideoSensitiveContentDetected"}}',
      })
    ).toEqual({
      taskInfo: {
        status: 'failed',
        errorCode: 'OutputVideoSensitiveContentDetected',
      },
      taskResult: {
        error: {
          code: 'OutputVideoSensitiveContentDetected',
        },
      },
    });
  });

  it('skips candidates whose string payloads are not valid structured json', () => {
    expect(
      buildLegacyAITaskJsonbPatch({
        id: 'task-2',
        taskInfoRaw: 'plain text',
        taskResultRaw: '',
      })
    ).toBeNull();
  });

  it('preserves arrays when legacy jsonb strings decode to arrays', () => {
    expect(
      buildLegacyAITaskJsonbPatch({
        id: 'task-3',
        taskInfoRaw: null,
        taskResultRaw:
          '[{"video_url":"https://cdn.example.com/output.mp4"}]',
      })
    ).toEqual({
      taskResult: [
        {
          video_url: 'https://cdn.example.com/output.mp4',
        },
      ],
    });
  });
});
