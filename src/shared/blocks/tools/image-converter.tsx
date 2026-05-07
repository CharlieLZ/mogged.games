'use client';

import { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { publicPageMedia } from '@/shared/lib/public-page-sizing';

import { FreeToolCommonCopy, ImageConverterCopy } from './types';
import { calcSaving, formatBytes, triggerDownload } from './utils';

type Status = 'idle' | 'processing' | 'ready';

type Props = {
  common: FreeToolCommonCopy;
  copy: ImageConverterCopy;
};

const mimeMap: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export function ImageConverterTool({ common, copy }: Props) {
  const formatKeys = useMemo(
    () => Object.keys(copy.formats || {}),
    [copy.formats]
  );
  const [targetFormat, setTargetFormat] = useState<string>(
    formatKeys[0] || 'webp'
  );
  const [file, setFile] = useState<File | null>(null);
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [outputPreview, setOutputPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  useEffect(() => {
    if (formatKeys.length) {
      setTargetFormat(formatKeys[0]);
    }
  }, [formatKeys]);

  useEffect(
    () => () => {
      if (inputPreview) URL.revokeObjectURL(inputPreview);
      if (outputPreview) URL.revokeObjectURL(outputPreview);
    },
    [inputPreview, outputPreview]
  );

  const outputFileName = useMemo(() => {
    if (!file) return `converted.${targetFormat}`;
    const base = file.name.replace(/\.[^/.]+$/, '');
    return `${base || 'converted'}.${targetFormat}`;
  }, [file, targetFormat]);

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
    setStatus('idle');
    setError(null);
  };

  const handleConvert = async () => {
    if (!file) {
      setError(common.file_empty);
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      const dataUrl = await readAsDataUrl(file);
      const img = await loadImage(dataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      ctx.drawImage(img, 0, 0);
      const mime = mimeMap[targetFormat] || 'image/png';

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => {
            if (value) {
              resolve(value);
            } else {
              reject(new Error('Conversion failed'));
            }
          },
          mime,
          mime === 'image/png' ? 1 : 0.9
        );
      });

      if (outputPreview) URL.revokeObjectURL(outputPreview);
      setOutputPreview(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setError(common.generic_error);
      setStatus('idle');
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="converter-file">{common.select_file}</Label>
            <Input
              id="converter-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">{common.drop_hint}</p>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{copy.target_format_label}</Label>
            <Select
              value={targetFormat}
              onValueChange={(value) => setTargetFormat(value)}
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
              <div className={publicPageMedia.toolPreviewFrame}>
                <NextImage
                  src={inputPreview}
                  alt={common.input_preview}
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
              <div className={publicPageMedia.toolPreviewFrame}>
                <NextImage
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
                <NextImage
                  src={outputPreview}
                  alt={common.converted_preview}
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
