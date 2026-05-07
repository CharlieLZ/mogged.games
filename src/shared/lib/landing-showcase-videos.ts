import { resolveAppLocale, type AppLocale } from '@/config/locale';

const LANDING_R2_VIDEO_BASE_URL =
  'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev';

type LandingShowcaseLocale = AppLocale;
type LandingVideoAspectRatio = 'landscape' | 'portrait';

export type LandingShowcaseVideoItem = {
  id: string;
  title: string;
  src: string;
  aspectRatio: LandingVideoAspectRatio;
};

type LandingShowcaseCopy = {
  title: string;
  description: string;
  itemTitlePrefix: string;
};

type LandingPreviewCopy = {
  vertical: string;
  verticalAlternate: string;
};

const LANDING_SHOWCASE_COPY: Record<LandingShowcaseLocale, LandingShowcaseCopy> =
  {
    en: {
      title: 'See what mogged can create',
      description:
        'Motion-first examples pulled from the latest mogged showcase library.',
      itemTitlePrefix: 'mogged showcase',
    },
    zh: {
      title: '看看 mogged 能做出什么',
      description: '直接取自最新 mogged 样片库的动态案例。',
      itemTitlePrefix: 'mogged 样片',
    },
    de: {
      title: 'Sehen Sie, was mogged erstellen kann',
      description:
        'Bewegungsorientierte Beispiele aus der neuesten mogged Showcase-Bibliothek.',
      itemTitlePrefix: 'mogged Showcase',
    },
    fr: {
      title: 'Découvrez ce que mogged peut créer',
      description:
        'Exemples axés sur le mouvement tirés de la dernière bibliothèque showcase mogged.',
      itemTitlePrefix: 'Vitrine mogged',
    },
    es: {
      title: 'Mira lo que mogged puede crear',
      description:
        'Ejemplos centrados en movimiento tomados de la biblioteca más reciente de mogged.',
      itemTitlePrefix: 'Muestra mogged',
    },
    ja: {
      title: 'mogged で作れる映像を見る',
      description:
        '最新の mogged ショーケースライブラリから選んだモーション重視の作例です。',
      itemTitlePrefix: 'mogged ショーケース',
    },
    it: {
      title: 'Guarda cosa può creare mogged',
      description:
        'Esempi orientati al movimento presi dalla più recente libreria showcase di mogged.',
      itemTitlePrefix: 'Showcase mogged',
    },
    ko: {
      title: 'mogged으로 만들 수 있는 결과를 확인하세요',
      description:
        '최신 mogged 쇼케이스 라이브러리에서 가져온 모션 중심 예시입니다.',
      itemTitlePrefix: 'mogged 쇼케이스',
    },
    ar: {
      title: 'شاهد ما الذي يمكن أن يصنعه mogged',
      description: 'أمثلة تركّز على الحركة ومأخوذة من أحدث مكتبة عروض mogged.',
      itemTitlePrefix: 'عرض mogged',
    },
  };

const LANDING_PREVIEW_COPY: Record<LandingShowcaseLocale, LandingPreviewCopy> = {
  en: {
    vertical: 'Sample mogged vertical preview',
    verticalAlternate: 'Sample mogged alternate vertical preview',
  },
  zh: {
    vertical: 'mogged 竖版示例预览',
    verticalAlternate: 'mogged 另一组竖版示例预览',
  },
  de: {
    vertical: 'Vertikale Beispielvorschau von mogged',
    verticalAlternate: 'Alternative vertikale Beispielvorschau von mogged',
  },
  fr: {
    vertical: 'Aperçu d’exemple vertical mogged',
    verticalAlternate: 'Aperçu d’exemple vertical alternatif mogged',
  },
  es: {
    vertical: 'Vista previa vertical de muestra de mogged',
    verticalAlternate: 'Vista previa vertical alternativa de muestra de mogged',
  },
  ja: {
    vertical: 'mogged 縦長サンプルプレビュー',
    verticalAlternate: 'mogged 別パターン縦長サンプルプレビュー',
  },
  it: {
    vertical: 'Anteprima verticale di esempio mogged',
    verticalAlternate: 'Anteprima verticale alternativa di esempio mogged',
  },
  ko: {
    vertical: 'mogged 세로형 샘플 미리보기',
    verticalAlternate: 'mogged 다른 세로형 샘플 미리보기',
  },
  ar: {
    vertical: 'معاينة عمودية تجريبية من mogged',
    verticalAlternate: 'معاينة عمودية تجريبية بديلة من mogged',
  },
};

function normalizeLocale(locale?: string): LandingShowcaseLocale {
  return resolveAppLocale(locale);
}

export function getLandingShowcaseCopy(locale?: string) {
  return LANDING_SHOWCASE_COPY[normalizeLocale(locale)];
}

export function getLandingPreviewSampleVideos(locale?: string) {
  const copy = LANDING_PREVIEW_COPY[normalizeLocale(locale)];

  return [
    {
      id: 'sample-text-to-video-vertical-1',
      src: `${LANDING_R2_VIDEO_BASE_URL}/vertical-1.mp4`,
      aspectRatio: 'portrait' as const,
      title: copy.vertical,
    },
    {
      id: 'sample-text-to-video-vertical-2',
      src: `${LANDING_R2_VIDEO_BASE_URL}/vertical-2.mp4`,
      aspectRatio: 'portrait' as const,
      title: copy.verticalAlternate,
    },
  ];
}

export function getLandingShowcaseVideos(
  locale?: string
): LandingShowcaseVideoItem[] {
  const copy = getLandingShowcaseCopy(locale);

  return Array.from({ length: 21 }, (_, index) => {
    const exampleNumber = index + 1;

    return {
      id: `example-${exampleNumber}`,
      title: `${copy.itemTitlePrefix} ${String(exampleNumber).padStart(2, '0')}`,
      src: `${LANDING_R2_VIDEO_BASE_URL}/example${exampleNumber}.mp4`,
      aspectRatio: 'landscape',
    };
  });
}
