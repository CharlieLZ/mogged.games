'use client';

import { useEffect, useMemo, useState } from 'react';
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
  buildPaletteCssVariables,
  buildPaletteJson,
  extractPaletteFromPixels,
  type PaletteSwatch,
} from './color-palette';
import type { FreeToolCommonCopy, ImageColorExtractorCopy } from './types';
import { formatBytes } from './utils';

type Props = {
  common: FreeToolCommonCopy;
  copy: ImageColorExtractorCopy;
};

type LoadedImage = {
  image: HTMLImageElement;
  previewUrl: string;
};

type Status = 'idle' | 'processing' | 'ready';

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

  return {
    image,
    previewUrl: URL.createObjectURL(file),
  };
}

function createAnalysisCanvas(image: HTMLImageElement) {
  const maxSide = 240;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height, 1));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas not supported');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  return context.getImageData(0, 0, width, height).data;
}

function formatRgb(rgb: [number, number, number]) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function ImageColorExtractorTool({ common, copy }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<LoadedImage | null>(null);
  const [palette, setPalette] = useState<PaletteSwatch[]>([]);
  const [paletteSize, setPaletteSize] = useState<string>(
    Object.keys(copy.palette_size_options)[0] || '6'
  );
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (source?.previewUrl) {
        URL.revokeObjectURL(source.previewUrl);
      }
    },
    [source]
  );

  const cssVariables = useMemo(
    () => buildPaletteCssVariables(palette),
    [palette]
  );
  const jsonPreview = useMemo(() => buildPaletteJson(palette), [palette]);
  const dominantSwatch = palette[0] || null;

  const handleReset = () => {
    if (source?.previewUrl) {
      URL.revokeObjectURL(source.previewUrl);
    }

    setFile(null);
    setSource(null);
    setPalette([]);
    setStatus('idle');
    setError(null);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }

    if (!selected.type.startsWith('image/')) {
      setError(common.invalid_image);
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      const loaded = await loadImageFile(selected);

      if (source?.previewUrl) {
        URL.revokeObjectURL(source.previewUrl);
      }

      setFile(selected);
      setSource(loaded);
      setPalette([]);
      setStatus('idle');
    } catch (loadError) {
      console.error(loadError);
      setStatus('idle');
      setError(common.generic_error);
    }
  };

  const handleExtract = async () => {
    if (!file || !source) {
      setError(common.file_empty);
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      const pixels = createAnalysisCanvas(source.image);
      const extractedPalette = extractPaletteFromPixels(pixels, {
        colorCount: Number(paletteSize) || 6,
      });

      setPalette(extractedPalette);
      setStatus('ready');
    } catch (processError) {
      console.error(processError);
      setStatus('idle');
      setError(common.generic_error);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="gap-2">
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px]">
          <div className="flex flex-col gap-1">
            <Label htmlFor="palette-image">{common.select_file}</Label>
            <Input
              id="palette-image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">{common.drop_hint}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label>{copy.palette_size_label}</Label>
            <Select
              value={paletteSize}
              onValueChange={(value) => {
                setPaletteSize(value);
                setPalette([]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(copy.palette_size_options).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

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
                <p className="text-muted-foreground">{copy.colors_found_label}</p>
                <p className="font-medium">{palette.length || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">
                  {copy.dominant_color_label}
                </p>
                <p className="font-medium">
                  {dominantSwatch
                    ? `${dominantSwatch.hex} · ${formatRgb(dominantSwatch.rgb)}`
                    : '-'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExtract} disabled={status === 'processing'}>
                {status === 'processing' ? common.processing : copy.action}
              </Button>
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={!file && palette.length === 0}
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
                  : palette.length > 0
                    ? common.ready
                    : common.local_notice}
              </p>
            )}
          </div>
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="text-foreground text-sm font-medium">
              {copy.palette_label}
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {palette.length > 0 ? (
              palette.map((swatch) => (
                <div
                  key={`${swatch.hex}-${swatch.population}`}
                  className="rounded-xl border"
                >
                  <div
                    className="rounded-t-xl px-4 py-5"
                    style={{
                      backgroundColor: swatch.hex,
                      color: swatch.textColor,
                    }}
                  >
                    <p className="text-sm font-semibold">{swatch.hex}</p>
                    <p className="text-xs opacity-90">{formatRgb(swatch.rgb)}</p>
                  </div>
                  <div className="bg-card space-y-1 rounded-b-xl px-4 py-3 text-sm">
                    <p className="text-muted-foreground">
                      {copy.colors_found_label}: {swatch.population}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">{common.status_waiting}</p>
            )}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-card rounded-xl border p-4">
            <p className="text-foreground mb-2 text-sm font-medium">
              {copy.css_variables_label}
            </p>
            <pre className="bg-muted/40 overflow-x-auto rounded-lg p-3 text-xs leading-relaxed">
              {cssVariables}
            </pre>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-foreground mb-2 text-sm font-medium">
              {copy.json_label}
            </p>
            <pre className="bg-muted/40 overflow-x-auto rounded-lg p-3 text-xs leading-relaxed">
              {jsonPreview}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
