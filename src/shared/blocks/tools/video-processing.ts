export type VideoTrimFormat = 'mp4' | 'webm';

export type VideoTrimRangeInput = {
  startSec: number;
  endSec: number;
  durationSec: number;
};

export type VideoTrimRange = {
  startSec: number;
  endSec: number;
  durationSec: number;
};

type BuildVideoTrimArgsOptions = {
  inputName: string;
  outputName: string;
  format: VideoTrimFormat;
  startSec: number;
  durationSec: number;
};

const MIN_TRIM_DURATION_SEC = 0.1;

function roundDuration(value: number) {
  return Math.round(value * 100) / 100;
}

function clampRangeValue(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function formatTrimTime(value: number) {
  return roundDuration(Math.max(0, value)).toFixed(2);
}

export function sanitizeVideoTrimRange({
  startSec,
  endSec,
  durationSec,
}: VideoTrimRangeInput): VideoTrimRange | null {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return null;
  }

  const boundedStart = roundDuration(clampRangeValue(startSec, 0, durationSec));
  const boundedEnd = roundDuration(clampRangeValue(endSec, 0, durationSec));

  if (boundedEnd - boundedStart < MIN_TRIM_DURATION_SEC) {
    return null;
  }

  return {
    startSec: boundedStart,
    endSec: boundedEnd,
    durationSec: roundDuration(boundedEnd - boundedStart),
  };
}

export function buildVideoTrimArgs({
  inputName,
  outputName,
  format,
  startSec,
  durationSec,
}: BuildVideoTrimArgsOptions) {
  const baseArgs = [
    '-ss',
    formatTrimTime(startSec),
    '-i',
    inputName,
    '-t',
    formatTrimTime(durationSec),
  ];

  if (format === 'webm') {
    return [
      ...baseArgs,
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '1M',
      '-c:a',
      'libvorbis',
      outputName,
    ];
  }

  return [
    ...baseArgs,
    '-preset',
    'veryfast',
    '-movflags',
    'faststart',
    '-pix_fmt',
    'yuv420p',
    outputName,
  ];
}
