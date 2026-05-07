// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let useViewerInfo: typeof import('./use-viewer-info').useViewerInfo;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function TestViewer({
  label,
  enabled = true,
}: {
  label: string;
  enabled?: boolean;
}) {
  const { viewerInfo, isLoading, refreshViewerInfo } = useViewerInfo({
    enabled,
  });

  return createElement(
    'button',
    {
      type: 'button',
      'data-label': label,
      'data-loading': String(isLoading),
      onClick: () => {
        void refreshViewerInfo();
      },
    },
    viewerInfo?.id || 'none'
  );
}

async function render(element: ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  return {
    container,
    async rerender(nextElement: ReactNode) {
      await act(async () => {
        root.render(nextElement);
      });
    },
    async click(selector: string) {
      const target = container.querySelector<HTMLElement>(selector);
      expect(target).not.toBeNull();

      await act(async () => {
        target?.click();
      });
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function createViewerResponse(id: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      code: 0,
      message: 'ok',
      data: {
        id,
        name: 'Guest Viewer',
        email: '',
        image: null,
        isGuest: true,
        credits: null,
        guestQuota: null,
      },
    }),
  } as Response;
}

describe('useViewerInfo', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ useViewerInfo } = await import('./use-viewer-info'));
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('deduplicates simultaneous initial viewer info requests', async () => {
    const firstRequest = deferred<Response>();
    const fetchMock = vi.fn(() => firstRequest.promise);
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await render(
      createElement(
        'div',
        null,
        createElement(TestViewer, { label: 'one' }),
        createElement(TestViewer, { label: 'two' })
      )
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstRequest.resolve(createViewerResponse('guest_1'));
      await firstRequest.promise;
    });

    expect(rendered.container.textContent).toContain('guest_1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await rendered.unmount();
  });

  it('uses the warm snapshot for new mounts but forces explicit refreshes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createViewerResponse('guest_1'))
      .mockResolvedValueOnce(createViewerResponse('guest_2'));
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await render(createElement(TestViewer, { label: 'one' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(rendered.container.textContent).toContain('guest_1');
    await rendered.unmount();

    const secondRendered = await render(
      createElement(TestViewer, { label: 'two' })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(secondRendered.container.textContent).toContain('guest_1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await secondRendered.click('[data-label="two"]');
    await act(async () => {
      await Promise.resolve();
    });

    expect(secondRendered.container.textContent).toContain('guest_2');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await secondRendered.unmount();
  });

  it('keeps passive viewer info snapshots warm across short remounts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T12:00:00.000Z'));

    const fetchMock = vi
      .fn()
      .mockResolvedValue(createViewerResponse('guest_1'));
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await render(createElement(TestViewer, { label: 'one' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(rendered.container.textContent).toContain('guest_1');
    await rendered.unmount();

    vi.setSystemTime(new Date('2026-05-03T12:00:05.000Z'));

    const secondRendered = await render(
      createElement(TestViewer, { label: 'two' })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(secondRendered.container.textContent).toContain('guest_1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await secondRendered.unmount();
  });

  it('retries one transient viewer info timeout without logging a recoverable error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(
        new DOMException('The operation timed out.', 'TimeoutError')
      )
      .mockResolvedValueOnce(createViewerResponse('guest_after_retry'));
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await render(createElement(TestViewer, { label: 'one' }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.container.textContent).toContain('guest_after_retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    await rendered.unmount();
  });

  it('does not retry non-retryable viewer info responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: 400, message: 'bad request' }),
    } as Response);
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await render(createElement(TestViewer, { label: 'one' }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.container.textContent).toContain('none');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[viewer-info] fetch failed',
      expect.objectContaining({
        attemptCount: 1,
        errorMessage: 'viewer info failed with status 400',
        errorName: 'Error',
        status: 400,
        step: 'fetch-viewer-info',
      })
    );

    await rendered.unmount();
  });

  it('treats empty viewer info JSON as a bounded retryable failure', async () => {
    const emptyJsonError = new SyntaxError('Unexpected end of JSON input');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw emptyJsonError;
      },
    } as unknown as Response);
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await render(createElement(TestViewer, { label: 'one' }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.container.textContent).toContain('none');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[viewer-info] fetch failed',
      expect.objectContaining({
        attemptCount: 2,
        errorMessage: 'viewer info returned invalid json',
        errorName: 'Error',
        status: 200,
        step: 'fetch-viewer-info',
      })
    );

    await rendered.unmount();
  });

  it('ignores stale responses after viewer info loading gets disabled', async () => {
    const inFlightRequest = deferred<Response>();
    const fetchMock = vi.fn(() => inFlightRequest.promise);
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await render(createElement(TestViewer, { label: 'one' }));

    expect(
      rendered.container.querySelector('[data-label="one"]')?.getAttribute(
        'data-loading'
      )
    ).toBe('true');

    await rendered.rerender(
      createElement(TestViewer, {
        label: 'one',
        enabled: false,
      })
    );

    expect(
      rendered.container.querySelector('[data-label="one"]')?.getAttribute(
        'data-loading'
      )
    ).toBe('false');

    await act(async () => {
      inFlightRequest.resolve(createViewerResponse('guest_after_disable'));
      await inFlightRequest.promise;
      await Promise.resolve();
    });

    expect(rendered.container.textContent).toContain('none');
    expect(rendered.container.textContent).not.toContain('guest_after_disable');

    await rendered.unmount();
  });

  it('does not update state after the viewer info component unmounts', async () => {
    const firstRequest = deferred<Response>();
    const fetchMock = vi.fn(() => firstRequest.promise);
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await render(createElement(TestViewer, { label: 'one' }));
    await rendered.unmount();

    await act(async () => {
      firstRequest.resolve(createViewerResponse('guest_after_unmount'));
      await firstRequest.promise;
      await Promise.resolve();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("hasn't mounted yet")
    );
  });
});
