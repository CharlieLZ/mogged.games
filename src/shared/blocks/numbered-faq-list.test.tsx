// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { NumberedFaqList } from './numbered-faq-list';

async function renderNumberedFaqList() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(NumberedFaqList, {
        items: [
          { question: '  What is included?  ', answer: '  A clean answer.  ' },
          { question: '', answer: 'Missing question.' },
          { question: 'Missing answer?', answer: '   ' },
          {
            question: 'How is it numbered?',
            answer: 'Only visible rows count.',
          },
        ],
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

describe('NumberedFaqList', () => {
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

  it('filters empty FAQ rows and keeps numbering contiguous', async () => {
    const rendered = await renderNumberedFaqList();
    const faqList = rendered.container.querySelector('[data-slot="faq-items"]');
    const faqItems = rendered.container.querySelectorAll(
      '[data-slot="faq-item"]'
    );
    const firstArticle = rendered.container.querySelector('article');
    const firstQuestion = rendered.container.querySelector('article h3');
    const firstAnswer = rendered.container.querySelector('article p');
    const faqNumbers = rendered.container.querySelectorAll(
      '[data-slot="faq-item-index"]'
    );
    const firstFaqNumber = faqNumbers[0];

    expect(faqItems).toHaveLength(2);
    expect(faqList?.className).toContain('gap-x-6');
    expect(faqList?.className).toContain('gap-y-6');
    expect(faqList?.className).toContain('md:gap-x-10');
    expect(faqList?.className).toContain('md:gap-y-8');
    expect(firstArticle?.className).toContain('flex');
    expect(firstArticle?.className).toContain('items-start');
    expect(firstArticle?.className).toContain('gap-3');
    expect(firstArticle?.className).toContain('md:gap-4');
    expect(firstFaqNumber?.className).toContain('h-9');
    expect(firstFaqNumber?.className).toContain('w-9');
    expect(firstFaqNumber?.className).toContain('md:h-10');
    expect(firstFaqNumber?.className).toContain('md:w-10');
    expect(firstFaqNumber?.className).toContain('text-[13px]');
    expect(firstQuestion?.className).toContain('text-sm');
    expect(firstQuestion?.className).toContain('md:text-[15px]');
    expect(firstAnswer?.className).toContain('text-[13px]');
    expect(firstAnswer?.className).toContain('md:text-sm');
    expect(Array.from(faqNumbers).map((node) => node.textContent)).toEqual([
      '1',
      '2',
    ]);
    expect(rendered.container.textContent).not.toContain('Missing question.');
    expect(rendered.container.textContent).not.toContain('Missing answer?');

    await rendered.unmount();
  });
});
