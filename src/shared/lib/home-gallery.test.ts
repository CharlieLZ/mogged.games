import { describe, expect, it } from 'vitest';

import { publicSiteLocales } from '@/config/locale';

import {
  getHomeGalleryItems,
  IMAGEEDITORAI_REMOTE_HERO_IMAGE,
  IMAGEEDITORAI_REMOTE_SAMPLE_VIDEO,
  IMAGEEDITORAI_REMOTE_VIDEO_POSTER,
} from './home-gallery';

describe('home gallery remote assets', () => {
  it('keeps gallery media on stable verified remote urls', () => {
    expect(IMAGEEDITORAI_REMOTE_HERO_IMAGE).toBe(
      'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/4k-cinematic.jpg'
    );
    expect(IMAGEEDITORAI_REMOTE_VIDEO_POSTER).toBe(
      'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/models/kling-ai/features/image-to-video.jpg'
    );
    expect(IMAGEEDITORAI_REMOTE_SAMPLE_VIDEO).toBe(
      'https://pub-49364ecf52e344d3a722a3c5bca11271.r2.dev/images/hero/dance.mp4'
    );

    for (const locale of publicSiteLocales) {
      const items = getHomeGalleryItems(locale);
      expect(items).toHaveLength(12);

      const videoItems = items.filter((item) => item.type === 'video');

      expect(videoItems).toHaveLength(items.length);

      for (const item of items) {
        const src = item.image?.src ?? '';

        expect(src.startsWith('https://')).toBe(true);
        expect(src).not.toContain('/imgs/');
        expect(item.type).toBe('video');
        expect(item.url?.startsWith('https://')).toBe(true);
      }

      const serialized = JSON.stringify(items).toLowerCase();
      expect(serialized).not.toContain('静帧');
      expect(serialized).not.toContain('mogged.games');
      expect(serialized).toContain(
        'pub-49364ecf52e344d3a722a3c5bca11271.r2.dev'
      );
    }
  });

  it('keeps public locale gallery copy localized instead of falling back to english', () => {
    expect(getHomeGalleryItems('de')[0]?.title).toBe(
      'Food-Nahaufnahme mit filmischer Bewegung und Textur'
    );
    expect(getHomeGalleryItems('fr')[1]?.title).toBe(
      'Plan de formation pour le rythme d’une escouade sci-fi'
    );
    expect(getHomeGalleryItems('es')[5]?.title).toBe(
      'Persecucion por portal en un paisaje alienigena en ruinas'
    );
    expect(getHomeGalleryItems('ja')[7]?.title).toBe(
      '煙とスラスターを伴うドロップシップのホバリング'
    );
    expect(getHomeGalleryItems('ar')[9]?.description).toBe(
      'مقطع أهدأ يركّز على المنتج ونمط الحياة، ليُظهر المعرض إيقاعاً إعلانياً أنظف لا يعتمد فقط على الاستعراض.'
    );
  });
});
