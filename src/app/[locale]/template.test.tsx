import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const getMessagesMock = vi.hoisted(() => vi.fn());
const getLocaleMock = vi.hoisted(() => vi.fn());
const providerPropsSpy = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => {
    providerPropsSpy(props);
    return createElement('div', { 'data-slot': 'intl-provider' }, children);
  },
}));

vi.mock('next-intl/server', () => ({
  getLocale: getLocaleMock,
  getMessages: getMessagesMock,
}));

import LocaleTemplate from './template';

describe('LocaleTemplate', () => {
  it('loads the current route message payload inside a remountable template', async () => {
    const messages = {
      ai: {
        video: {
          generator: {
            form: {
              panel_title: 'Video Generator',
            },
          },
        },
      },
    };

    getMessagesMock.mockResolvedValue(messages);
    getLocaleMock.mockResolvedValue('en');
    providerPropsSpy.mockReset();

    const element = await LocaleTemplate({
      children: createElement('main', null, 'workspace'),
    });

    expect(renderToStaticMarkup(element)).toContain('workspace');
    expect(getLocaleMock).toHaveBeenCalledTimes(1);
    expect(getMessagesMock).toHaveBeenCalledTimes(1);
    expect(providerPropsSpy).toHaveBeenCalledWith({
      locale: 'en',
      messages,
    });
  });
});
