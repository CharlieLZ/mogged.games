import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPathname } from './browser';

const mocks = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: mocks.headersMock,
}));

describe('getPathname', () => {
  beforeEach(() => {
    mocks.headersMock.mockReset();
  });

  it('prefers the proxy pathname header when available', async () => {
    mocks.headersMock.mockResolvedValue({
      get: (key: string) =>
        key === 'x-pathname' ? '/ai-video-generator/image-to-video' : null,
    });

    await expect(getPathname()).resolves.toBe('/ai-video-generator/image-to-video');
  });

  it('falls back to the proxy url header when pathname is missing', async () => {
    mocks.headersMock.mockResolvedValue({
      get: (key: string) => {
        if (key === 'x-pathname') {
          return null;
        }

        if (key === 'x-url') {
          return 'https://mogged.games/ai-video-generator/reference-to-video?mode=reference-to-video';
        }

        return null;
      },
    });

    await expect(getPathname()).resolves.toBe(
      '/ai-video-generator/reference-to-video?mode=reference-to-video'
    );
  });

  it('returns null when no trusted routing headers exist', async () => {
    mocks.headersMock.mockResolvedValue({
      get: () => null,
    });

    await expect(getPathname()).resolves.toBeNull();
  });
});
