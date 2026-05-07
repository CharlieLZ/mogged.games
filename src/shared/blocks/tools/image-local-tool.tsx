'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { publicPageMedia } from '@/shared/lib/public-page-sizing';

import {
  canvasToBlob,
  clampImageRect,
  getImageOutputFileName,
  getRotatedDimensions,
  isBrowserSafeImageSize,
  outputFormatMimeTypes,
  type ImageDimensions,
  type ImageOutputFormat,
  type ImageRect,
} from './image-processing';
import type { FreeToolCommonCopy, LocalImageToolCopy } from './types';
import { calcSaving, formatBytes, triggerDownload } from './utils';

type Status = 'idle' | 'processing' | 'ready';
type LocalImageToolMode = 'crop' | 'resize' | 'upscale' | 'rotate' | 'metadata';

type Props = {
  common: FreeToolCommonCopy;
  copy: LocalImageToolCopy;
  mode: LocalImageToolMode;
};

type LoadedImage = {
  image: HTMLImageElement;
  dimensions: ImageDimensions;
  previewUrl: string;
};

const formatLabels: Record<ImageOutputFormat, string> = {
  png: 'PNG',
  jpeg: 'JPG',
  webp: 'WEBP',
};

const defaultScales: Record<string, string> = {
  '2': '2x',
  '3': '3x',
  '4': '4x',
};

