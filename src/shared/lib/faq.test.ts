import { describe, expect, it } from 'vitest';

import { getFaqItems, getFaqSchemaQuestions } from './faq';

describe('faq helpers', () => {
  const faq = {
    categories: [
      {
        title: 'About',
        items: [
          {
            question: 'What is mogged?',
            answer: 'The public AI video generator.',
          },
          {
            question: 'What workflows are supported?',
            answer: 'Text, image, and reference to video.',
          },
        ],
      },
      {
        title: 'Pricing',
        items: [
          {
            question: 'Do browser tools consume credits?',
            answer: 'No, they stay local.',
          },
          {
            question: 'How do I contact support?',
            answer: 'Email support.',
          },
        ],
      },
    ],
    items: [
      {
        question: 'What is mogged?',
        answer: 'Duplicate should be ignored.',
      },
    ],
  };

  it('keeps faq item flattening deduped across categories and root items', () => {
    expect(getFaqItems(faq)).toHaveLength(4);
  });

  it('builds faq schema questions from selected groups with an upper bound', () => {
    expect(
      getFaqSchemaQuestions(faq, {
        groupIndexes: [0, 1],
        maxItems: 3,
      })
    ).toEqual([
      {
        question: 'What is mogged?',
        answer: 'The public AI video generator.',
      },
      {
        question: 'What workflows are supported?',
        answer: 'Text, image, and reference to video.',
      },
      {
        question: 'Do browser tools consume credits?',
        answer: 'No, they stay local.',
      },
    ]);
  });
});
