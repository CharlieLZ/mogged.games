// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageDetail } from '@/themes/default/blocks/page-detail';

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    createElement('a', { href, ...props }, children),
}));

async function renderPageDetail(overrides: { url?: string } = {}) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      await PageDetail({
        page: {
          id: 'terms',
          title: 'Terms of Service',
          description: 'Rules for using the hosted workspace.',
          created_at: '2026-04-01',
          updated_at: '2026-04-11',
          content: 'Body copy',
          url: overrides.url || '/terms-of-service',
        },
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

const localizedDateLabels = [
  {
    url: '/zh/terms-of-service',
    created: '发布于',
    updated: '最近更新',
  },
  {
    url: '/de/terms-of-service',
    created: 'Veröffentlicht',
    updated: 'Aktualisiert',
  },
  {
    url: '/fr/terms-of-service',
    created: 'Publié',
    updated: 'Mis à jour',
  },
  {
    url: '/es/terms-of-service',
    created: 'Publicado',
    updated: 'Actualizado',
  },
  {
    url: '/ja/terms-of-service',
    created: '公開日',
    updated: '更新日',
  },
  {
    url: '/it/terms-of-service',
    created: 'Pubblicato',
    updated: 'Aggiornato',
  },
  {
    url: '/ko/terms-of-service',
    created: '게시일',
    updated: '업데이트',
  },
  {
    url: '/ar/terms-of-service',
    created: 'نُشر في',
    updated: 'آخر تحديث',
  },
] as const;

describe('PageDetail block', () => {
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

  it('uses shared public-page top spacing instead of an extra top margin stack', async () => {
    const rendered = await renderPageDetail();
    const outer = rendered.container.querySelector('section > div');
    const intro = rendered.container.querySelector('section > div > div');
    const heading = rendered.container.querySelector('h1');
    const description = rendered.container.querySelector(
      'section > div > div > div:first-child > div'
    );
    const bodyShell = rendered.container.querySelector(
      'section > div > div > div:nth-child(2)'
    );

    expect(outer?.className).toContain(
      'pt-[var(--landing-page-top-space-mobile)]'
    );
    expect(outer?.className).toContain('pb-8');
    expect(outer?.className).toContain('md:pt-[var(--landing-page-top-space)]');
    expect(outer?.className).toContain('md:pb-10');
    expect(outer?.className).not.toContain('py-12');
    expect(outer?.className).not.toContain('md:py-16');
    expect(intro?.className).not.toContain('mt-8');
    expect(heading?.className).toContain('text-2xl');
    expect(heading?.className).toContain('lg:whitespace-nowrap');
    expect(heading?.className).not.toContain('text-[2.25rem]');
    expect(description?.className).toContain('text-sm');
    expect(description?.className).toContain('leading-6');
    expect(description?.className).not.toContain('text-pretty');
    expect(bodyShell?.className).toContain('rounded-lg');
    expect(bodyShell?.className).not.toContain('rounded-3xl');
    expect(rendered.container.textContent).toContain('Published');
    expect(rendered.container.textContent).toContain('Updated');

    await rendered.unmount();
  });

  it.each(localizedDateLabels)(
    'localizes public content date labels for $url',
    async ({ url, created, updated }) => {
      const rendered = await renderPageDetail({ url });

      expect(rendered.container.textContent).toContain(created);
      expect(rendered.container.textContent).toContain(updated);

      await rendered.unmount();
    }
  );
});
