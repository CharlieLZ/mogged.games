// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SocialAvatars } from '../blocks/social-avatars';

vi.mock('@/shared/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) =>
    createElement('span', { 'data-slot': 'avatar' }, children),
  AvatarImage: ({
    alt,
    src,
  }: {
    alt?: string;
    src?: string;
  }) => createElement('img', { 'data-slot': 'avatar-image', alt, src }),
}));

async function renderSocialAvatars() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(SocialAvatars, { tip: 'Proof from real users.' }));
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

describe('SocialAvatars', () => {
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

  it('uses the canonical public avatar assets', async () => {
    const rendered = await renderSocialAvatars();
    const avatarImages = [
      ...rendered.container.querySelectorAll('[data-slot="avatar-image"]'),
    ].map((image) => image.getAttribute('src'));

    expect(avatarImages).toEqual([
      '/images/avatars/1.png',
      '/images/avatars/2.png',
      '/images/avatars/3.png',
      '/images/avatars/4.png',
      '/images/avatars/5.png',
      '/images/avatars/6.png',
    ]);
    expect(avatarImages.every((src) => src?.startsWith('/images/avatars/'))).toBe(
      true
    );

    await rendered.unmount();
  });
});
