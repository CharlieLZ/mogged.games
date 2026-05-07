// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('promo banner storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    localStorage.clear();
  });

  it('falls back to in-memory first-visit state when localStorage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage read blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage write blocked');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { claimPromoBannerFirstVisit, hasSeenPromoBanner, markPromoBannerSeen } =
      await import('./promo-banner.storage');

    expect(hasSeenPromoBanner()).toBe(false);
    expect(claimPromoBannerFirstVisit()).toBe(true);
    expect(claimPromoBannerFirstVisit()).toBe(false);

    markPromoBannerSeen();

    expect(hasSeenPromoBanner()).toBe(true);
  });

  it('blocks duplicate first-visit claims while the popover is already showing', async () => {
    const { claimPromoBannerFirstVisit, hasSeenPromoBanner, markPromoBannerSeen } =
      await import('./promo-banner.storage');

    expect(claimPromoBannerFirstVisit()).toBe(true);
    expect(hasSeenPromoBanner()).toBe(false);
    expect(claimPromoBannerFirstVisit()).toBe(false);

    markPromoBannerSeen();

    expect(hasSeenPromoBanner()).toBe(true);
    expect(claimPromoBannerFirstVisit()).toBe(false);
  });
});
