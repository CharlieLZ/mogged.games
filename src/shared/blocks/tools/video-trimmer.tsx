'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

import { ensureUint8Array, fetchFile, getFFmpeg } from './ffmpeg';
import type { FreeToolCommonCopy, VideoTrimmerCopy } from './types';
import {
  buildVideoTrimArgs,
  sanitizeVideoTrimRange,
  type VideoTrimFormat,
} from './video-processing';
import { calcSaving, formatBytes, triggerDownload } from './utils';

type Props = {
  common: FreeToolCommonCopy;
  copy: VideoTrimmerCopy;
};

type Status = 'idle' | 'processing' | 'ready';

const videoMimeTypes: Record<VideoTrimFormat, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
};

function loadVideoDuration(src: string) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      video.src = '';
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    video.onerror = () => {
      video.src = '';
      reject(new Error('Failed to load video metadata'));
    };
    video.src = src;
  });
}

function formatSeconds(value?: number | null) {
  if (!value || !Number.isFinite(value)) {
    return '-';
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)}s`;
}

export function VideoTrimmerTool({ common, copy }: Props) {
  const formatKeys = useMemo(
    () => Object.keys(copy.formats) as VideoTrimFormat[],
    [copy.formats]
  );
  const [targetFormat, setTargetFormat] = useState<VideoTrimFormat>(
    formatKeys[0] || 'mp4'
  );
  const [file, setFile] = useState<File | null>(null);
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [outputPreview, setOutputPreview] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [startSec, setStartSec] = useState<number>(0);
  const [endSec, setEndSec] = useState<number>(6);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (inputPreview) URL.revokeObjectURL(inputPreview);
      if (outputPreview) URL.revokeObjectURL(outputPreview);
    },
    [inputPreview, outputPreview]
  );

  useEffect(() => {
    if (formatKeys.length > 0) {
      setTargetFormat(formatKeys[0]);
    }
  }, [formatKeys]);

  const outputFileName = useMemo(() => {
    const baseName = file?.name.replace(/\.[^/.]+$/, '') || 'trimmed';
    return `${baseName}-trimmed.${targetFormat}`;
  }, [file, targetFormat]);

  const reset = () => {
    if (inputPreview) URL.revokeObjectURL(inputPreview);
    if (outputPreview) URL.revokeObjectURL(outputPreview);

    setFile(null);
    setInputPreview(null);
    setOutputPreview(null);
    setOutputSize(null);
    setDurationSec(null);
    setStartSec(0);
    setEndSec(6);
    setStatus('idle');
    setProgress(0);
    setError(null);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }

    if (!selected.type.startsWith('video/')) {
      setError(common.invalid_video);
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      const previewUrl = URL.createObjectURL(selected);
      const loadedDuration = await loadVideoDuration(previewUrl);

      if (inputPreview) URL.revokeObjectURL(inputPreview);
      if (outputPreview) URL.revokeObjectURL(outputPreview);

      setFile(selected);
      setInputPreview(previewUrl);
      setOutputPreview(null);
      setOutputSize(null);
      setDurationSec(loadedDuration);
      setStartSec(0);
      setEndSec(Math.min(loadedDuration || 6, 6));
      setStatus('idle');
      setProgress(0);
    } catch (loadError) {
      console.error(loadError);
      setStatus('idle');
      setError(common.generic_error);
    }
  };

  const handleTrim = async () => {
    if (!file) {
      setError(common.file_empty);
      return;
    }

    const trimRange = sanitizeVideoTrimRange({
      startSec,
      endSec,
      durationSec: durationSec || 0,
    });

    if (!trimRange) {
      setError(copy.invalid_range_error);
      return;
    }

    setStatus('processing');
    setProgress(5);
    setError(null);

    try {
      const ffmpeg = await getFFmpeg();
      const inputName = `input-${Date.now()}.video`;
      const outputName = `trimmed.${targetFormat}`;
      const progressHandler = ({ progress }: { progress: number }) => {
        setProgress(Math.min(99, Math.round((progress || 0) * 100)));
      };

      ffmpeg.on('progress', progressHandler);

      try {
        await ffmpeg.writeFile(inputName, await fetchFile(file));
        await ffmpeg.exec(
          buildVideoTrimArgs({
            inputName,
            outputName,
            format: targetFormat,
            startSec: trimRange.startSec,
            durationSec: trimRange.durationSec,
          })
        );

        const data = ensureUint8Array(await ffmpeg.readFile(outputName));
        const normalizedData =
          data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
            ? data
            : data.slice();
        const buffer = (normalizedData.buffer as ArrayBuffer).slice(
          normalizedData.byteOffset,
          normalizedData.byteOffset + normalizedData.byteLength
        );
        const blob = new Blob([buffer], {
          type: videoMimeTypes[targetFormat],
        });

        if (outputPreview) URL.revokeObjectURL(outputPreview);
        setOutputPreview(URL.createObjectURL(blob));
        setOutputSize(normalizedData.length);
        setStatus('ready');
        setProgress(100);
      } finally {
        ffmpeg.off('progress', progressHandler);
        await ffmpeg.deleteFile(inputName).catch(() => {});
        await ffmpeg.deleteFile(outputName).catch(() => {});
      }
    } catch (trimError) {
      console.error(trimError);
      setError(common.generic_error);
      setStatus('idle');
      setProgress(0);
    }
  };

  const saving = calcSaving(file?.size, outputSize);

  return (
    <Card className="mt-6">
      <CardHeader className="gap-2">
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(120px,180px))]">
          <div className="flex flex-col gap-1">
            <Label htmlFor="trim-video">{common.select_file}</Label>
            <Input
              id="trim-video"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">{common.drop_hint}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="trim-start">{copy.start_time_label}</Label>
            <Input
              id="trim-start"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={startSec}
              onChange={(event) => setStartSec(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="trim-end">{copy.end_time_label}</Label>
            <Input
              id="trim-end"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={endSec}
              onChange={(event) => setEndSec(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>{common.output_format_label}</Label>
            <Select
              value={targetFormat}
              onValueChange={(value) => setTargetFormat(value as VideoTrimFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatKeys.map((format) => (
                  <SelectItem key={format} value={format}>
                    {copy.formats[format]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="bg-muted/30 rounded-xl border border-dashed p-4">
            <p className="text-foreground mb-2 text-sm font-medium">
              {file ? file.name : common.status_waiting}
            </p>
            {inputPreview ? (
              <video
                controls
                src={inputPreview}
                className="h-full max-h-[340px] w-full rounded-lg"
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {common.file_empty}
              </p>
            )}
          </div>

          <div className="bg-muted/30 space-y-3 rounded-xl border p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">{common.original_size}</p>
                <p className="font-medium">{formatBytes(file?.size)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{common.output_size}</p>
                <p className="font-medium">
                  {outputPreview ? formatBytes(outputSize) : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{copy.duration_label}</p>
                <p className="font-medium">{formatSeconds(durationSec)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{common.saving}</p>
                <p className="font-medium">{saving ?? '-'}</p>
              </div>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleTrim} disabled={status === 'processing'}>
                {status === 'processing' ? common.processing : copy.action}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  outputPreview &&
                  triggerDownload(outputPreview, outputFileName)
                }
                disabled={!outputPreview}
              >
                {common.download}
              </Button>
              <Button
                variant="ghost"
                onClick={reset}
                disabled={!file && !outputPreview}
              >
                {common.reset}
              </Button>
            </div>

            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {status === 'processing'
                  ? common.processing
                  : outputPreview
                    ? common.ready
                    : common.local_notice}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-card rounded-xl border p-3">
            <p className="text-foreground mb-2 text-sm font-medium">
              {common.original_size}
            </p>
            {inputPreview ? (
              <video
                controls
                src={inputPreview}
                className="aspect-[4/3] max-h-[22rem] w-full rounded-lg object-contain"
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {common.status_waiting}
              </p>
            )}
          </div>
          <div className="bg-card rounded-xl border p-3">
            <p className="text-foreground mb-2 text-sm font-medium">
              {common.output_size}
            </p>
            {outputPreview ? (
              <video
                controls
                src={outputPreview}
                className="aspect-[4/3] max-h-[22rem] w-full rounded-lg object-contain"
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {status === 'processing'
                  ? common.processing
                  : common.status_waiting}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
