import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readLocaleJson(locale: string, file: string) {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'src/config/locale/messages', locale, file),
      'utf8'
    )
  );
}

describe('public localization regressions', () => {
  it('keeps de fr es ja landing navigation and feature labels localized', () => {
    const expectations = {
      de: {
        homeNav: 'AI Image Editor',
        imageGeneratorNav: 'AI Image Generator',
        pricingNav: 'Preise',
        feature: 'Text-zu-Bild',
      },
      fr: {
        homeNav: 'AI Image Editor',
        imageGeneratorNav: 'AI Image Generator',
        pricingNav: 'Tarifs',
        feature: 'Texte vers image',
      },
      es: {
        homeNav: 'AI Image Editor',
        imageGeneratorNav: 'AI Image Generator',
        pricingNav: 'Precios',
        imageTools: [
          'Convertidor de imágenes',
          'Extractor de colores de imagen',
          'Compresor de imágenes',
          'Recortador de imágenes',
          'Redimensionador de imágenes',
          'Ampliador de imágenes',
          'Rotador de imágenes',
          'Eliminador de metadatos',
        ],
        videoTools: [
          'Convertidor de video',
          'Recortador de video',
          'Creador de miniaturas de video',
          'Video a GIF',
        ],
        feature: 'Texto a imagen',
      },
      ja: {
        homeNav: 'AI Image Editor',
        imageGeneratorNav: 'AI Image Generator',
        pricingNav: '料金',
        featureTitles: ['AI画像編集', '画像から画像', 'テキストから画像'],
        faqTitle: 'mogged よくある質問',
      },
    } as const;

    const deLanding = readLocaleJson('de', 'landing.json');
    const frLanding = readLocaleJson('fr', 'landing.json');
    const esLanding = readLocaleJson('es', 'landing.json');
    const jaLanding = readLocaleJson('ja', 'landing.json');

    expect(deLanding.header.nav.items[0].title).toBe(expectations.de.homeNav);
    expect(deLanding.header.nav.items[1].title).toBe(
      expectations.de.imageGeneratorNav
    );
    expect(deLanding.header.nav.items[2].title).toBe(
      expectations.de.pricingNav
    );
    expect(deLanding.header.nav.items).toHaveLength(3);
    expect(deLanding.features.items[2].title).toBe(expectations.de.feature);

    expect(frLanding.header.nav.items[0].title).toBe(expectations.fr.homeNav);
    expect(frLanding.header.nav.items[1].title).toBe(
      expectations.fr.imageGeneratorNav
    );
    expect(frLanding.header.nav.items[2].title).toBe(
      expectations.fr.pricingNav
    );
    expect(frLanding.header.nav.items).toHaveLength(3);
    expect(frLanding.features.items[2].title).toBe(expectations.fr.feature);

    expect(esLanding.header.nav.items[0].title).toBe(expectations.es.homeNav);
    expect(esLanding.header.nav.items[1].title).toBe(
      expectations.es.imageGeneratorNav
    );
    expect(esLanding.header.nav.items[2].title).toBe(
      expectations.es.pricingNav
    );
    expect(esLanding.header.nav.items).toHaveLength(3);
    expect(
      esLanding.footer.nav.items[0].children.map(
        (item: { title: string }) => item.title
      )
    ).toEqual(expectations.es.imageTools);
    expect(
      esLanding.footer.nav.items[1].children.map(
        (item: { title: string }) => item.title
      )
    ).toEqual(expectations.es.videoTools);
    expect(esLanding.features.items[2].title).toBe(expectations.es.feature);
    expect(esLanding.free_tools.video_to_gif.title).toBe('Video a GIF');

    expect(jaLanding.header.nav.items[0].title).toBe(expectations.ja.homeNav);
    expect(jaLanding.header.nav.items[1].title).toBe(
      expectations.ja.imageGeneratorNav
    );
    expect(jaLanding.header.nav.items[2].title).toBe(
      expectations.ja.pricingNav
    );
    expect(jaLanding.header.nav.items).toHaveLength(3);
    expect(
      jaLanding.features.items
        .slice(0, 3)
        .map((item: { title: string }) => item.title)
    ).toEqual(expectations.ja.featureTitles);
    expect(jaLanding.faq.title).toBe(expectations.ja.faqTitle);
    expect(jaLanding.usage.items[2].image.alt).toBe(
      'mogged で生成する'
    );
    expect(jaLanding.usage.items[3].image.alt).toBe(
      'mogged の結果をダウンロードする'
    );
  });

  it('keeps de fr es ja generator tabs localized', () => {
    const deAiVideo = readLocaleJson('de', 'ai/video.json');
    const jaAiVideo = readLocaleJson('ja', 'ai/video.json');

    expect(deAiVideo.generator.tabs).toEqual({
      'text-to-video': 'Text-zu-Video',
      'image-to-video': 'Bild-zu-Video',
      'reference-to-video': 'Referenz-zu-Video',
    });
    expect(deAiVideo.generator.tabs_short).toEqual({
      'text-to-video': 'Text',
      'image-to-video': 'Bild',
      'reference-to-video': 'Referenz',
    });

    expect(jaAiVideo.generator.tabs).toEqual({
      'text-to-video': 'テキストから動画',
      'image-to-video': '画像から動画',
      'reference-to-video': '参照から動画',
    });
    expect(jaAiVideo.generator.tabs_short).toEqual({
      'text-to-video': 'テキスト',
      'image-to-video': '画像',
      'reference-to-video': '参照',
    });
  });

  it('keeps arabic public routes free from english workflow labels', () => {
    const arLanding = readLocaleJson('ar', 'landing.json');
    const arAiVideo = readLocaleJson('ar', 'ai/video.json');

    expect(
      arLanding.header.nav.items
        .slice(0, 3)
        .map((item: { title: string }) => item.title)
    ).toEqual(['AI Image Editor', 'AI Image Generator', 'الأسعار']);
    expect(arLanding.header.nav.items).toHaveLength(3);
    expect(
      arLanding.features.items
        .slice(0, 6)
        .map((item: { title: string }) => item.title)
    ).toEqual([
      'تحرير الصور بالذكاء الاصطناعي',
      'صورة إلى صورة',
      'نص إلى صورة',
      'نسخ سريعة',
      'أدوات المتصفح',
      'اتساق بصري',
    ]);
    expect(arLanding.free_tools.image_converter.metadata.title).toContain(
      'محول الصور'
    );
    expect(arLanding.free_tools.video_thumbnail.metadata.title).toContain(
      'صانع صور مصغرة للفيديو'
    );

    expect(arAiVideo.generator.tabs).toEqual({
      'text-to-video': 'نص إلى فيديو',
      'image-to-video': 'صورة إلى فيديو',
      'reference-to-video': 'مرجع إلى فيديو',
    });
    expect(arAiVideo.generator.tabs_short).toEqual({
      'text-to-video': 'نص',
      'image-to-video': 'صورة',
      'reference-to-video': 'مرجع',
    });
  });
});
