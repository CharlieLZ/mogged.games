// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageTaskHistoryPanel } from './image-task-history-panel';

const translationMap: Record<string, string> = {
  recent_tasks_title: 'Recent Tasks',
  recent_tasks_count: '({shown}/{total})',
  recent_tasks_empty: 'Your recent generated images will appear here.',
  recent_tasks_guest_empty:
    'Generated guest images will appear here on this browser.',
  recent_tasks_loading: 'Loading recent tasks...',
  guest_history_notice:
    'Anonymous results are saved only in this browser. They will not sync into your account after sign-in, and clearing browser data or switching devices can remove them. Download anything important.',
  recent_tasks_prompt_empty: 'Untitled prompt',
  recent_tasks_copy_prompt: 'Copy prompt',
  recent_tasks_download: 'Download',
  recent_tasks_preview: 'Expand',
  recent_tasks_reprompt: 'Reprompt',
  recent_tasks_regenerate: 'Regenerate',
  recent_tasks_upscale: 'Upscale',
  recent_tasks_delete: 'Delete',
  status_success: 'Success',
  status_failed: 'Failed',
  status_canceled: 'Canceled',
  status_processing: 'Processing',
  status_pending: 'Pending',
};

vi.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      if (key === 'recent_tasks_count') {
        return `(${values?.shown ?? 0}/${values?.total ?? 0})`;
      }

      return (
        translationMap[key.replace(/\./g, '_')] ??
        translationMap[key] ??
        key
      );
    },
}));

vi.mock('@/shared/blocks/common/lazy-image', () => ({
  LazyImage: ({
    alt,
    className,
    src,
  }: {
    alt: string;
    className?: string;
    src: string;
  }) => createElement('img', { alt, className, src }),
}));

async function renderPanel({
  entries = [],
  isGuestHistory = true,
  isLoading = false,
  total = 0,
}: {
  entries?: Parameters<typeof ImageTaskHistoryPanel>[0]['entries'];
  isGuestHistory?: boolean;
  isLoading?: boolean;
  total?: number;
} = {}) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(ImageTaskHistoryPanel, {
        entries,
        total,
        isGuestHistory,
        isLoading,
        deletingTaskId: null,
        downloadingMediaId: null,
        onCopyPrompt: vi.fn(),
        onDownload: vi.fn(),
        onReprompt: vi.fn(),
        onRegenerate: vi.fn(),
        onUpscale: vi.fn(),
        onDelete: vi.fn(),
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

describe('ImageTaskHistoryPanel', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders guest history as a layered shell with separate notice and empty state blocks', async () => {
    const rendered = await renderPanel();

    const panel = rendered.container.querySelector(
      '[data-slot="recent-tasks-panel"]'
    );
    const countBadge = rendered.container.querySelector(
      '[data-slot="recent-tasks-count"]'
    );
    const notice = rendered.container.querySelector(
      '[data-slot="recent-tasks-guest-notice"]'
    );
    const emptyState = rendered.container.querySelector(
      '[data-slot="recent-tasks-empty-state"]'
    );

    expect(panel).not.toBeNull();
    expect(countBadge?.textContent).toBe('(0/0)');
    expect(notice?.textContent).toContain(
      'Anonymous results are saved only in this browser.'
    );
    expect(emptyState?.textContent).toContain(
      'Generated guest images will appear here on this browser.'
    );
    expect(notice?.contains(emptyState as Node)).toBe(false);

    await rendered.unmount();
  });

  it('renders account empty states without the guest-history notice block', async () => {
    const rendered = await renderPanel({
      isGuestHistory: false,
    });

    expect(
      rendered.container.querySelector('[data-slot="recent-tasks-guest-notice"]')
    ).toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="recent-tasks-empty-state"]')
        ?.textContent
    ).toContain('Your recent generated images will appear here.');

    await rendered.unmount();
  });
});
