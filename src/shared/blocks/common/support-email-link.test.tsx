// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SupportEmailLink } from './support-email-link';

const testState = vi.hoisted(() => ({
  currentLocale: 'de',
  toastSuccess: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => testState.currentLocale,
}));

vi.mock('sonner', () => ({
  toast: {
    success: testState.toastSuccess,
  },
}));

async function renderLink() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(
        SupportEmailLink,
        { email: 'support@mogged.games' },
        'support@mogged.games'
      )
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

describe('SupportEmailLink', () => {
  beforeEach(() => {
    testState.toastSuccess.mockReset();
    testState.currentLocale = 'de';
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('shows localized copy feedback for live public locales', async () => {
    const rendered = await renderLink();
    const link = rendered.container.querySelector('a');

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });

    expect(testState.toastSuccess).toHaveBeenCalledWith(
      'support@mogged.games wurde kopiert. Falls dein Mailprogramm nicht aufgeht, kannst du die Adresse direkt einfügen.'
    );

    testState.currentLocale = 'ar';
    await rendered.unmount();

    const rerendered = await renderLink();
    const arabicLink = rerendered.container.querySelector('a');

    await act(async () => {
      arabicLink?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, button: 0 })
      );
    });

    expect(testState.toastSuccess).toHaveBeenCalledWith(
      'تم نسخ support@mogged.games. إذا لم يفتح تطبيق البريد، يمكنك لصقه يدويًا.'
    );

    await rerendered.unmount();
  });
});
