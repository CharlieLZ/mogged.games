// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LandingR2VideoShowcase } from '@/themes/default/blocks/landing-r2-video-showcase';

async function renderLandingR2VideoShowcase(locale = 'en') {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(LandingR2VideoShowcase, { locale }));
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

describe('LandingR2VideoShowcase', () => {
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

  it('renders a motion-first R2 showcase with muted looping videos', async () => {
    const rendered = await renderLandingR2VideoShowcase();
    const section = rendered.container.querySelector(
      '[data-slot="landing-r2-showcase"]'
    );
    const marqueeRows = rendered.container.querySelectorAll(
      '[data-slot="landing-r2-showcase-marquee-row"]'
    );
    const card = rendered.container.querySelector(
      '[data-slot="landing-r2-showcase-card"]'
    );
    const title = rendered.container.querySelector('h2');
    const description = rendered.container.querySelector('p');
    const video = rendered.container.querySelector(
      '[data-slot="landing-r2-showcase-video"]'
    ) as HTMLVideoElement | null;

    expect(section?.textContent).toContain(
      'See what mogged can create'
    );
    expect(section?.textContent).toContain(
      'Motion-first examples pulled from the latest mogged showcase library.'
    );
    expect(section?.textContent).not.toContain('R2 showcase');
    expect(section?.textContent).not.toContain('R2 sample');
    expect(section?.textContent).not.toContain('Example');
    expect(section?.textContent).not.toContain('1 / 21');
    expect(section?.textContent).not.toContain(
      'Looping motion sample sourced from the current mogged landing showcase upload set.'
    );
    expect(marqueeRows).toHaveLength(2);
    expect(marqueeRows[0]?.getAttribute('data-direction')).toBe('forward');
    expect(marqueeRows[1]?.getAttribute('data-direction')).toBe('reverse');
    expect(section?.className).toContain('bg-muted/20');
    expect(section?.className).toContain('py-10');
    expect(section?.className).toContain('md:py-16');
    expect(title?.className).toContain('text-2xl');
    expect(title?.className).toContain('md:text-[1.75rem]');
    expect(description?.className).toContain('text-sm');
    expect(description?.className).toContain('md:text-base');
    expect(card?.className).toContain('w-[min(88vw,24rem)]');
    expect(video).not.toBeNull();
    expect(video?.autoplay).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
    expect(video?.getAttribute('src')).toContain('example');

    await rendered.unmount();
  });

  it('renders localized showcase copy for arabic rollout pages', async () => {
    const rendered = await renderLandingR2VideoShowcase('ar');
    const section = rendered.container.querySelector(
      '[data-slot="landing-r2-showcase"]'
    );

    expect(section?.textContent).toContain(
      'شاهد ما الذي يمكن أن يصنعه mogged'
    );
    expect(section?.textContent).toContain(
      'أمثلة تركّز على الحركة ومأخوذة من أحدث مكتبة عروض mogged.'
    );

    await rendered.unmount();
  });
});
