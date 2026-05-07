// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DurationTimeline } from './duration-timeline';

async function renderDurationTimeline(onValueChange = vi.fn()) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(DurationTimeline, {
        label: 'Duration',
        value: '15',
        min: 4,
        max: 15,
        onValueChange,
      })
    );
  });

  return {
    container,
    onValueChange,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('DurationTimeline', () => {
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

  it('renders the current duration with bounded endpoints', async () => {
    const rendered = await renderDurationTimeline();

    expect(rendered.container.textContent).toContain('Duration');
    expect(rendered.container.textContent).toContain('15s');
    expect(rendered.container.textContent).toContain('4s');

    await rendered.unmount();
  });

  it('emits updates from the underlying range input', async () => {
    const onValueChange = vi.fn();
    const rendered = await renderDurationTimeline(onValueChange);
    const input = rendered.container.querySelector('input[type="range"]');

    expect(input).not.toBeNull();

    await act(async () => {
      if (input instanceof HTMLInputElement) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;

        valueSetter?.call(input, '12');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    expect(onValueChange).toHaveBeenCalledWith('12');

    await rendered.unmount();
  });
});
