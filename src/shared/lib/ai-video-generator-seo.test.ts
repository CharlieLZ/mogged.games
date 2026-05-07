import { describe, expect, it } from 'vitest';

import {
  getGeneratorModeFaqCopy,
  getGeneratorModeNarrativeCopy,
  getGeneratorModeSeoCopy,
  getGeneratorRootFaqCopy,
  getGeneratorRootNarrativeCopy,
  getGeneratorRootSeoCopy,
} from './ai-video-generator-seo';

describe('ai generator seo copy', () => {
  const countFaqItems = (
    faq: ReturnType<typeof getGeneratorRootFaqCopy>
  ): number =>
    (faq.items?.length || 0) +
    (faq.categories || []).reduce(
      (total, category) => total + (category.items?.length || 0),
      0
    );

  it('keeps the root generator page focused on the umbrella keyword', () => {
    const copy = getGeneratorRootSeoCopy('en');
    const arabicCopy = getGeneratorRootSeoCopy('ar');

    expect(copy.heading).toBe('AI Video Generator');
    expect(copy.metadataTitle).toContain('AI Video Generator');
    expect(copy.metadataTitle).toBe(
      'AI Video Generator | Text, Image & Ref - mogged'
    );
    expect(copy.keywords).toContain('ai video generator');
    expect(copy.metadataTitle).not.toContain('Seedance');
    expect(copy.description).toContain(
      'text-to-video, image-to-video, and reference-to-video'
    );
    expect(copy.description).toContain('concept drafts');
    expect(arabicCopy.heading).toBe(
      'مولد الفيديو بالذكاء الاصطناعي mogged'
    );
    expect(arabicCopy.description).toContain('mogged.games');
    expect(arabicCopy.description).toContain('النص إلى فيديو');
  });

  it('keeps each clean mode page focused on its own primary keyword', () => {
    const textToVideo = getGeneratorModeSeoCopy('en', 'text-to-video');
    const referenceToVideo = getGeneratorModeSeoCopy(
      'en',
      'reference-to-video'
    );
    const imageToVideoEn = getGeneratorModeSeoCopy('en', 'image-to-video');
    const imageToVideo = getGeneratorModeSeoCopy('zh-CN', 'image-to-video');
    const textToVideoZh = getGeneratorModeSeoCopy('zh-CN', 'text-to-video');
    const textToVideoIt = getGeneratorModeSeoCopy('it', 'text-to-video');
    const referenceToVideoKo = getGeneratorModeSeoCopy(
      'ko',
      'reference-to-video'
    );

    expect(textToVideo.heading).toBe('Text to Video AI Generator');
    expect(textToVideo.metadataTitle).toBe(
      'Text to Video AI Generator Online | mogged'
    );
    expect(textToVideo.keywords).toContain('text to video');
    expect(textToVideo.description).toContain('mogged videos');
    expect(imageToVideoEn.metadataTitle).toBe(
      'Image to Video AI Generator Online | mogged'
    );
    expect(imageToVideoEn.keywords).toContain('image to video');
    expect(textToVideo.description).toContain('text-to-video workflow');
    expect(imageToVideo.heading).toBe('mogged 图生视频');
    expect(imageToVideo.metadataTitle).toBe(
      '图生视频 AI 生成器｜mogged'
    );
    expect(imageToVideo.keywords).toContain('mogged 图生视频');
    expect(imageToVideo.description).toContain('首帧');
    expect(imageToVideo.description).toContain('可选尾帧');
    expect(imageToVideo.description).toContain('mogged 视频');
    expect(referenceToVideo.description).toContain(
      'image, video, and audio references'
    );
    expect(referenceToVideo.metadataTitle).toBe(
      'Reference to Video AI Generator Online | mogged'
    );
    expect(textToVideoZh.description).toContain('mogged');
    expect(textToVideoZh.description).toContain('提示词');
    expect(textToVideoZh.metadataTitle).toBe(
      '文生视频 AI 生成器｜mogged'
    );
    expect(textToVideoIt.heading).toBe('mogged Da testo a video');
    expect(textToVideoIt.description).toContain('workflow ospitato');
    expect(referenceToVideoKo.description).toContain('이미지, 비디오, 오디오');
  });

  it('keeps root and mode faq copy aligned with their route intent', () => {
    const rootFaq = getGeneratorRootFaqCopy('en');
    const textToVideoFaq = getGeneratorModeFaqCopy('en', 'text-to-video');
    const rootFaqAr = getGeneratorRootFaqCopy('ar');
    const referenceFaqKo = getGeneratorModeFaqCopy('ko', 'reference-to-video');

    expect(rootFaq.title).toBe('mogged Video Generator FAQ');
    expect(rootFaq.items?.[0]?.question).toContain('workflows');
    expect(textToVideoFaq.title).toBe('mogged Text to Video FAQ');
    expect(textToVideoFaq.items?.[0]?.question).toContain('text-to-video');
    expect(rootFaqAr.title).toContain('mogged');
    expect(rootFaqAr.items?.[0]?.question).toContain('مسارات');
    expect(referenceFaqKo.title).toContain('레퍼런스 영상 생성');
    expect(referenceFaqKo.items?.[0]?.answer).toContain('멀티모달');
    expect(rootFaq.items?.map((item) => item.question)).toEqual(
      expect.arrayContaining([
        'What workflows are included in this generator?',
        'Which video workflow should I start with?',
        'Do I need to sign in or pay before I generate a video?',
        'What files can I upload for image-to-video or reference-to-video?',
        'How long does AI video generation take?',
        'Are generated videos saved to my account?',
        'What happens if a video task fails?',
      ])
    );
  });

  it('keeps video generator FAQ pages substantial enough for the current localized rollout', () => {
    for (const locale of [
      'en',
      'zh',
      'de',
      'fr',
      'es',
      'ja',
      'it',
      'ko',
      'ar',
    ] as const) {
      const minimumRootFaqItems = locale === 'en' || locale === 'zh' ? 7 : 3;

      expect(
        countFaqItems(getGeneratorRootFaqCopy(locale))
      ).toBeGreaterThanOrEqual(minimumRootFaqItems);

      for (const mode of [
        'text-to-video',
        'image-to-video',
        'reference-to-video',
      ] as const) {
        expect(
          countFaqItems(getGeneratorModeFaqCopy(locale, mode))
        ).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('builds crawlable narrative sections for the root generator page', () => {
    const narrative = getGeneratorRootNarrativeCopy('en');
    const sectionTitles = narrative.sections.map((section) => section.title);

    expect(sectionTitles).toEqual(
      expect.arrayContaining([
        'AI Video Generator Workspace',
        'Text to Video AI Generator',
        'Image to Video AI Generator',
        'Reference to Video AI Generator',
        'mogged Video Generator FAQ',
      ])
    );
    expect(narrative.sections[0]?.bullets).toContain(
      'Hosted mogged text-to-video workflow'
    );
  });

  it('builds route-specific narrative sections for clean mode pages', () => {
    const narrative = getGeneratorModeNarrativeCopy('en', 'text-to-video');
    expect(narrative.title).toBe('Workflow Notes');
    const sectionTitles = narrative.sections.map((section) => section.title);

    expect(sectionTitles).toEqual(
      expect.arrayContaining([
        'Turn prompts into reviewable video concepts',
        'Shared video workspace controls',
        'When to use the other video workflows',
      ])
    );
    expect(narrative.sections[0]?.paragraphs.join(' ')).toContain(
      'text-to-video workflow'
    );
    expect(narrative.sections[0]?.bullets).toContain(
      'Prompt-only video generation'
    );
  });
});
