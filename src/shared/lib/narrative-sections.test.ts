import { describe, expect, it } from 'vitest';

import {
  normalizeLandingNarrativeSections,
  normalizeNarrativeSection,
} from './narrative-sections';

describe('narrative sections', () => {
  it('trims narrative headings and removes empty items', () => {
    const section = normalizeNarrativeSection({
      label: '  Audience  ',
      title: '  What users need  ',
      description: '  Solve the real job first.  ',
      items: [
        {
          title: '  Design teams  ',
          description: '  Keep layouts stable.  ',
        },
        {
          title: '   ',
          description: '   ',
        },
      ],
    });

    expect(section?.label).toBe('Audience');
    expect(section?.title).toBe('What users need');
    expect(section?.description).toBe('Solve the real job first.');
    expect(section?.items).toHaveLength(1);
    expect(section?.items?.[0]?.title).toBe('Design teams');
  });

  it('normalizes landing sections without dropping valid faq entries', () => {
    const page = normalizeLandingNarrativeSections({
      faq: {
        title: ' FAQ ',
        items: [
          {
            question: ' What is mogged? ',
            answer: ' A multimodal reasoning model. ',
          },
        ],
      },
    });

    expect(page.faq?.title).toBe('FAQ');
    expect(page.faq?.items?.[0]?.question).toBe('What is mogged?');
    expect(page.faq?.items?.[0]?.answer).toBe('A multimodal reasoning model.');
  });

  it('normalizes faq categories without dropping grouped entries', () => {
    const page = normalizeLandingNarrativeSections({
      faq: {
        title: ' FAQ ',
        categories: [
          {
            title: ' About mogged ',
            items: [
              {
                question: ' What is mogged? ',
                answer: ' The public homepage and hosted workspace. ',
              },
            ],
          },
        ],
      } as any,
    });

    expect(page.faq?.title).toBe('FAQ');
    expect((page.faq as any)?.categories?.[0]?.title).toBe(
      'About mogged'
    );
    expect((page.faq as any)?.categories?.[0]?.items?.[0]?.question).toBe(
      'What is mogged?'
    );
    expect((page.faq as any)?.categories?.[0]?.items?.[0]?.answer).toBe(
      'The public homepage and hosted workspace.'
    );
  });
});