const defaultAngles: Record<string, string> = {
  '90': '90deg',
  '180': '180deg',
  '270': '270deg',
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
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function loadImageFile(file: File): Promise<LoadedImage> {
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const dimensions = {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };

  return {
    image,
    dimensions,
    previewUrl: URL.createObjectURL(file),
  };
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  return { canvas, ctx };
}

export function ImageLocalTool({ common, copy, mode }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<LoadedImage | null>(null);
  const [outputPreview, setOutputPreview] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [format, setFormat] = useState<ImageOutputFormat>('png');
  const [quality, setQuality] = useState(90);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<ImageRect>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const [targetSize, setTargetSize] = useState<ImageDimensions>({
    width: 1,
    height: 1,
  });
  const [lockAspect, setLockAspect] = useState(true);
  const [scale, setScale] = useState('2');
  const [angle, setAngle] = useState('90');
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const sourcePreviewRef = useRef<string | null>(null);
  const outputPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    sourcePreviewRef.current = source?.previewUrl ?? null;
  }, [source?.previewUrl]);

  useEffect(() => {
    outputPreviewRef.current = outputPreview;
  }, [outputPreview]);

  useEffect(
    () => () => {
      if (sourcePreviewRef.current) {
        URL.revokeObjectURL(sourcePreviewRef.current);
      }
      if (outputPreviewRef.current) {
        URL.revokeObjectURL(outputPreviewRef.current);
      }
    },
    []
  );

  const resetOutput = () => {
    if (outputPreview) URL.revokeObjectURL(outputPreview);
    setOutputPreview(null);
    setOutputSize(null);
    setStatus('idle');
  };

  const setLoadedImage = (loaded: LoadedImage, selected: File) => {
    if (source?.previewUrl) URL.revokeObjectURL(source.previewUrl);
    if (outputPreview) URL.revokeObjectURL(outputPreview);

    const { width, height } = loaded.dimensions;
    setFile(selected);
    setSource(loaded);
    setCropRect({
      x: 0,
      y: 0,
      width,
      height,
    });
    setTargetSize({ width, height });
    setOutputPreview(null);
    setOutputSize(null);
    setStatus('idle');
    setError(null);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError(common.invalid_image);
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      const loaded = await loadImageFile(selected);
      if (
        !isBrowserSafeImageSize(
          loaded.dimensions.width,
          loaded.dimensions.height
        )
      ) {
        URL.revokeObjectURL(loaded.previewUrl);
        setStatus('idle');
        setError(common.image_too_large);
        return;
      }

      setLoadedImage(loaded, selected);
    } catch (err) {
      console.error(err);
      setStatus('idle');
      setError(common.generic_error);
    }
  };

  const handleReset = () => {
    if (source?.previewUrl) URL.revokeObjectURL(source.previewUrl);
    if (outputPreview) URL.revokeObjectURL(outputPreview);
    setFile(null);
    setSource(null);
    setOutputPreview(null);
    setOutputSize(null);
    setError(null);
    setStatus('idle');
  };

  const updateCropRect = (patch: Partial<ImageRect>) => {
    if (!source) return;
    setCropRect((current) =>
      clampImageRect({ ...current, ...patch }, source.dimensions)
    );
    resetOutput();
  };

  const updateTargetWidth = (width: number) => {
    if (!source) return;
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = lockAspect
      ? Math.max(
          1,
          Math.round(
            (nextWidth / source.dimensions.width) * source.dimensions.height
          )
        )
      : targetSize.height;
    setTargetSize({ width: nextWidth, height: nextHeight });
    resetOutput();
  };

  const updateTargetHeight = (height: number) => {
    if (!source) return;
    const nextHeight = Math.max(1, Math.round(height));
    const nextWidth = lockAspect
      ? Math.max(
          1,
          Math.round(
            (nextHeight / source.dimensions.height) * source.dimensions.width
          )
        )
      : targetSize.width;
    setTargetSize({ width: nextWidth, height: nextHeight });
    resetOutput();
  };

  const buildOutputCanvas = () => {
    if (!source) {
      throw new Error('Missing source image');
    }

    if (mode === 'crop') {
      const rect = clampImageRect(cropRect, source.dimensions);
      const { canvas, ctx } = createCanvas(rect.width, rect.height);
      ctx.drawImage(
        source.image,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height
      );
      return canvas;
    }

    if (mode === 'resize' || mode === 'metadata') {
      const width =
        mode === 'metadata' ? source.dimensions.width : targetSize.width;
      const height =
        mode === 'metadata' ? source.dimensions.height : targetSize.height;
      if (!isBrowserSafeImageSize(width, height)) {
        throw new Error('Unsafe output dimensions');
      }
      const { canvas, ctx } = createCanvas(width, height);
      ctx.drawImage(source.image, 0, 0, width, height);
      return canvas;
    }

    if (mode === 'upscale') {
      const multiplier = Number(scale);
      const width = source.dimensions.width * multiplier;
      const height = source.dimensions.height * multiplier;
      if (!isBrowserSafeImageSize(width, height)) {
        throw new Error('Unsafe output dimensions');
      }
      const { canvas, ctx } = createCanvas(width, height);
      ctx.drawImage(source.image, 0, 0, width, height);
      return canvas;
    }

    const rotation = Number(angle);
    const rotated = getRotatedDimensions(
      source.dimensions.width,
      source.dimensions.height,
      rotation
    );
    if (!isBrowserSafeImageSize(rotated.width, rotated.height)) {
      throw new Error('Unsafe output dimensions');
    }
    const { canvas, ctx } = createCanvas(rotated.width, rotated.height);
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx.drawImage(
      source.image,
      -source.dimensions.width / 2,
      -source.dimensions.height / 2
    );
    return canvas;
  };

  const processImage = async () => {
    if (!source || !file) {
      setError(common.file_empty);
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      const canvas = buildOutputCanvas();
      const blob = await canvasToBlob(canvas, format, quality / 100);

      if (outputPreview) URL.revokeObjectURL(outputPreview);
      setOutputPreview(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setStatus('idle');
      setError(
        err instanceof Error && err.message === 'Unsafe output dimensions'
          ? common.invalid_dimensions
          : common.generic_error
      );
    }
  };

  const outputFileName = useMemo(
    () =>
      getImageOutputFileName(
        file,
        mode === 'metadata' ? 'clean' : mode,
        format
      ),
    [file, format, mode]
  );
  const saving = calcSaving(file?.size, outputSize);
  const scaleOptions = copy.scales || defaultScales;
  const angleOptions = copy.angles || defaultAngles;

  return (
    <Card className="mt-6">
      <CardHeader className="gap-2">
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(160px,220px)_minmax(160px,220px)]">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${mode}-file`}>{common.select_file}</Label>
            <Input
              id={`${mode}-file`}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">{common.drop_hint}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label>{common.output_format_label}</Label>
            <Select
              value={format}
              onValueChange={(value) =>
                setFormat(value as keyof typeof outputFormatMimeTypes)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(outputFormatMimeTypes) as ImageOutputFormat[]
                ).map((item) => (
                  <SelectItem key={item} value={item}>
                    {formatLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${mode}-quality`}>{common.quality_label}</Label>
            <input
              id={`${mode}-quality`}
              type="range"
              min={50}
              max={100}
              value={quality}
              onChange={(event) => {
                setQuality(Number(event.target.value));
                resetOutput();
              }}
              className="accent-primary w-full"
            />
            <p className="text-muted-foreground text-xs">{quality}%</p>
          </div>
        </div>

        {mode === 'crop' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label={copy.crop_x_label}
              value={cropRect.x}
              onChange={(value) => updateCropRect({ x: value })}
            />
            <NumberField
              label={copy.crop_y_label}
              value={cropRect.y}
              onChange={(value) => updateCropRect({ y: value })}
            />
            <NumberField
              label={copy.crop_width_label}
              value={cropRect.width}
              onChange={(value) => updateCropRect({ width: value })}
            />
            <NumberField
              label={copy.crop_height_label}
              value={cropRect.height}
              onChange={(value) => updateCropRect({ height: value })}
            />
          </div>
        ) : null}

        {mode === 'resize' ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <NumberField
              label={copy.width_label}
              value={targetSize.width}
              onChange={updateTargetWidth}
            />
            <NumberField
              label={copy.height_label}
              value={targetSize.height}
              onChange={updateTargetHeight}
            />
            <label className="text-muted-foreground flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={(event) => setLockAspect(event.target.checked)}
                className="accent-primary mb-3"
              />
              <span className="pb-2">{copy.lock_aspect_label}</span>
            </label>
          </div>
        ) : null}

        {mode === 'upscale' ? (
          <div className="max-w-xs">
            <Label>{copy.scale_label}</Label>
            <Select
              value={scale}
              onValueChange={(value) => {
                setScale(value);
                resetOutput();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(scaleOptions).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {mode === 'rotate' ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(160px,220px)_auto_auto]">
            <div>
              <Label>{copy.angle_label}</Label>
              <Select
                value={angle}
                onValueChange={(value) => {
                  setAngle(value);
                  resetOutput();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(angleOptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CheckboxField
              label={copy.flip_horizontal_label}
              checked={flipHorizontal}
              onChange={setFlipHorizontal}
            />
            <CheckboxField
              label={copy.flip_vertical_label}
              checked={flipVertical}
              onChange={setFlipVertical}
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="bg-muted/30 rounded-xl border border-dashed p-4">
            <p className="text-foreground mb-2 text-sm font-medium">
              {file ? file.name : common.status_waiting}
            </p>
            {source ? (
              <div className={publicPageMedia.toolPreviewFrame}>
                <Image
                  src={source.previewUrl}
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
              <Button onClick={processImage} disabled={status === 'processing'}>
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
                onClick={handleReset}
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

        <div className="bg-card rounded-xl border p-3">
          <p className="text-foreground mb-2 text-sm font-medium">
            {common.output_size}
          </p>
          {outputPreview ? (
            <div className={publicPageMedia.toolPreviewFrame}>
              <Image
                src={outputPreview}
                alt={common.edited_preview}
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
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Input
        type="number"
        min={1}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="text-muted-foreground flex items-end gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary mb-3"
      />
      <span className="pb-2">{label}</span>
    </label>
  );
}
