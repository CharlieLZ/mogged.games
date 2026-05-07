// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { publicPageMedia } from '@/shared/lib/public-page-sizing';

import { ImageCompressorTool } from './image-compressor';
import { ImageConverterTool } from './image-converter';
import type {
  FreeToolCommonCopy,
  ImageCompressorCopy,
  ImageConverterCopy,
} from './types';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    loader,
    priority: _priority,
    sizes: _sizes,
    src,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    loader?: (props: {
      quality?: number;
      src: string;
      width: number;
    }) => string;
    priority?: boolean;
    sizes?: string;
    src: string;
    unoptimized?: boolean;
  }) =>
    createElement('img', {
      alt,
      'data-fill': _fill ? 'true' : 'false',
      'data-loader-output': loader?.({ src, width: 640, quality: 75 }) ?? '',
      'data-unoptimized': unoptimized ? 'true' : 'false',
      src,
      ...props,
    }),
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

const commonCopy: FreeToolCommonCopy = {
  badge: 'Badge',
  change_file: 'Change file',
  compressed_preview: 'Compressed preview',
  converted_preview: 'Converted preview',
  download: 'Download',
  drop_hint: 'Drop hint',
  edited_preview: 'Edited preview',
  file_empty: 'Select an image',
  generic_error: 'Something went wrong',
  gif_preview: 'GIF preview',
  image_too_large: 'Image too large',
  input_preview: 'Input preview',
  invalid_dimensions: 'Invalid dimensions',
  invalid_image: 'Invalid image',
  invalid_video: 'Invalid video',
  local_notice: 'Local only',
  original_preview: 'Original preview',
  original_size: 'Original size',
  output_format_label: 'Output format',
  output_size: 'Output size',
  processing: 'Processing',
  quality_label: 'Quality',
  ready: 'Ready',
  reset: 'Reset',
  saving: 'Saving',
  select_file: 'Select file',
  status_waiting: 'Waiting for file',
  thumbnail_preview: 'Thumbnail preview',
  tips_title: 'Tips',
};

const compressorCopy: ImageCompressorCopy = {
  action: 'Compress',
  description: 'Compress images in the browser.',
  max_width_label: 'Max width',
  quality_label: 'Quality',
  title: 'Image Compressor',
};

const converterCopy: ImageConverterCopy = {
  action: 'Convert',
  description: 'Convert images in the browser.',
  formats: {
    png: 'PNG',
    webp: 'WEBP',
  },
  target_format_label: 'Target format',
  title: 'Image Converter',
};

function setFileInputValue(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });
}

async function renderCompressor() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(ImageCompressorTool, {
        common: commonCopy,
        copy: compressorCopy,
      })
    );
  });

  return {
    container,
    root,
  };
}

async function renderConverter() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(ImageConverterTool, {
        common: commonCopy,
        copy: converterCopy,
      })
    );
  });

  return {
    container,
    root,
  };
}

describe('free tool preview layout', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('uses the shared aspect-ratio preview frame for the compressor upload preview', async () => {
    const rendered = await renderCompressor();
    const fileInput = rendered.container.querySelector(
      '#compressor-file'
    ) as HTMLInputElement | null;

    expect(fileInput).not.toBeNull();

    await act(async () => {
      setFileInputValue(
        fileInput as HTMLInputElement,
        new File(['image'], 'sample.png', { type: 'image/png' })
      );
      fileInput?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const originalPreviews = rendered.container.querySelectorAll(
      'img[alt="Original preview"]'
    );
    const uploadPreviewFrame = originalPreviews[0]?.parentElement;

    expect(originalPreviews).toHaveLength(2);
    expect(originalPreviews[0]?.getAttribute('data-fill')).toBe('true');
    expect(uploadPreviewFrame?.className).toContain(
      publicPageMedia.toolPreviewFrame
    );
    expect(uploadPreviewFrame?.className).not.toContain('h-full');
    expect(uploadPreviewFrame?.className).toContain('aspect-[4/3]');

    await act(async () => {
      rendered.root.unmount();
    });
  });

  it('uses the shared aspect-ratio preview frame for the converter upload preview', async () => {
    const rendered = await renderConverter();
    const fileInput = rendered.container.querySelector(
      '#converter-file'
    ) as HTMLInputElement | null;

    expect(fileInput).not.toBeNull();

    await act(async () => {
      setFileInputValue(
        fileInput as HTMLInputElement,
        new File(['image'], 'sample.png', { type: 'image/png' })
      );
      fileInput?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const uploadPreview = rendered.container.querySelector(
      'img[alt="Input preview"]'
    );
    const uploadPreviewFrame = uploadPreview?.parentElement;

    expect(uploadPreview).not.toBeNull();
    expect(uploadPreview?.getAttribute('data-fill')).toBe('true');
    expect(uploadPreviewFrame?.className).toContain(
      publicPageMedia.toolPreviewFrame
    );
    expect(uploadPreviewFrame?.className).not.toContain('h-full');
    expect(uploadPreviewFrame?.className).toContain('aspect-[4/3]');

    await act(async () => {
      rendered.root.unmount();
    });
  });
});
