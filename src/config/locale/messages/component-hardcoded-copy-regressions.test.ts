import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBannedPattern(banned: string) {
  if (banned.includes('=')) {
    return new RegExp(escapeRegExp(banned));
  }

  return new RegExp(`['"\`]${escapeRegExp(banned)}['"\`]`);
}

const FILE_ASSERTIONS = [
  {
    file: 'src/app/not-found.tsx',
    banned: ['Page not found', 'Back to Home'],
  },
  {
    file: 'src/app/[locale]/error.tsx',
    banned: [
      'This page failed to load',
      'Retry',
      'Back Home',
      'digest:',
    ],
  },
  {
    file: 'src/app/global-error.tsx',
    banned: [
      '<html lang="en">',
      'The app hit an unexpected error',
      'Try rendering this segment again.',
      'Retry',
    ],
  },
  {
    file: 'src/shared/blocks/generator/video-workspace.tsx',
    banned: [
      'Still processing on server. We keep polling, you can leave and check later.',
      'Task completed successfully',
      'Video generated successfully',
      'Failed to create a video task',
      'Insufficient credits. Please top up to keep creating.',
      'Please enter a prompt before generating.',
      'Video downloaded',
      'Failed to download video',
    ],
  },
  {
    file: 'src/shared/blocks/common/image-uploader.tsx',
    banned: [
      'Maximum number of images reached',
      'Upload failed:',
      'Upload failed',
      'Reference',
      'Uploading...',
      'Failed',
      'Upload',
    ],
  },
  {
    file: 'src/themes/default/blocks/subscribe.tsx',
    banned: ['subscribe failed', 'Enter your email', 'aria-label="submit"'],
  },
  {
    file: 'src/themes/default/blocks/header.tsx',
    banned: ['Close Menu', 'Open Menu'],
  },
  {
    file: 'src/shared/blocks/dashboard/top-nav.tsx',
    banned: ['Open menu', "header.brand?.title || 'Menu'"],
  },
  {
    file: 'src/shared/components/ui/carousel.tsx',
    banned: ['Previous slide', 'Next slide'],
  },
  {
    file: 'src/shared/components/ui/pagination.tsx',
    banned: ['Go to previous page', 'Go to next page', 'More pages'],
  },
  {
    file: 'src/shared/components/ui/sidebar.tsx',
    banned: [
      'Sidebar',
      'Displays the mobile sidebar.',
      'Toggle Sidebar',
    ],
  },
  {
    file: 'src/shared/components/ui/dialog.tsx',
    banned: ['Close'],
  },
  {
    file: 'src/shared/components/ui/sheet.tsx',
    banned: ['Close'],
  },
  {
    file: 'src/shared/components/ui/promo-banner.tsx',
    banned: ['Close banner'],
  },
  {
    file: 'src/shared/components/ui/breadcrumb.tsx',
    banned: ['aria-label="breadcrumb"', 'More'],
  },
  {
    file: 'src/shared/blocks/table/dropdown.tsx',
    banned: ['Open menu'],
  },
  {
    file: 'src/shared/blocks/common/support-email-link.tsx',
    banned: [
      'Copied ${email}. If your mail app did not open, you can paste it manually.',
      'Support email: ${email}. If your mail app is unavailable, copy it manually.',
    ],
  },
  {
    file: 'src/shared/blocks/table/copy.tsx',
    banned: ['Copied'],
  },
  {
    file: 'src/shared/components/ai-elements/reasoning.tsx',
    banned: ['Thinking...', 'Thought for a few seconds', 'Thought for {duration} seconds'],
  },
  {
    file: 'src/shared/components/ai-elements/sources.tsx',
    banned: ['Used {count} sources'],
  },
  {
    file: 'src/shared/blocks/tools/image-converter.tsx',
    banned: ['Input preview', 'Original preview', 'Converted preview'],
  },
  {
    file: 'src/shared/blocks/tools/image-compressor.tsx',
    banned: ['Original preview', 'Compressed preview'],
  },
  {
    file: 'src/shared/blocks/tools/video-thumbnail.tsx',
    banned: ['Thumbnail preview'],
  },
  {
    file: 'src/shared/blocks/tools/video-to-gif.tsx',
    banned: ['GIF preview'],
  },
  {
    file: 'src/shared/blocks/email/verification-code.tsx',
    banned: ['Verification Code', 'Your verification code is:'],
  },
] as const;

describe('component hardcoded copy regressions', () => {
  it('removes english hardcoded copy from critical pages and shared UI', () => {
    for (const assertion of FILE_ASSERTIONS) {
      const content = fs.readFileSync(
        path.join(process.cwd(), assertion.file),
        'utf8'
      );

      for (const banned of assertion.banned) {
        expect(
          content,
          `${assertion.file} contains string literal ${banned}`
        ).not.toMatch(getBannedPattern(banned));
      }
    }
  });
});
