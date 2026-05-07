import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children }: { children: unknown }) => children,
}));

import * as pageModule from './page';

describe('admin no-permission page', () => {
  it('stays runtime-rendered so admin guards do not break static prerendering', () => {
    expect(pageModule.dynamic).toBe('force-dynamic');
  });
});
