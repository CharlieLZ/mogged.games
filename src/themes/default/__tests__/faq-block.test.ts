// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FAQ } from '@/themes/default/blocks/faq';

vi.mock('@/shared/components/ui/scroll-animation', () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

vi.mock('@/shared/blocks/common/support-email-link', () => ({
  SupportEmailLink: ({
    children,
    email,
    className,
  }: {
    children: React.ReactNode;
    email: string;
    className?: string;
  }) => createElement('a', { href: `mailto:${email}`, className }, children),
}));

vi.mock('@/shared/lib/support-link', () => ({
  parseInlineMailtoAnchor: () => null,
}));

async function renderFaq() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(FAQ, {
        faq: {
          id: 'faq',
          title: 'Frequently Asked Questions',
          description: 'Direct answers before someone opens the workspace.',
          categories: [
            {
              title: 'About mogged',
              items: [
                {
                  question: 'What is mogged?',
                  answer:
                    'mogged is the public product for the hosted workspace and browser tools.',
                },
                {
                  question: 'How do I start?',
                  answer:
                    'Start from text-to-video, image-to-video, or reference-to-video from the homepage.',
                },
              ],
            },
            {
              title: 'Pricing & Credits',
              items: [
                {
                  question: 'Do browser tools consume credits?',
                  answer:
                    'No. Browser tools stay local and separate from hosted credits.',
                },
              ],
            },
          ],
        } as any,
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

describe('FAQ block', () => {
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

  it('renders FAQs as one numbered two-column list without category headings', async () => {
    const rendered = await renderFaq();
    const faqGroups = rendered.container.querySelectorAll(
      '[data-slot="faq-group"]'
    );
    const faqGroupTitles = rendered.container.querySelectorAll(
      '[data-slot="faq-group-title"]'
    );
    const faqItemsList = rendered.container.querySelector(
      '[data-slot="faq-items"]'
    );
    const faqItems = rendered.container.querySelectorAll('article');
    const faqNumbers = rendered.container.querySelectorAll(
      '[data-slot="faq-item-index"]'
    );

    expect(rendered.container.textContent).not.toContain(
      'About mogged'
    );
    expect(rendered.container.textContent).not.toContain('Pricing & Credits');
    expect(rendered.container.textContent).toContain(
      'mogged is the public product for the hosted workspace and browser tools.'
    );
    expect(rendered.container.textContent).toContain(
      'Start from text-to-video, image-to-video, or reference-to-video from the homepage.'
    );
    expect(rendered.container.textContent).toContain(
      'No. Browser tools stay local and separate from hosted credits.'
    );
    expect(faqGroups).toHaveLength(0);
    expect(faqGroupTitles).toHaveLength(0);
    expect(faqItemsList?.getAttribute('data-columns')).toBe('2');
    expect(faqItems).toHaveLength(3);
    expect(Array.from(faqNumbers).map((node) => node.textContent)).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(
      rendered.container.querySelector('[data-slot="accordion"]')
    ).toBeNull();

    await rendered.unmount();
  });
});
