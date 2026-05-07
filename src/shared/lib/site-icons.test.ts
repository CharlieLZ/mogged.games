import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DEPRECATED_ICON_FILES,
  getSiteManifest,
  REQUIRED_ICON_FILES,
  REQUIRED_MANIFEST_SIZES,
  SITE_METADATA_ICONS,
} from './site-icons';

function readPublicJson<T>(relativePath: string): T {
  const absolutePath = path.join(process.cwd(), 'public', relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T;
}

function readPublicBuffer(relativePath: string) {
  const absolutePath = path.join(process.cwd(), 'public', relativePath);
  return fs.readFileSync(absolutePath);
}

function readIcoSquareSizes(relativePath: string) {
  const absolutePath = path.join(process.cwd(), 'public', relativePath);
  const buffer = fs.readFileSync(absolutePath);
  const iconCount = buffer.readUInt16LE(4);
  const sizes = new Set<number>();

  for (let index = 0; index < iconCount; index += 1) {
    const entryOffset = 6 + index * 16;
    const width = buffer.readUInt8(entryOffset) || 256;
    const height = buffer.readUInt8(entryOffset + 1) || 256;

    if (width === height) {
      sizes.add(width);
    }
  }

  return [...sizes].sort((left, right) => left - right);
}

function listFilesRelativeToPublic(
  directoryPath: string,
  relativePrefix = ''
): string[] {
  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .flatMap((entry): string[] => {
      const absolutePath = path.join(directoryPath, entry.name);
      const relativePath = path.join(relativePrefix, entry.name);

      if (entry.isDirectory()) {
        return listFilesRelativeToPublic(absolutePath, relativePath);
      }

      return [relativePath];
    });
}

describe('site icon assets', () => {
  it('defines crawler-safe runtime icon metadata', () => {
    const iconEntries = Array.isArray(SITE_METADATA_ICONS.icon)
      ? SITE_METADATA_ICONS.icon
      : [SITE_METADATA_ICONS.icon];
    const appleEntries = Array.isArray(SITE_METADATA_ICONS.apple)
      ? SITE_METADATA_ICONS.apple
      : [SITE_METADATA_ICONS.apple];

    expect(iconEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/favicon.ico' }),
        expect.objectContaining({
          url: '/favicon-48x48.png',
          sizes: '48x48',
          type: 'image/png',
        }),
        expect.objectContaining({
          url: '/images/favicon/favicon.svg',
          type: 'image/svg+xml',
        }),
        expect.objectContaining({
          url: '/images/icons/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        }),
      ])
    );
    expect(appleEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: '/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
        }),
      ])
    );
    expect(SITE_METADATA_ICONS.shortcut).toBe('/favicon.ico');
  });

  it('keeps static web manifests aligned with the shared manifest payload', () => {
    const siteManifest =
      readPublicJson<Record<string, unknown>>('site.webmanifest');
    const rootManifest = readPublicJson<Record<string, unknown>>(
      'manifest.webmanifest'
    );
    const sharedManifest = getSiteManifest();

    expect(siteManifest).toEqual(sharedManifest);
    expect(rootManifest).toEqual(sharedManifest);
    expect(sharedManifest.name).toBe('mogged');
    expect(sharedManifest.short_name).toBe('mogged');
    expect(sharedManifest.description).toContain('AI image editing');
    expect(sharedManifest.description).not.toContain('AI video workflows');
    expect(sharedManifest.icons).toEqual(
      expect.arrayContaining(
        REQUIRED_MANIFEST_SIZES.map((size) =>
          expect.objectContaining({
            sizes: `${size}x${size}`,
            type: 'image/png',
          })
        )
      )
    );
    expect(sharedManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/images/icons/maskable-icon-192x192.png',
          sizes: '192x192',
          purpose: 'any maskable',
        }),
        expect.objectContaining({
          src: '/images/icons/maskable-icon-512x512.png',
          sizes: '512x512',
          purpose: 'any maskable',
        }),
        expect.objectContaining({
          src: '/favicon.ico',
          type: 'image/x-icon',
        }),
      ])
    );
  });

  it('ships every required public icon file', () => {
    for (const relativePath of REQUIRED_ICON_FILES) {
      const absolutePath = path.join(process.cwd(), 'public', relativePath);
      expect(fs.existsSync(absolutePath), relativePath).toBe(true);
    }
  });

  it('does not keep stale duplicate favicon asset packs around', () => {
    for (const relativePath of DEPRECATED_ICON_FILES) {
      const absolutePath = path.join(process.cwd(), 'public', relativePath);
      expect(fs.existsSync(absolutePath), relativePath).toBe(false);
    }
  });

  it('keeps root compatibility icons byte-aligned with the canonical icon set', () => {
    expect(readPublicBuffer('favicon-16x16.png')).toEqual(
      readPublicBuffer('images/icons/favicon-16x16.png')
    );
    expect(readPublicBuffer('favicon-32x32.png')).toEqual(
      readPublicBuffer('images/icons/favicon-32x32.png')
    );
    expect(readPublicBuffer('favicon-48x48.png')).toEqual(
      readPublicBuffer('images/icons/favicon-48x48.png')
    );
    expect(readPublicBuffer('apple-touch-icon.png')).toEqual(
      readPublicBuffer('images/icons/apple-touch-icon-180x180.png')
    );
    expect(readPublicBuffer('apple-touch-icon-precomposed.png')).toEqual(
      readPublicBuffer('apple-touch-icon.png')
    );
  });

  it('does not ship Finder junk into the public icon tree', () => {
    const publicFiles = listFilesRelativeToPublic(
      path.join(process.cwd(), 'public')
    );

    expect(
      publicFiles.filter(
        (relativePath: string) => path.basename(relativePath) === '.DS_Store'
      )
    ).toEqual([]);
  });

  it('ships a multi-size root favicon for crawler and browser fallback requests', () => {
    const sizes = readIcoSquareSizes('favicon.ico');

    expect(sizes).toEqual(expect.arrayContaining([16, 32, 48, 64, 128, 256]));
  });
});
