import { describe, expect, it } from 'vitest';

import {
  canUseImageModel,
  canUseImageModelKey,
  getCompatibleImageModelKey,
  getImageModelForMode,
  getImageModelOption,
  isImageModelI2iOnly,
  isImageModelT2iOnly,
  normalizeImageModelKeyForAccess,
} from './image-generator-config';

describe('image generator model config', () => {
  it('keeps model choices compatible with the active image workflow', () => {
    expect(isImageModelT2iOnly('ideogram-v3')).toBe(true);
    expect(isImageModelI2iOnly('ideogram-character')).toBe(true);

    expect(getCompatibleImageModelKey('ideogram-v3', 'image-to-image')).toBe(
      'nano-banana-2'
    );
    expect(
      getCompatibleImageModelKey('ideogram-character', 'text-to-image')
    ).toBe('nano-banana-2');
    expect(
      getCompatibleImageModelKey('ideogram-character', 'image-to-image')
    ).toBe('ideogram-character');
  });

  it('maps Ideogram Character only to the reference-image KIE model', () => {
    expect(getImageModelForMode('ideogram-character', 'image-to-image')).toBe(
      'ideogram/character'
    );
  });

  it('maps each image model to a stable brand logo family', () => {
    expect(getImageModelOption('nano-banana-2').brand).toBe('google');
    expect(getImageModelOption('gpt-image-2').brand).toBe('openai');
    expect(getImageModelOption('seedream-5').brand).toBe('bytedance');
    expect(getImageModelOption('flux-2-pro').brand).toBe('flux');
    expect(getImageModelOption('qwen-image').brand).toBe('alibaba');
    expect(getImageModelOption('z-image').brand).toBe('zai');
  });

  it('marks SeeDream 5.0 as the current new Bytedance image route', () => {
    expect(getImageModelOption('seedream-45').isNew).not.toBe(true);
    expect(getImageModelOption('seedream-5').isNew).toBe(true);
  });

  it('keeps VIP image models unavailable until the viewer is paid', () => {
    expect(canUseImageModelKey('nano-banana-2', 'guest')).toBe(false);
    expect(canUseImageModelKey('nano-banana-2', 'free')).toBe(false);
    expect(canUseImageModelKey('nano-banana-2', 'paid')).toBe(true);
    expect(canUseImageModelKey('nano-banana-2', undefined)).toBe(true);
    expect(canUseImageModel('nano-banana-2', 'free')).toBe(false);
    expect(canUseImageModel('nano-banana-2', undefined)).toBe(true);
    expect(canUseImageModel('gpt-image-2-text-to-image', 'free')).toBe(true);
    expect(normalizeImageModelKeyForAccess('nano-banana-2', 'free')).toBe(
      'gpt-image-2'
    );
    expect(normalizeImageModelKeyForAccess('nano-banana-2', undefined)).toBe(
      'nano-banana-2'
    );
  });
});
