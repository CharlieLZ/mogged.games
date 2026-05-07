// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  appendImageGeneratorGuestHistory,
  IMAGE_GENERATOR_GUEST_HISTORY_LIMIT,
  IMAGE_GENERATOR_GUEST_HISTORY_STORAGE_KEY,
  parseImageGeneratorGuestHistory,
  readImageGeneratorGuestHistory,
  writeImageGeneratorGuestHistory,
} from './image-generator-guest-history';

describe('image generator guest history', () => {
  it('parses only valid local guest image records', () => {
    expect(
      parseImageGeneratorGuestHistory(
        JSON.stringify([
          {
            id: 'item-1',
            url: 'https://cdn.example.com/a.png',
            mode: 'text-to-image',
            createdAt: '2026-05-03T00:00:00.000Z',
            prompt: 'A studio bottle',
          },
          {
            id: '',
            url: 'https://cdn.example.com/b.png',
            mode: 'text-to-image',
            createdAt: '2026-05-03T00:00:00.000Z',
          },
          {
            id: 'item-3',
            url: 'https://cdn.example.com/c.png',
            mode: 'text-to-video',
            createdAt: '2026-05-03T00:00:00.000Z',
          },
        ])
      )
    ).toStrictEqual([
      {
        id: 'item-1',
        url: 'https://cdn.example.com/a.png',
        mode: 'text-to-image',
        createdAt: '2026-05-03T00:00:00.000Z',
        prompt: 'A studio bottle',
        mimeType: undefined,
        model: undefined,
        provider: undefined,
        imageEditMode: 'single-edit',
        imageResolution: undefined,
        imageAspectRatio: undefined,
        imageOutputFormat: undefined,
        sourceImageUrls: undefined,
      },
    ]);
  });

  it('keeps newest generated guest images first and deduplicates by id', () => {
    const items = appendImageGeneratorGuestHistory(
      [
        {
          id: 'old-1',
          url: 'https://cdn.example.com/old.png',
          mode: 'text-to-image',
          createdAt: '2026-05-02T00:00:00.000Z',
        },
      ],
      [
        {
          id: 'old-1',
          url: 'https://cdn.example.com/new.png',
          type: 'image',
          prompt: 'new prompt',
        },
        {
          id: 'video-1',
          url: 'https://cdn.example.com/video.mp4',
          type: 'video',
        },
      ],
      {
        createdAt: new Date('2026-05-03T00:00:00.000Z'),
        mode: 'image-to-image',
        prompt: 'fallback prompt',
      }
    );

    expect(items).toStrictEqual([
      {
        id: 'old-1',
        url: 'https://cdn.example.com/new.png',
        mode: 'image-to-image',
        createdAt: '2026-05-03T00:00:00.000Z',
        mimeType: undefined,
        model: undefined,
        prompt: 'new prompt',
        provider: undefined,
        imageEditMode: undefined,
        imageResolution: undefined,
        imageAspectRatio: undefined,
        imageOutputFormat: undefined,
        sourceImageUrls: undefined,
      },
    ]);
  });

  it('persists a bounded local-only history list', () => {
    const storage = window.localStorage;
    storage.clear();

    const oversized = Array.from(
      { length: IMAGE_GENERATOR_GUEST_HISTORY_LIMIT + 2 },
      (_, index) => ({
        id: `item-${index}`,
        url: `https://cdn.example.com/${index}.png`,
        mode: 'text-to-image' as const,
        createdAt: '2026-05-03T00:00:00.000Z',
      })
    );

    writeImageGeneratorGuestHistory(storage, oversized);

    expect(
      JSON.parse(
        storage.getItem(IMAGE_GENERATOR_GUEST_HISTORY_STORAGE_KEY) || '[]'
      )
    ).toHaveLength(IMAGE_GENERATOR_GUEST_HISTORY_LIMIT);
    expect(readImageGeneratorGuestHistory(storage)).toHaveLength(
      IMAGE_GENERATOR_GUEST_HISTORY_LIMIT
    );
  });
});
