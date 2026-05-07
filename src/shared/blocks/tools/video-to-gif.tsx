'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

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
import { publicPageMedia } from '@/shared/lib/public-page-sizing';

import { ensureUint8Array, fetchFile, getFFmpeg } from './ffmpeg';
import { FreeToolCommonCopy, VideoToGifCopy } from './types';
import { calcSaving, formatBytes, triggerDownload } from './utils';

type Status = 'idle' | 'processing' | 'ready';

type Props = {
  common: FreeToolCommonCopy;
  copy: VideoToGifCopy;
};

export function VideoToGifTool({ common, copy }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [outputPreview, setOutputPreview] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lengthSec, setLengthSec] = useState<number>(6);
  const [fps, setFps] = useState<number>(10);

  useEffect(
    () => () => {
      if (inputPreview) URL.revokeObjectURL(inputPreview);
      if (outputPreview) URL.revokeObjectURL(outputPreview);
    },
    [inputPreview, outputPreview]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('video/')) {
      setError(common.invalid_video);
      return;
    }

    if (inputPreview) URL.revokeObjectURL(inputPreview);
    if (outputPreview) URL.revokeObjectURL(outputPreview);

    setFile(selected);
    setInputPreview(URL.createObjectURL(selected));
    setOutputPreview(null);
    setOutputSize(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
  };

  const reset = () => {
    if (inputPreview) URL.revokeObjectURL(inputPreview);
    if (outputPreview) URL.revokeObjectURL(outputPreview);
    setFile(null);
    setInputPreview(null);
    setOutputPreview(null);
    setOutputSize(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
  };

  const handleConvert = async () => {
    if (!file) {
      setError(common.file_empty);
      return;
    }

    setStatus('processing');
    setProgress(5);
    setError(null);

    try {
      const ffmpeg = await getFFmpeg();
      const inputName = `input-${Date.now()}.video`;
      const outputName = 'output.gif';
      const progressHandler = ({ progress }: { progress: number }) => {
        setProgress(Math.min(99, Math.round((progress || 0) * 100)));
      };

      ffmpeg.on('progress', progressHandler);

      try {
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        const safeLength = Math.max(1, Math.min(30, Number(lengthSec) || 6));
        const safeFps = Math.max(2, Math.min(30, Number(fps) || 10));

        await ffmpeg.exec([
          '-i',
          inputName,
          '-t',
          `${safeLength}`,
          '-vf',
          `fps=${safeFps},scale=640:-1:flags=lanczos`,
          '-an',
          outputName,
        ]);

        const data = ensureUint8Array(await ffmpeg.readFile(outputName));
        const arrayBuffer = new Uint8Array(data).buffer;
        const blob = new Blob([arrayBuffer], { type: 'image/gif' });

        if (outputPreview) URL.revokeObjectURL(outputPreview);
        setOutputPreview(URL.createObjectURL(blob));
        setOutputSize(data.length);
        setStatus('ready');
        setProgress(100);
      } finally {
        ffmpeg.off('progress', progressHandler);
        await ffmpeg.deleteFile(inputName).catch(() => {});
        await ffmpeg.deleteFile(outputName).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      setError(common.generic_error);
      setStatus('idle');
      setProgress(0);
    }
  };

  const saving = calcSaving(file?.size, outputSize);
  const outputFileName = file
    ? `${file.name.replace(/\.[^/.]+$/, '') || 'clip'}.gif`
    : 'clip.gif';

  return (
    <Card className="mt-6">
      <CardHeader className="gap-2">
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="gif-video">{common.select_file}</Label>
            <Input
              id="gif-video"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">{common.drop_hint}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="length">{copy.length_label}</Label>
            <Input
              id="length"
              type="number"
              inputMode="numeric"
              min={1}
              max={30}
              value={lengthSec}
              onChange={(event) => setLengthSec(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="fps">{copy.fps_label}</Label>
            <Input
              id="fps"
              type="number"
              inputMode="numeric"
              min={2}
              max={30}
              value={fps}
              onChange={(event) => setFps(Number(event.target.value))}
            />
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
              <div className="col-span-2">
                <p className="text-muted-foreground">{common.saving}</p>
                <p className="font-medium">{saving ?? '-'}</p>
              </div>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleConvert}
                disabled={status === 'processing'}
              >
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
              <div className={publicPageMedia.toolPreviewFrame}>
                <Image
                  src={outputPreview}
                  alt={common.gif_preview}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="rounded-lg object-contain"
                  unoptimized
                />
              </div>
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
