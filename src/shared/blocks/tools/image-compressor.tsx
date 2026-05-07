'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

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
import { publicPageMedia } from '@/shared/lib/public-page-sizing';

import { FreeToolCommonCopy, ImageCompressorCopy } from './types';
import { calcSaving, formatBytes, triggerDownload } from './utils';

type Status = 'idle' | 'processing' | 'ready';
type ImageCompressionOptions = Parameters<typeof imageCompression>[1];

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

function getCompressedOutputFileName(
  file: File | null,
  outputMimeType?: string | null
) {
  const sourceName = file?.name?.replace(/\.[^/.]+$/, '') || 'compressed';
  const extension =
    (outputMimeType && MIME_EXTENSION_MAP[outputMimeType]) ||
    (file?.type && MIME_EXTENSION_MAP[file.type]) ||
    file?.name?.split('.').pop()?.toLowerCase() ||
    'jpg';

  return `${sourceName}.${extension}`;
}

type Props = {
  common: FreeToolCommonCopy;
  copy: ImageCompressorCopy;
};

export function ImageCompressorTool({ common, copy }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [outputPreview, setOutputPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(80);
  const [maxWidth, setMaxWidth] = useState<number | ''>(1600);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [outputMimeType, setOutputMimeType] = useState<string | null>(null);

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

    if (!selected.type.startsWith('image/')) {
      setError(common.invalid_image);
      return;
    }

    if (inputPreview) URL.revokeObjectURL(inputPreview);
    if (outputPreview) URL.revokeObjectURL(outputPreview);

    setFile(selected);
    setInputPreview(URL.createObjectURL(selected));
    setOutputPreview(null);
    setOutputSize(null);
    setOutputMimeType(null);
    setStatus('idle');
    setError(null);
  };

  const reset = () => {
    if (inputPreview) URL.revokeObjectURL(inputPreview);
    if (outputPreview) URL.revokeObjectURL(outputPreview);
    setFile(null);
    setInputPreview(null);
    setOutputPreview(null);
    setOutputSize(null);
    setOutputMimeType(null);
    setStatus('idle');
    setError(null);
  };

  const handleCompress = async () => {
    if (!file) {
      setError(common.file_empty);
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      const options: ImageCompressionOptions = {
        useWebWorker: true,
        initialQuality: quality / 100,
      };

      if (maxWidth && maxWidth > 0) {
        options.maxWidthOrHeight = maxWidth;
      }

      const compressed = await imageCompression(file, options);

      if (outputPreview) URL.revokeObjectURL(outputPreview);
      setOutputPreview(URL.createObjectURL(compressed));
      setOutputSize(compressed.size);
      setOutputMimeType(compressed.type || file.type);
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setError(common.generic_error);
      setStatus('idle');
    }
  };

  const saving = calcSaving(file?.size, outputSize);
  const outputFileName = getCompressedOutputFileName(file, outputMimeType);

  return (
    <Card className="mt-6">
      <CardHeader className="gap-2">
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="compressor-file">{common.select_file}</Label>
            <Input
              id="compressor-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">{common.drop_hint}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="quality">{copy.quality_label}</Label>
            <input
              id="quality"
              type="range"
              min={40}
              max={100}
              step={1}
              value={quality}
              onChange={(event) => setQuality(Number(event.target.value))}
              className="accent-primary w-full"
            />
            <p className="text-muted-foreground text-xs">{quality}%</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="max-width">{copy.max_width_label}</Label>
            <Input
              id="max-width"
              type="number"
              inputMode="numeric"
              value={maxWidth}
              onChange={(event) => {
                const value = event.target.value;
                setMaxWidth(value === '' ? '' : Number(value));
              }}
              placeholder="1600"
              min={0}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="bg-muted/30 rounded-xl border border-dashed p-4">
            <p className="text-foreground mb-2 text-sm font-medium">
              {file ? file.name : common.status_waiting}
            </p>
            {inputPreview ? (
              <div className={publicPageMedia.toolPreviewFrame}>
                <Image
                  src={inputPreview}
                  alt={common.original_preview}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="rounded-lg object-contain"
                  unoptimized
                />
              </div>
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

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleCompress}
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
              <div className={publicPageMedia.toolPreviewFrame}>
                <Image
                  src={inputPreview}
                  alt={common.original_preview}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="rounded-lg object-contain"
                  unoptimized
                />
              </div>
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
                  alt={common.compressed_preview}
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
