import { describe, expect, it } from 'vitest';

import {
  LEGACY_AI_PROVIDER_RETIRED_CODE,
  buildLegacyProviderRetiredUpdate,
} from './ai-legacy';

describe('buildLegacyProviderRetiredUpdate', () => {
  it('keeps historical task errors provider-neutral for end users', () => {
    const update = buildLegacyProviderRetiredUpdate({
      provider: 'apixo',
      model: 'seedance-2.0',
      status: 'processing',
      creditId: 'credit_123',
    } as any);

    expect(update.taskInfo).toMatchObject({
      errorCode: LEGACY_AI_PROVIDER_RETIRED_CODE,
      retiredProvider: 'apixo',
      retiredModel: 'seedance-2.0',
    });
    expect(update.taskResult).toMatchObject({
      code: LEGACY_AI_PROVIDER_RETIRED_CODE,
      provider: 'apixo',
      model: 'seedance-2.0',
      legacyProviderRetired: true,
    });
    expect((update.taskInfo as Record<string, unknown>).errorMessage).toBe(
      'This historical task belongs to a retired provider route. Stored results remain available, but new polling, retries, and fallback are no longer supported.'
    );
    expect((update.taskResult as Record<string, unknown>).error).toBe(
      'This historical task belongs to a retired provider route. Stored results remain available, but new polling, retries, and fallback are no longer supported.'
    );
  });
});
