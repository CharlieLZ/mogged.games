// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROMO_BANNER_SEEN_STORAGE_KEY } from '@/shared/lib/viewer-quota';

import { PromoBannerWrapper } from './promo-banner-wrapper';

const appContextState = vi.hoisted(() => ({
  user: null as
    | {
        credits?: {
          remainingCredits: number;
        };
      }
    | null,
}));

const viewerInfoState = vi.hoisted(() => ({
  viewerInfo: null as
    | {
        isGuest: boolean;
        guestQuota?: {
          remaining: number;
        } | null;
      }
    | null,
  useViewerInfo: vi.fn(),
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => appContextState,
}));

vi.mock('@/shared/hooks/use-viewer-info', () => ({
  useViewerInfo: viewerInfoState.useViewerInfo,
}));

async function renderPromoBannerWrapper() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <PromoBannerWrapper
        quotaLabel="Free Quota"
        quotaSuffix=""
        popoverTitle="Your free guest quota is ready"
        popoverBody="First-time visitors can test the product immediately."
        popoverFooter="This panel only appears once."
        quotaTotal={2}
      />
    );
  });

  return {
    container,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('PromoBannerWrapper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    appContextState.user = null;
    viewerInfoState.viewerInfo = null;
    viewerInfoState.useViewerInfo.mockClear();
    viewerInfoState.useViewerInfo.mockReturnValue({
      viewerInfo: viewerInfoState.viewerInfo,
      isLoading: false,
      refreshViewerInfo: vi.fn(),
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('shows the first-visit popover for five seconds, then keeps only the pill', async () => {
    const rendered = await renderPromoBannerWrapper();

    expect(
      rendered.container.querySelector('[data-slot="promo-banner-pill"]')
    ).not.toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="promo-banner-popover"]')
    ).not.toBeNull();
    expect(rendered.container.textContent).toContain('0/2');
    expect(rendered.container.textContent).toContain('Free Quota');
    expect(rendered.container.textContent).not.toContain('today');
    expect(localStorage.getItem(PROMO_BANNER_SEEN_STORAGE_KEY)).toBe(
      'showing'
    );

    await act(async () => {
      vi.advanceTimersByTime(4999);
    });

    expect(
      rendered.container.querySelector('[data-slot="promo-banner-popover"]')
    ).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(
      rendered.container.querySelector('[data-slot="promo-banner-pill"]')
    ).not.toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="promo-banner-popover"]')
    ).toBeNull();
    expect(localStorage.getItem(PROMO_BANNER_SEEN_STORAGE_KEY)).toBe('seen');

    await rendered.unmount();
  });

  it('skips the popover after the first visit has already been recorded', async () => {
    localStorage.setItem(PROMO_BANNER_SEEN_STORAGE_KEY, 'seen');

    const rendered = await renderPromoBannerWrapper();

    expect(
      rendered.container.querySelector('[data-slot="promo-banner-pill"]')
    ).not.toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="promo-banner-popover"]')
    ).toBeNull();

    await rendered.unmount();
  });

  it('shows the Free Quota pill for signed-in users', async () => {
    appContextState.user = {
      credits: {
        remainingCredits: 12,
      },
    };

    const rendered = await renderPromoBannerWrapper();

    expect(
      rendered.container.querySelector('[data-slot="promo-banner-pill"]')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('does not fetch viewer info from the global header promo banner', async () => {
    const rendered = await renderPromoBannerWrapper();

    expect(
      rendered.container.querySelector('[data-slot="promo-banner-pill"]')
    ).not.toBeNull();
    expect(viewerInfoState.useViewerInfo).not.toHaveBeenCalled();

    await rendered.unmount();
  });

  it('keeps the configured quota total without waiting for a viewer snapshot', async () => {
    const originalMatchMedia = window.matchMedia;
    const matchMedia = vi.fn(
      () =>
        ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMedia,
    });

    const rendered = await renderPromoBannerWrapper();

    try {
      expect(rendered.container.textContent).toContain('2/2');
    } finally {
      await rendered.unmount();
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('shows the Free Quota pill when the user has account credits', async () => {
    appContextState.user = {
      credits: {
        remainingCredits: 120,
      },
    };

    const rendered = await renderPromoBannerWrapper();

    expect(
      rendered.container.querySelector('[data-slot="promo-banner-pill"]')
    ).not.toBeNull();

    await rendered.unmount();
  });
});
