import { replaceBrandTokensDeep } from '@/shared/lib/brand';
import { getHomeGalleryItems } from '@/shared/lib/home-gallery';
import { replaceImageEditorAiMediaTokensDeep } from '@/shared/lib/imageeditorai-media';
import { normalizeLandingNarrativeSections } from '@/shared/lib/narrative-sections';
import { Landing } from '@/shared/types/blocks/landing';

type LandingTranslator = {
  raw: (key: string) => unknown;
  has: (key: string) => boolean;
};

type LandingSeoSections = {
  structured_data: {
    feature_list: string[];
    alternate_names: string[];
    about: string[];
  };
};

type LandingMetadata = {
  title?: string;
  description?: string;
  keywords?: string;
};

function readOptionalLandingMessage<T>(t: LandingTranslator, key: string) {
  return t.has(key) ? (t.raw(key) as T) : undefined;
}

export function buildLandingPageContent({
  includeShowcaseSections = false,
  locale,
  t,
}: {
  includeShowcaseSections?: boolean;
  locale: string;
  t: LandingTranslator;
}) {
  const metadata = replaceBrandTokensDeep(t.raw('metadata')) as LandingMetadata;
  const faq = readOptionalLandingMessage<Landing['faq']>(t, 'faq');
  const seoSections = replaceBrandTokensDeep(
    t.raw('seo_sections')
  ) as LandingSeoSections;

  const page = normalizeLandingNarrativeSections(
    replaceImageEditorAiMediaTokensDeep(
      replaceBrandTokensDeep({
        hero: t.raw('hero'),
        introduce: readOptionalLandingMessage<Landing['introduce']>(
          t,
          'introduce'
        ),
        benefits: readOptionalLandingMessage<Landing['benefits']>(
          t,
          'benefits'
        ),
        usage: readOptionalLandingMessage<Landing['usage']>(t, 'usage'),
        features: readOptionalLandingMessage<Landing['features']>(
          t,
          'features'
        ),
        stats: readOptionalLandingMessage<Landing['stats']>(t, 'stats'),
        gallery:
          includeShowcaseSections && t.has('gallery')
            ? {
                ...(t.raw('gallery') as object),
                items: getHomeGalleryItems(locale),
              }
            : undefined,
        nano_banana_cases: t.raw('nano_banana_cases'),
        use_cases: includeShowcaseSections
          ? readOptionalLandingMessage<Landing['use_cases']>(t, 'use_cases')
          : undefined,
        faq,
        cta: readOptionalLandingMessage<Landing['cta']>(t, 'cta'),
      })
    ) as Landing
  );

  return {
    metadata,
    seoSections,
    page,
  };
}
