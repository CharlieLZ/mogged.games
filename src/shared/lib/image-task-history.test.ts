import { describe, expect, it } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';

import {
  formatImageTaskHistoryTimestamp,
  mapAITaskToImageTaskHistoryEntry,
  mapGuestHistoryItemToImageTaskHistoryEntry,
} from './image-task-history';

describe('image task history mapping', () => {
  it('maps account ai tasks into reusable recent-task snapshots', () => {
    const entry = mapAITaskToImageTaskHistoryEntry({
      id: 'task-1',
      createdAt: new Date('2026-04-29T11:29:21.000Z'),
      status: AITaskStatus.SUCCESS,
      scene: 'image-to-image',
      prompt: 'Editorial portrait with warm sunlight',
      taskInfo: {
        images: ['https://cdn.example.com/generated.png'],
      },
      taskResult: null,
      options: {
        image_url: 'https://cdn.example.com/source.png',
        resolution: '2K',
        aspect_ratio: '4:3',
        output_format: 'png',
        edit_mode: 'single-edit',
      },
      model: 'gpt-image-1',
      provider: 'kie',
    } as never);

    expect(entry).toMatchObject({
      id: 'task-1',
      status: 'success',
      mode: 'image-to-image',
      prompt: 'Editorial portrait with warm sunlight',
      sourceImageUrls: ['https://cdn.example.com/source.png'],
      imageResolution: '2K',
      imageAspectRatio: '4:3',
      imageOutputFormat: 'png',
      imageEditMode: 'single-edit',
      provider: 'kie',
      media: [
        expect.objectContaining({
          url: 'https://cdn.example.com/generated.png',
          type: 'image',
        }),
      ],
    });
  });

  it('keeps guest history snapshots compatible with the shared recent-task model', () => {
    const entry = mapGuestHistoryItemToImageTaskHistoryEntry({
      id: 'guest-1',
      url: 'https://cdn.example.com/guest.png',
      mode: 'text-to-image',
      createdAt: '2026-04-29T11:29:21.000Z',
      prompt: 'Soft studio still life',
      imageResolution: '4K',
      imageAspectRatio: '16:9',
      imageOutputFormat: 'png',
    });

    expect(entry).toMatchObject({
      id: 'guest-1',
      status: 'success',
      mode: 'text-to-image',
      prompt: 'Soft studio still life',
      imageResolution: '4K',
      imageAspectRatio: '16:9',
      imageOutputFormat: 'png',
      media: [
        expect.objectContaining({
          url: 'https://cdn.example.com/guest.png',
          type: 'image',
        }),
      ],
    });
  });

  it('formats recent-task timestamps into a stable numeric string', () => {
    expect(formatImageTaskHistoryTimestamp('2026-04-29T11:29:21.000Z')).toMatch(
      /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/
    );
  });
});
