import { describe, expect, it } from 'vitest';

import {
  getReferenceImageUrlErrorMessage,
  getReferenceImageUrlIssue,
} from './reference-image-url';

describe('getReferenceImageUrlIssue', () => {
  it('allows direct image urls and uploaded storage urls', () => {
    expect(
      getReferenceImageUrlIssue('https://cdn.example.com/path/image.webp')
    ).toBeNull();
    expect(
      getReferenceImageUrlIssue(
        'https://mogged.games/api/storage/file?key=abc123'
      )
    ).toBeNull();
  });

  it('rejects cloud-drive, social share, and private links', () => {
    expect(
      getReferenceImageUrlIssue('https://drive.google.com/file/d/abc/view')
    ).toBe('cloud_drive_or_social');
    expect(
      getReferenceImageUrlIssue('https://x.com/example/status/123')
    ).toBe('cloud_drive_or_social');
    expect(
      getReferenceImageUrlIssue('http://localhost:3000/frame.png')
    ).toBe('private_host');
  });

  it('rejects video files and non-image attachments', () => {
    expect(
      getReferenceImageUrlIssue('https://cdn.example.com/clip.mp4')
    ).toBe('video');
    expect(
      getReferenceImageUrlIssue('https://cdn.example.com/archive.zip')
    ).toBe('non_image_attachment');
  });

  it('rejects invalid or unsupported urls with a stable message', () => {
    const invalidIssue = getReferenceImageUrlIssue('not-a-url');
    const ftpIssue = getReferenceImageUrlIssue('ftp://example.com/image.jpg');
    const privateIssue = getReferenceImageUrlIssue('http://192.168.1.10/frame.png');

    expect(invalidIssue).toBe('invalid');
    expect(ftpIssue).toBe('unsupported_protocol');
    expect(privateIssue).toBe('private_host');
    expect(getReferenceImageUrlErrorMessage(invalidIssue!)).toMatch(/http\(s\)/);
    expect(getReferenceImageUrlErrorMessage(ftpIssue!)).toMatch(/http\(s\)/);
    expect(getReferenceImageUrlErrorMessage(privateIssue!)).toMatch(/publicly reachable/);
  });
});
