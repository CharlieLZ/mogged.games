import { describe, expect, it } from 'vitest';

import { getVideoGeneratorErrorDescriptor } from './video-generator-error';

describe('image-error', () => {
  it('returns safety errors as translated keys', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'Request blocked by safety checker for NSFW content',
        errorCode: null,
        mode: 'text-to-video',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_nsfw_blocked',
    });
  });

  it('treats volcengine sensitive output blocks as safety errors', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'The request failed because the output video may contain sensitive information. Request id: 0217',
        errorCode: null,
        mode: 'text-to-video',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_nsfw_blocked',
    });
  });

  it('maps real-person reference blocks to the reference-unsupported key', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'The request failed because the input image may contain real person.',
        errorCode: null,
        mode: 'image-to-video',
        imageUrl: 'https://cdn.example.com/person.png',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_reference_unsupported',
    });
  });

  it('preserves direct validation messages verbatim', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'resolution must be 720p or 1080p',
        errorCode: null,
        mode: 'text-to-video',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'raw',
      message: 'resolution must be 720p or 1080p',
    });
  });

  it('maps image access failures to the image url access message', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'Failed to download image_url with status: 403',
        errorCode: null,
        mode: 'image-to-video',
        imageUrl: 'https://example.com/input.png',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_image_url_access',
    });
  });

  it('maps bare permission errors with active reference media to the image url access message', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'permission error',
        errorCode: null,
        mode: 'reference-to-video',
        imageUrl: 'https://example.com/reference.png',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_image_url_access',
    });
  });

  it('maps explicit upstream provider permission failures to the provider-unavailable key', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'This AI route is temporarily unavailable because an upstream provider rejected the request with a permission error.',
        errorCode: null,
        mode: 'reference-to-video',
        imageUrl: 'https://example.com/reference.png',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_provider_unavailable',
    });
  });

  it('maps non-safety 422 errors to input validation', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'unprocessable entity',
        errorCode: null,
        mode: 'text-to-video',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_input_validation',
    });
  });

  it('keeps unknown backend messages for generic rendering', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'provider temporarily unavailable',
        errorCode: null,
        mode: 'reference-to-video',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'generic',
      reason: 'provider temporarily unavailable',
    });
  });

  it('strips provider branding from generic backend reasons before rendering', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'Volcengine query failed: task not found',
        errorCode: null,
        mode: 'text-to-video',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'generic',
      reason: 'task not found',
    });
  });

  it('maps API provider-unavailable codes to translated keys', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'This AI route is temporarily unavailable because an upstream provider is not configured.',
        errorCode: 'ai_generate_provider_unavailable',
        mode: 'text-to-video',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_provider_unavailable',
    });
  });

  it('maps raw generate rate-limit messages to translated keys', () => {
    expect(
      getVideoGeneratorErrorDescriptor({
        raw: 'too many generate attempts, please slow down',
        errorCode: null,
        mode: 'text-to-video',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_rate_limited',
    });
  });
});
