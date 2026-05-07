import { describe, expect, it } from 'vitest';

import {
  appendReferenceMediaUrl,
  getReferenceMediaUrlErrorMessage,
  getReferenceMediaUrlExtension,
  getReferenceMediaUrlIssue,
  isTrustedAssetReferenceMediaUrl,
  parseReferenceMediaUrlList,
  validateReferenceMediaUrlList,
} from './reference-media-url';

describe('reference media url helpers', () => {
  it('parses unique trimmed url lists and appends without duplication', () => {
    expect(
      parseReferenceMediaUrlList(
        ' https://cdn.example.com/a.png \n\nhttps://cdn.example.com/a.png\nhttps://cdn.example.com/b.png '
      )
    ).toEqual([
      'https://cdn.example.com/a.png',
      'https://cdn.example.com/b.png',
    ]);

    expect(
      appendReferenceMediaUrl(
        'https://cdn.example.com/a.png',
        'https://cdn.example.com/a.png'
      )
    ).toBe('https://cdn.example.com/a.png');
  });

  it('allows direct public media urls and uploaded storage urls', () => {
    expect(
      getReferenceMediaUrlIssue('https://cdn.example.com/frame.webp', 'image')
    ).toBeNull();
    expect(
      getReferenceMediaUrlIssue('https://cdn.example.com/clip.mp4', 'video')
    ).toBeNull();
    expect(
      getReferenceMediaUrlIssue(
        'https://mogged.games/api/storage/file?key=abc123',
        'audio'
      )
    ).toBeNull();
    expect(
      getReferenceMediaUrlExtension('https://cdn.example.com/clip.mp4?download=1')
    ).toBe('.mp4');
    expect(
      getReferenceMediaUrlExtension(
        'https://mogged.games/api/storage/file?key=abc123'
      )
    ).toBe('');
    expect(
      getReferenceMediaUrlIssue('asset://avatar/virtual-human-123', 'image')
    ).toBeNull();
    expect(
      isTrustedAssetReferenceMediaUrl('asset://avatar/virtual-human-123')
    ).toBe(true);
  });

  it('rejects private hosts and share pages for non-image references', () => {
    expect(
      getReferenceMediaUrlIssue(
        'https://drive.google.com/file/d/abc/view',
        'video'
      )
    ).toBe('cloud_drive_or_social');
    expect(
      getReferenceMediaUrlIssue('http://192.168.1.20/clip.mp4', 'video')
    ).toBe('private_host');
  });

  it('rejects mismatched media types and generic attachments', () => {
    expect(
      getReferenceMediaUrlIssue('https://cdn.example.com/reference.mov', 'audio')
    ).toBe('wrong_media_type');
    expect(
      getReferenceMediaUrlIssue('https://cdn.example.com/archive.zip', 'video')
    ).toBe('non_media_attachment');
    expect(
      getReferenceMediaUrlErrorMessage('private_host', 'video')
    ).toMatch(/publicly reachable/);
  });

  it('flags too many urls after dedupe', () => {
    const validation = validateReferenceMediaUrlList(
      [
        'https://cdn.example.com/1.mp4',
        'https://cdn.example.com/2.mp4',
        'https://cdn.example.com/2.mp4',
        'https://cdn.example.com/3.mp4',
        'https://cdn.example.com/4.mp4',
      ].join('\n'),
      'video',
      3
    );

    expect(validation.items).toHaveLength(4);
    expect(validation.issue).toEqual({
      code: 'too_many',
      maxCount: 3,
    });
  });
});
