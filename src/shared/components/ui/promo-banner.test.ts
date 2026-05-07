// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromoBanner } from './promo-banner';

async function renderPromoBanner(showPopover = true, quotaCurrent = 100) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(PromoBanner, {
        quotaLabel: 'Free Quota',
        quotaSuffix: '',
        quotaCurrent,
        quotaTotal: 100,
        popoverTitle: 'Early access gift',
        popoverBody:
          'Try mogged with 100 free guest credits before signing in.',
        popoverFooter: 'Your feedback helps shape what comes next.',
        showPopover,
      })
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

describe('PromoBanner', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders a compact header quota pill with an anchored first-visit popover', async () => {
    const rendered = await renderPromoBanner();
    const root = rendered.container.querySelector(
      '[data-slot="promo-banner-root"]'
    ) as HTMLDivElement | null;
    const pill = rendered.container.querySelector(
      '[data-slot="promo-banner-pill"]'
    ) as HTMLDivElement | null;
    const icon = rendered.container.querySelector(
      '[data-slot="promo-banner-icon"]'
    ) as HTMLDivElement | null;
    const progress = rendered.container.querySelector(
      '[data-slot="promo-banner-progress"]'
    ) as HTMLDivElement | null;
    const spark = rendered.container.querySelector(
      '[data-slot="promo-banner-spark"]'
    ) as HTMLDivElement | null;
    const popover = rendered.container.querySelector(
      '[data-slot="promo-banner-popover"]'
    );
    const popoverCard = rendered.container.querySelector(
      '[data-slot="promo-banner-popover-card"]'
    ) as HTMLDivElement | null;
    const popoverArrow = rendered.container.querySelector(
      '[data-slot="promo-banner-popover-arrow"]'
    ) as HTMLDivElement | null;
    const popoverArrowShape = rendered.container.querySelector(
      '[data-slot="promo-banner-popover-arrow-shape"]'
    ) as HTMLDivElement | null;
    const currentQuota = rendered.container.querySelector(
      '[data-slot="promo-banner-quota-current"]'
    ) as HTMLSpanElement | null;
    const quotaDivider = rendered.container.querySelector(
      '[data-slot="promo-banner-quota-divider"]'
    ) as HTMLSpanElement | null;
    const totalQuota = rendered.container.querySelector(
      '[data-slot="promo-banner-quota-total"]'
    ) as HTMLSpanElement | null;
    const hero = rendered.container.querySelector(
      '[data-slot="promo-banner-popover-hero"]'
    ) as HTMLDivElement | null;
    const popoverBody = rendered.container.querySelector(
      '[data-slot="promo-banner-popover-body"]'
    ) as HTMLParagraphElement | null;
    const popoverContent = rendered.container.querySelector(
      '[data-slot="promo-banner-popover-content"]'
    ) as HTMLDivElement | null;
    const reward = rendered.container.querySelector(
      '[data-slot="promo-banner-reward"]'
    ) as HTMLDivElement | null;
    const rewardCount = rendered.container.querySelector(
      '[data-slot="promo-banner-reward-count"]'
    ) as HTMLDivElement | null;
    const progressBar = progress?.firstElementChild as HTMLDivElement | null;
    const floatingStars = rendered.container.querySelectorAll(
      '[data-slot="promo-banner-floating-star"]'
    );

    expect(root).not.toBeNull();
    expect(root?.className).toContain('relative');
    expect(root?.className).toContain('inline-flex');
    expect(root?.className).not.toContain('fixed');
    expect(pill).not.toBeNull();
    expect(pill?.className).toContain('px-2');
    expect(pill?.className).toContain('py-1.5');
    expect(pill?.className).not.toContain('py-2');
    expect(icon?.className).toContain('size-6');
    expect(progress?.className).toContain('w-8');
    expect(spark?.className).toContain('size-6');
    expect(popover).not.toBeNull();
    expect(popover?.className).toContain('w-[min(20rem,calc(100vw-1rem))]');
    expect(popover?.className).not.toContain('18rem');
    expect(popover?.className).not.toContain('36rem');
    expect(popoverCard?.className).toContain('animate-promo-pop-in');
    expect(popoverCard?.className).not.toContain('tracking-tight');
    expect(popoverArrow?.className).toContain('left-1/2');
    expect(popoverArrowShape?.className).toContain(
      'animate-promo-arrow-bounce'
    );
    expect(hero).not.toBeNull();
    expect(hero?.className).toContain('px-4');
    expect(hero?.className).toContain('pt-3');
    expect(hero?.className).toContain('pb-3');
    expect(hero?.className).not.toContain('pt-4');
    expect(hero?.className).not.toContain('px-8');
    expect(hero?.className).toContain('text-center');
    expect(popoverBody?.className).toContain('leading-4');
    expect(popoverContent?.className).toContain('pt-3');
    expect(popoverContent?.className).toContain('pb-3');
    expect(reward).not.toBeNull();
    expect(rewardCount).not.toBeNull();
    expect(rewardCount?.className).toContain('text-3xl');
    expect(rewardCount?.className).not.toContain('text-6xl');
    expect(floatingStars.length).toBeGreaterThanOrEqual(3);
    expect(progressBar?.style.width).toBe('0%');
    expect(rendered.container.textContent).toContain('0/100');
    expect(currentQuota?.textContent).toBe('0');
    expect(currentQuota?.className).toContain('text-primary');
    expect(quotaDivider?.textContent).toBe('/');
    expect(quotaDivider?.className).toContain('text-muted-foreground');
    expect(totalQuota?.textContent).toBe('100');
    expect(totalQuota?.className).toContain('text-muted-foreground');
    expect(rendered.container.textContent).toContain('Early access gift');
    expect(rendered.container.textContent).toContain(
      'Your feedback helps shape what comes next.'
    );
    expect(rendered.container.textContent).toContain('Free Quota');
    expect(rendered.container.textContent).not.toContain('today');
    expect(
      rendered.container.querySelector('[data-slot="promo-banner-suffix"]')
    ).toBeNull();

    await rendered.unmount();
  });

  it('keeps only the quota pill when the one-time popover is not active', async () => {
    const rendered = await renderPromoBanner(false, 82);
    const root = rendered.container.querySelector(
      '[data-slot="promo-banner-root"]'
    ) as HTMLElement | null;

    expect(
      rendered.container.querySelector('[data-slot="promo-banner-pill"]')
    ).not.toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="promo-banner-popover"]')
    ).toBeNull();
    expect(root?.className).toContain('relative');

    await rendered.unmount();
  });

  it('starts the first visible quota number at zero so it can count up', async () => {
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1);
    const cancelAnimationFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    const rendered = await renderPromoBanner(false, 100);

    try {
      expect(requestAnimationFrame).toHaveBeenCalled();
      expect(rendered.container.textContent).toContain('0/100');
    } finally {
      await rendered.unmount();
      requestAnimationFrame.mockRestore();
      cancelAnimationFrame.mockRestore();
    }
  });
});
