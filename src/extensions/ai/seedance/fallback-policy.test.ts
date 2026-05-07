import { describe, expect, it, vi } from 'vitest';

import {
  classifySeedanceFailure,
  shouldBlockSeedanceProviderFallback,
} from './fallback-policy';

vi.mock('server-only', () => ({}));

describe('Seedance fallback policy', () => {
  it('blocks fallback for content policy failures', () => {
    expect(
      classifySeedanceFailure({
        taskInfo: {
          errorCode: 'OutputVideoSensitiveContentDetected',
          errorMessage:
            'The request failed because the output video may contain sensitive information.',
        },
      })
    ).toMatchObject({
      shouldFallback: false,
      category: 'content_policy',
      errorCode: 'OutputVideoSensitiveContentDetected',
    });
  });

  it('does not classify real-person reference restrictions as a blocked fallback category', () => {
    expect(
      classifySeedanceFailure({
        error: new Error(
          'The request failed because the input image may contain real person.'
        ),
      })
    ).toMatchObject({
      shouldFallback: false,
      category: 'unknown',
    });
  });

  it('blocks fallback for input validation failures', () => {
    expect(
      classifySeedanceFailure({
        error: new Error(
          'image_url must point directly to a public image file'
        ),
      })
    ).toMatchObject({
      shouldFallback: false,
      category: 'input_validation',
    });
  });

  it('allows fallback for retryable upstream failures', () => {
    expect(
      classifySeedanceFailure({
        taskResult: {
          error:
            'Volcengine query failed: upstream timeout, please try again later',
        },
      })
    ).toMatchObject({
      shouldFallback: true,
      category: 'provider_temporary',
    });
  });

  it('classifies provider auth failures separately from input validation', () => {
    expect(
      classifySeedanceFailure({
        error: Object.assign(new Error('Volcengine generate failed: 401 Unauthorized'), {
          httpStatus: 401,
          apiEndpoint:
            'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
        }),
      })
    ).toMatchObject({
      shouldFallback: true,
      category: 'provider_auth',
      apiEndpoint:
        'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
    });
  });

  it('classifies endpoint 404 failures separately from input validation', () => {
    expect(
      classifySeedanceFailure({
        error: Object.assign(new Error('Volcengine generate failed: 404 Not Found'), {
          httpStatus: 404,
          apiEndpoint:
            'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
        }),
      })
    ).toMatchObject({
      shouldFallback: true,
      category: 'provider_endpoint',
    });
  });

  it('classifies missing provider tasks separately from generic endpoint 404s', () => {
    expect(
      classifySeedanceFailure({
        taskInfo: {
          statusUrl:
            'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=missing-task',
          errorMessage: 'KIE query failed: task not found',
          errorCode: '404',
        },
      })
    ).toMatchObject({
      shouldFallback: false,
      category: 'provider_query_missing',
    });
  });

  it('keeps unknown failures local instead of cascading across providers', () => {
    expect(
      classifySeedanceFailure({
        taskResult: {
          error: 'provider rejected request',
        },
      })
    ).toMatchObject({
      shouldFallback: false,
      category: 'unknown',
    });
  });

  it('blocks only policy, validation, and config failures from cross-provider fallback', () => {
    expect(
      shouldBlockSeedanceProviderFallback({
        category: 'content_policy',
      })
    ).toBe(true);
    expect(
      shouldBlockSeedanceProviderFallback({
        category: 'provider_query_missing',
      })
    ).toBe(true);
    expect(
      shouldBlockSeedanceProviderFallback({
        category: 'unknown',
      })
    ).toBe(false);
  });
});
