import { describe, expect, it } from 'vitest';

import {
  buildVideoTrimArgs,
  sanitizeVideoTrimRange,
} from './video-processing';

describe('video processing helpers', () => {
  it('clamps trim ranges inside the source duration', () => {
    expect(
      sanitizeVideoTrimRange({
        startSec: -3,
        endSec: 25,
        durationSec: 12.4,
      })
    ).toEqual({
      startSec: 0,
      endSec: 12.4,
      durationSec: 12.4,
    });
  });

  it('rejects trim ranges that collapse to less than the minimum clip length', () => {
    expect(
      sanitizeVideoTrimRange({
        startSec: 8,
        endSec: 8.05,
        durationSec: 12,
      })
    ).toBeNull();
  });

  it('builds mp4 trim commands with bounded timestamps', () => {
    expect(
      buildVideoTrimArgs({
        inputName: 'input.video',
        outputName: 'trimmed.mp4',
        format: 'mp4',
        startSec: 1.25,
        durationSec: 4.5,
      })
    ).toEqual([
      '-ss',
      '1.25',
      '-i',
      'input.video',
      '-t',
      '4.50',
      '-preset',
      'veryfast',
      '-movflags',
      'faststart',
      '-pix_fmt',
      'yuv420p',
      'trimmed.mp4',
    ]);
  });

  it('builds webm trim commands with explicit video and audio codecs', () => {
    expect(
      buildVideoTrimArgs({
        inputName: 'input.video',
        outputName: 'trimmed.webm',
        format: 'webm',
        startSec: 0,
        durationSec: 2,
      })
    ).toEqual([
      '-ss',
      '0.00',
      '-i',
      'input.video',
      '-t',
      '2.00',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '1M',
      '-c:a',
      'libvorbis',
      'trimmed.webm',
    ]);
  });
});
