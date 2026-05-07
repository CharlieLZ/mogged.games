import { describe, expect, it } from 'vitest';

import { AIMediaType } from '@/extensions/ai/types';

import {
  findAIModelRule,
  getAIGenerationCostCredits,
  getGenerationSceneMediaType,
  getGuestRequestedModelForScene,
  getRequestedModelForScene,
  isAIGenerationScene,
  isGuestAllowedAIModel,
} from './ai-model-registry';

describe('ai model registry', () => {
  it('keeps image scenes in the allowed generation scene set', () => {
    expect(isAIGenerationScene('text-to-image')).toBe(true);
    expect(isAIGenerationScene('image-to-image')).toBe(true);
  });

  it('maps image scenes to image media type and the current KIE model split', () => {
    expect(getGenerationSceneMediaType('text-to-image')).toBe(
      AIMediaType.IMAGE
    );
    expect(getGenerationSceneMediaType('image-to-image')).toBe(
      AIMediaType.IMAGE
    );
    expect(getRequestedModelForScene('text-to-image')).toBe('nano-banana-2');
    expect(getRequestedModelForScene('image-to-image')).toBe(
      'google/nano-banana-edit'
    );
  });

  it('allows the standalone KIE image provider only for the image routes', () => {
    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'nano-banana-2',
        scene: 'text-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.VIDEO,
        model: 'nano-banana-2',
        scene: 'text-to-image',
      })
    ).toBeFalsy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'google/nano-banana-edit',
        scene: 'image-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'gpt-image-2-text-to-image',
        scene: 'text-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'seedream/5-lite-image-to-image',
        scene: 'image-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'google/nano-banana',
        scene: 'text-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'seedream/5-lite-text-to-image',
        scene: 'text-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'seedream/4.5-edit',
        scene: 'image-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'ideogram/v3-text-to-image',
        scene: 'text-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'ideogram/character',
        scene: 'image-to-image',
      })
    ).toBeTruthy();

    expect(
      findAIModelRule({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'ideogram/character',
        scene: 'text-to-image',
      })
    ).toBeFalsy();
  });

  it('keeps VIP KIE image models account-only for guest generation', () => {
    expect(getGuestRequestedModelForScene('text-to-image')).toBe(
      'gpt-image-2-text-to-image'
    );
    expect(getGuestRequestedModelForScene('image-to-image')).toBe(
      'gpt-image-2-image-to-image'
    );

    expect(
      isGuestAllowedAIModel({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'nano-banana-2',
        scene: 'text-to-image',
      })
    ).toBe(false);
    expect(
      isGuestAllowedAIModel({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        model: 'gpt-image-2-text-to-image',
        scene: 'text-to-image',
      })
    ).toBe(true);
  });

  it('prices image generation by selected KIE model and image resolution', () => {
    expect(
      getAIGenerationCostCredits('text-to-image', {
        resolution: '1K',
        model: 'nano-banana-2',
      })
    ).toBe(5);
    expect(
      getAIGenerationCostCredits('image-to-image', {
        resolution: '4K',
        model: 'nano-banana-2',
      })
    ).toBe(15);
    expect(
      getAIGenerationCostCredits('text-to-image', {
        resolution: '2K',
        model: 'nano-banana-pro',
      })
    ).toBe(18);
    expect(
      getAIGenerationCostCredits('text-to-image', {
        resolution: '4K',
        model: 'nano-banana-pro',
      })
    ).toBe(30);
    expect(
      getAIGenerationCostCredits('text-to-image', {
        resolution: '1K',
        model: 'gpt-image-2-text-to-image',
      })
    ).toBe(8);
    expect(
      getAIGenerationCostCredits('text-to-image', {
        resolution: '4K',
        model: 'gpt-image-2-text-to-image',
      })
    ).toBe(8);
    expect(
      getAIGenerationCostCredits('image-to-image', {
        resolution: '1K',
        model: 'seedream/5-lite-image-to-image',
      })
    ).toBe(4);
    expect(
      getAIGenerationCostCredits('image-to-image', {
        resolution: '4K',
        model: 'seedream/5-lite-image-to-image',
      })
    ).toBe(4);
  });
});
