import { resolveAppLocale, type AppLocale } from '@/config/locale';
import arAiVideo from '@/config/locale/messages/ar/ai/video.json';
import deAiVideo from '@/config/locale/messages/de/ai/video.json';
import enAiVideo from '@/config/locale/messages/en/ai/video.json';
import esAiVideo from '@/config/locale/messages/es/ai/video.json';
import frAiVideo from '@/config/locale/messages/fr/ai/video.json';
import itAiVideo from '@/config/locale/messages/it/ai/video.json';
import jaAiVideo from '@/config/locale/messages/ja/ai/video.json';
import koAiVideo from '@/config/locale/messages/ko/ai/video.json';
import zhAiVideo from '@/config/locale/messages/zh/ai/video.json';
import {
  VIDEO_GENERATOR_MODES,
  type VideoGeneratorMode,
} from '@/shared/blocks/generator/video-generator-mode';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';
import type { FAQ as LandingFAQ } from '@/shared/types/blocks/landing';

export type GeneratorSeoCopy = {
  metadataTitle: string;
  heading: string;
  description: string;
  keywords: string;
  featureList: string[];
};

export type GeneratorSeoNarrativeSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type GeneratorSeoNarrativeCopy = {
  title?: string;
  sections: GeneratorSeoNarrativeSection[];
};

type GeneratorFaqCopy = LandingFAQ;
type GeneratorCopyLocale = AppLocale;

const AI_VIDEO_MESSAGES = {
  en: enAiVideo,
  zh: zhAiVideo,
  de: deAiVideo,
  fr: frAiVideo,
  es: esAiVideo,
  ja: jaAiVideo,
  it: itAiVideo,
  ko: koAiVideo,
  ar: arAiVideo,
} as const;

function normalizeGeneratorCopyLocale(locale?: string): GeneratorCopyLocale {
  return resolveAppLocale(locale);
}

const GENERATOR_MODE_TABS = {
  en: enAiVideo.generator.tabs,
  zh: zhAiVideo.generator.tabs,
  de: deAiVideo.generator.tabs,
  fr: frAiVideo.generator.tabs,
  es: esAiVideo.generator.tabs,
  ja: jaAiVideo.generator.tabs,
  it: itAiVideo.generator.tabs,
  ko: koAiVideo.generator.tabs,
  ar: arAiVideo.generator.tabs,
} as const;

function getGeneratorModeDisplayName(
  locale: GeneratorCopyLocale,
  mode: VideoGeneratorMode
) {
  return GENERATOR_MODE_TABS[locale][mode];
}

function localizeGeneratorModeText(
  value: string,
  locale: GeneratorCopyLocale,
  mode: VideoGeneratorMode
) {
  if (locale === 'en') {
    return value;
  }

  const displayName = getGeneratorModeDisplayName(locale, mode);

  if (displayName === mode) {
    return value;
  }

  return value.replaceAll(mode, displayName);
}

function localizeAllGeneratorModesText(
  value: string,
  locale: GeneratorCopyLocale
) {
  if (locale === 'en') {
    return value;
  }

  return (
    Object.entries(GENERATOR_MODE_TABS[locale]) as [
      VideoGeneratorMode,
      string,
    ][]
  ).reduce((result, [mode, displayName]) => {
    if (displayName === mode) {
      return result;
    }

    return result.replaceAll(mode, displayName);
  }, value);
}

function localizeGeneratorModeValue<T>(
  input: T,
  locale: GeneratorCopyLocale,
  mode: VideoGeneratorMode
): T {
  if (typeof input === 'string') {
    return localizeGeneratorModeText(input, locale, mode) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) =>
      localizeGeneratorModeValue(item, locale, mode)
    ) as T;
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        localizeGeneratorModeValue(value, locale, mode),
      ])
    ) as T;
  }

  return input;
}

function localizeAllGeneratorModesValue<T>(
  input: T,
  locale: GeneratorCopyLocale
): T {
  if (typeof input === 'string') {
    return localizeAllGeneratorModesText(input, locale) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) =>
      localizeAllGeneratorModesValue(item, locale)
    ) as T;
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        localizeAllGeneratorModesValue(value, locale),
      ])
    ) as T;
  }

  return input;
}

function compactTextList(values: Array<string | null | undefined>) {
  return values.reduce<string[]>((result, value) => {
    const normalizedValue = value?.trim();

    if (!normalizedValue || result.includes(normalizedValue)) {
      return result;
    }

    result.push(normalizedValue);
    return result;
  }, []);
}

function getFaqNarrativeParagraphs(faq: GeneratorFaqCopy) {
  return compactTextList(
    (faq.items || []).map((item) =>
      compactTextList([item.question, item.answer]).join(' ')
    )
  );
}

function finalizeNarrative(
  sections: GeneratorSeoNarrativeSection[],
  options?: {
    title?: string;
  }
): GeneratorSeoNarrativeCopy {
  return {
    title: options?.title?.trim() || undefined,
    sections: sections
      .map((section) => ({
        ...section,
        title: section.title.trim(),
        paragraphs: compactTextList(section.paragraphs),
        bullets: compactTextList(section.bullets || []),
      }))
      .filter(
        (section) =>
          Boolean(section.title) &&
          (section.paragraphs.length > 0 || (section.bullets?.length || 0) > 0)
      ),
  };
}

const GENERATOR_WORKFLOW_NOTES_TITLE: Record<GeneratorCopyLocale, string> = {
  en: 'Workflow Notes',
  zh: '工作流说明',
  de: 'Workflow-Hinweise',
  fr: 'Repères de workflow',
  es: 'Guía del workflow',
  ja: 'ワークフローの要点',
  it: 'Note sul workflow',
  ko: '워크플로 메모',
  ar: 'ملاحظات سير العمل',
};

const MODE_NARRATIVE_SECTION_TITLES: Partial<
  Record<
    GeneratorCopyLocale,
    Record<
      VideoGeneratorMode,
      {
        overviewTitle: string;
        workspaceTitle: string;
        switchTitle: string;
      }
    >
  >
> = {
  en: {
    'text-to-video': {
      overviewTitle: 'Turn prompts into reviewable video concepts',
      workspaceTitle: 'Shared video workspace controls',
      switchTitle: 'When to use the other video workflows',
    },
    'image-to-video': {
      overviewTitle: 'Animate a first frame with optional last-frame control',
      workspaceTitle: 'Shared video workspace controls',
      switchTitle: 'When to use the other video workflows',
    },
    'reference-to-video': {
      overviewTitle: 'Guide motion with image, video, and audio references',
      workspaceTitle: 'Shared video workspace controls',
      switchTitle: 'When to use the other video workflows',
    },
  },
  zh: {
    'text-to-video': {
      overviewTitle: '把提示词直接变成可评审视频草稿',
      workspaceTitle: '公共视频工作台里能控什么',
      switchTitle: '什么时候切换到其他视频工作流',
    },
    'image-to-video': {
      overviewTitle: '用首帧和可选尾帧控制镜头过渡',
      workspaceTitle: '公共视频工作台里能控什么',
      switchTitle: '什么时候切换到其他视频工作流',
    },
    'reference-to-video': {
      overviewTitle: '用图片、视频、音频参考稳住风格和动作',
      workspaceTitle: '公共视频工作台里能控什么',
      switchTitle: '什么时候切换到其他视频工作流',
    },
  },
};

const ROOT_GENERATOR_SEO_COPY: Record<GeneratorCopyLocale, GeneratorSeoCopy> = {
  en: {
    metadataTitle: 'AI Video Generator | Text, Image & Ref - mogged',
    heading: 'AI Video Generator',
    description:
      'Generate AI videos with mogged using text-to-video, image-to-video, and reference-to-video workflows for concept drafts and shot control.',
    keywords:
      'ai video generator, text-to-video, image-to-video, reference-to-video, Seedance 2.0, mogged.games',
    featureList: [
      'Hosted mogged text-to-video workflow',
      'Hosted mogged first-and-last-frame workflow',
      'Hosted mogged multimodal reference workflow',
    ],
  },
  zh: {
    metadataTitle: 'AI 视频生成器｜文生、图生与参考视频 - mogged',
    heading: 'mogged 视频生成器',
    description:
      '在 mogged.games 使用 mogged 视频生成器，在一个托管工作台里统一完成文生视频、图生视频和参考生视频，适合概念验证、控镜头生成和多素材视频制作。',
    keywords:
      'mogged 视频生成器, mogged 文生视频, mogged 图生视频, mogged 参考生视频, mogged 托管 AI 视频工作台, mogged.games',
    featureList: [
      '托管式 mogged 文生视频',
      '托管式 mogged 首尾帧图生视频',
      '托管式 mogged 多模态参考生视频',
    ],
  },
  de: {
    metadataTitle:
      'KI-Videogenerator | Text, Bild & Referenz - mogged',
    heading: 'mogged KI-Videogenerator',
    description:
      'Nutzen Sie den mogged KI-Videogenerator auf mogged.games für Text-, Bild- und Referenz-zu-Video in einem Workspace für Entwürfe und Shot-Kontrolle.',
    keywords:
      'mogged KI-Videogenerator, mogged Text-zu-Video, mogged Bild-zu-Video, mogged Referenz-zu-Video, mogged gehosteter KI-Video-Workspace, mogged.games',
    featureList: [
      'Gehosteter mogged text-to-video-Workflow',
      'Gehosteter mogged Bild-zu-Video-Workflow',
      'Gehosteter mogged Referenz-Workflow',
    ],
  },
  fr: {
    metadataTitle:
      'Générateur vidéo IA | texte, image et référence - mogged',
    heading: 'Générateur vidéo IA mogged',
    description:
      "Utilisez le générateur vidéo IA mogged sur mogged.games pour le texte, l'image et la référence vers vidéo dans un espace pour brouillons et cadrage.",
    keywords:
      'Générateur vidéo IA mogged, mogged texte vers vidéo, mogged image vers vidéo, mogged référence vers vidéo, workspace vidéo IA hébergé mogged, mogged.games',
    featureList: [
      'Workflow text-to-video hébergé mogged',
      'Workflow image-to-video hébergé mogged',
      'Workflow de référence multimodal hébergé mogged',
    ],
  },
  es: {
    metadataTitle:
      'Generador de video IA | texto, imagen y referencia - mogged',
    heading: 'Generador de video AI de mogged',
    description:
      'Usa el generador de video AI de mogged en mogged.games para texto, imagen y referencia a video en un workspace para borradores y control de plano.',
    keywords:
      'Generador de video AI de mogged, mogged texto a video, mogged imagen a video, mogged referencia a video, workspace de video AI alojado mogged, mogged.games',
    featureList: [
      'Flujo text-to-video alojado de mogged',
      'Flujo image-to-video alojado de mogged',
      'Flujo de referencia multimodal alojado de mogged',
    ],
  },
  ja: {
    metadataTitle:
      'AI動画ジェネレーター | テキスト・画像・参照 - mogged',
    heading: 'mogged動画ジェネレーター',
    description:
      'mogged.games の mogged動画ジェネレーターでは、テキストから動画、画像から動画、参照から動画を1つのホスト型ワークスペースで進められ、構想段階の試作やショット制御にも向いています。',
    keywords:
      'mogged動画ジェネレーター, mogged テキストから動画, mogged 画像から動画, mogged 参照から動画, mogged ホスト型AI動画ワークスペース, mogged.games',
    featureList: [
      'ホスト型 mogged text-to-video ワークフロー',
      'ホスト型 mogged image-to-video ワークフロー',
      'ホスト型 mogged マルチモーダル参照ワークフロー',
    ],
  },
  it: {
    metadataTitle:
      'Generatore video AI | testo, immagine e riferimento - mogged',
    heading: 'Generatore video AI mogged',
    description:
      'Usa il generatore video AI mogged su mogged.games per testo, immagine e riferimento a video in un workspace per bozze e controllo inquadrature.',
    keywords:
      'Generatore video AI mogged, mogged testo a video, mogged immagine a video, mogged riferimento a video, workspace video AI ospitato mogged, mogged.games',
    featureList: [
      'Workflow text-to-video ospitato mogged',
      'Workflow image-to-video ospitato mogged',
      'Workflow reference-to-video multimodale ospitato mogged',
    ],
  },
  ko: {
    metadataTitle:
      'AI 비디오 생성기 | 텍스트, 이미지, 레퍼런스 - mogged',
    heading: 'mogged 비디오 생성기',
    description:
      'mogged.games의 mogged 비디오 생성기에서 텍스트 투 비디오, 이미지 투 비디오, 레퍼런스 투 비디오를 하나의 호스팅 작업공간으로 진행하며 초안 제작, 샷 제어, 멀티 에셋 작업까지 이어갈 수 있습니다.',
    keywords:
      'mogged 비디오 생성기, mogged 텍스트 투 비디오, mogged 이미지 투 비디오, mogged 레퍼런스 투 비디오, mogged 호스팅 AI 비디오 작업공간, mogged.games',
    featureList: [
      '호스팅된 mogged text-to-video 워크플로',
      '호스팅된 mogged image-to-video 워크플로',
      '호스팅된 mogged 멀티모달 reference-to-video 워크플로',
    ],
  },
  ar: {
    metadataTitle: 'مولد فيديو AI | نص وصورة ومرجع - mogged',
    heading: 'مولد الفيديو بالذكاء الاصطناعي mogged',
    description:
      'استخدم مولد الفيديو mogged على mogged.games لمسارات النص إلى فيديو، الصورة إلى فيديو، والمرجع إلى فيديو ضمن مساحة عمل للمسودات وضبط اللقطات.',
    keywords:
      'مولد فيديو AI mogged, mogged نص إلى فيديو, mogged صورة إلى فيديو, mogged مرجع إلى فيديو, مساحة عمل فيديو AI مستضافة من mogged, mogged.games',
    featureList: [
      'مسار نص إلى فيديو مستضاف من mogged',
      'مسار صورة إلى فيديو مستضاف من mogged',
      'مسار مرجع إلى فيديو متعدد الوسائط ومستضاف من mogged',
    ],
  },
};

const MODE_GENERATOR_SEO_COPY: Record<
  GeneratorCopyLocale,
  Record<VideoGeneratorMode, GeneratorSeoCopy>
> = {
  en: {
    'text-to-video': {
      metadataTitle: 'Text to Video AI Generator Online | mogged',
      heading: 'Text to Video AI Generator',
      description:
        'Turn prompts into mogged videos with a hosted text-to-video workflow for concept shots, storyboards, ad ideas, and motion drafts.',
      keywords:
        'text to video, AI video generator, prompt to video, mogged video generation',
      featureList: [
        'Prompt-only video generation',
        'Fast mode toggle',
        'Audio and web-search controls when supported',
      ],
    },
    'image-to-video': {
      metadataTitle: 'Image to Video AI Generator Online | mogged',
      heading: 'Image to Video AI Generator',
      description:
        'Animate a first frame and optional last frame into AI videos for product motion, continuity, and controlled camera movement.',
      keywords:
        'image to video, AI video generator, first frame video, last frame animation',
      featureList: [
        'First and optional last frame image control',
        'Fast mode toggle',
        'Video duration, resolution, and aspect ratio controls',
      ],
    },
    'reference-to-video': {
      metadataTitle: 'Reference to Video AI Generator Online | mogged',
      heading: 'Reference to Video AI Generator',
      description:
        'Generate AI videos from image, video, and audio references when prompts alone cannot hold style, motion, or visual continuity.',
      keywords:
        'reference to video, multimodal video generation, reference video, mogged',
      featureList: [
        'Image, video, and audio references in one workflow',
        'Multimodal control surface',
        'Unified hosted route across multiple providers',
      ],
    },
  },
  zh: {
    'text-to-video': {
      metadataTitle: '文生视频 AI 生成器｜mogged',
      heading: 'mogged 文生视频',
      description:
        '用 mogged 文生视频把提示词直接变成可评审视频，适合概念镜头、分镜预演、广告创意和快速动态草稿。',
      keywords:
        'mogged 文生视频, 提示词生成视频, mogged 视频生成',
      featureList: [
        '纯提示词视频生成',
        '统一 Fast 开关',
        '按平台能力开放声音和联网搜索',
      ],
    },
    'image-to-video': {
      metadataTitle: '图生视频 AI 生成器｜mogged',
      heading: 'mogged 图生视频',
      description:
        '通过首帧与可选尾帧控制，把静态图片转成 mogged 视频，适合产品动效、镜头连续性和更可控的运动生成。',
      keywords: 'mogged 图生视频, 首尾帧动画, 图片生成视频',
      featureList: [
        '首帧与尾帧控制',
        '统一 Fast 开关',
        '安全收敛后的时长、分辨率、比例参数',
      ],
    },
    'reference-to-video': {
      metadataTitle: '参考生视频 AI 生成器｜mogged',
      heading: 'mogged 参考生视频',
      description:
        '在同一条 mogged 工作流里混合图片、视频、音频参考生成视频，适合单靠提示词难以稳定控制风格、动作和连续性的场景。',
      keywords:
        'mogged 参考生视频, 多模态视频生成, Omni Reference 视频',
      featureList: [
        '图像、视频、音频混合参考',
        '多模态控制',
        '多平台路由下的统一工作台',
      ],
    },
  },
  de: {
    'text-to-video': {
      metadataTitle: 'Text-zu-Video KI-Generator | mogged',
      heading: 'mogged text-to-video',
      description:
        'Erstellen Sie mit mogged text-to-video Clips direkt aus Prompts in einem gehosteten Workflow für Konzeptshots, Storyboards und erste Bewegungsentwürfe.',
      keywords:
        'mogged text-to-video, Prompt zu Video, mogged Videogenerierung',
      featureList: [
        'Videogenerierung nur per Prompt',
        'Fast-Umschalter',
        'Audio- und Websucheinstellungen je nach Provider',
      ],
    },
    'image-to-video': {
      metadataTitle: 'Bild-zu-Video KI-Generator | mogged',
      heading: 'mogged image-to-video',
      description:
        'Nutzen Sie mogged image-to-video, um Start- und Endframe für Produktszenen, Kontinuität und kontrollierte Kamerabewegung zu animieren.',
      keywords:
        'mogged image-to-video, Startframe Video, Endframe Animation',
      featureList: [
        'Kontrolle über ersten und optional letzten Frame',
        'Fast-Umschalter',
        'Steuerung für Dauer, Auflösung und Seitenverhältnis',
      ],
    },
    'reference-to-video': {
      metadataTitle: 'Referenz-zu-Video KI-Generator | mogged',
      heading: 'mogged reference-to-video',
      description:
        'Verwenden Sie mogged reference-to-video mit Bild-, Video- und Audio-Referenzen, wenn ein Prompt Stil, Bewegung und Kontinuität nicht stabil hält.',
      keywords:
        'mogged reference-to-video, multimodale Videogenerierung, Referenzvideo',
      featureList: [
        'Bild-, Video- und Audio-Referenzen in einem Workflow',
        'Multimodale Steuerung',
        'Einheitliche gehostete Route über mehrere Provider',
      ],
    },
  },
  fr: {
    'text-to-video': {
      metadataTitle: 'Générateur IA texte vers vidéo | mogged',
      heading: 'mogged text-to-video',
      description:
        'Générez des clips mogged text-to-video à partir de prompts dans un workflow hébergé pour plans conceptuels, storyboard et premières idées de mouvement.',
      keywords:
        'mogged text-to-video, prompt vers vidéo, génération vidéo mogged',
      featureList: [
        'Génération vidéo à partir du seul prompt',
        'Bascule Fast',
        'Contrôles audio et recherche web selon le provider',
      ],
    },
    'image-to-video': {
      metadataTitle: 'Générateur IA image vers vidéo | mogged',
      heading: 'mogged image-to-video',
      description:
        'Utilisez mogged image-to-video pour animer une première image et une dernière image optionnelle pour plans produit et continuité.',
      keywords:
        'mogged image-to-video, vidéo première image, animation dernière image',
      featureList: [
        'Contrôle de la première image et de la dernière image optionnelle',
        'Bascule Fast',
        'Contrôles de durée, résolution et ratio',
      ],
    },
    'reference-to-video': {
      metadataTitle: 'Générateur IA référence vers vidéo | mogged',
      heading: 'mogged reference-to-video',
      description:
        'Utilisez mogged reference-to-video avec image, vidéo et audio quand un seul prompt ne suffit pas à tenir mouvement, style et continuité.',
      keywords:
        'mogged reference-to-video, génération vidéo multimodale, vidéo de référence',
      featureList: [
        'Références image, vidéo et audio dans un seul workflow',
        'Surface de contrôle multimodale',
        'Route hébergée unifiée sur plusieurs providers',
      ],
    },
  },
  es: {
    'text-to-video': {
      metadataTitle: 'Generador IA de texto a video | mogged',
      heading: 'mogged text-to-video',
      description:
        'Genera clips de mogged text-to-video desde prompts en un flujo alojado para planos conceptuales, storyboard e ideas iniciales de movimiento.',
      keywords:
        'mogged text-to-video, prompt a video, generación de video mogged',
      featureList: [
        'Generación de video solo con prompt',
        'Interruptor Fast',
        'Controles de audio y búsqueda web cuando el proveedor lo permita',
      ],
    },
    'image-to-video': {
      metadataTitle: 'Generador IA de imagen a video | mogged',
      heading: 'mogged image-to-video',
      description:
        'Usa mogged image-to-video para animar un primer fotograma y uno final opcional en escenas de producto, continuidad y cámara controlada.',
      keywords:
        'mogged image-to-video, video con primer fotograma, animación con fotograma final',
      featureList: [
        'Control del primer fotograma y del último fotograma opcional',
        'Interruptor Fast',
        'Controles de duración, resolución y relación de aspecto',
      ],
    },
    'reference-to-video': {
      metadataTitle: 'Generador IA de referencia a video | mogged',
      heading: 'mogged reference-to-video',
      description:
        'Usa mogged reference-to-video con referencias de imagen, video y audio cuando un solo prompt no basta para sostener movimiento, estilo y continuidad.',
      keywords:
        'mogged reference-to-video, generación de video multimodal, video de referencia',
      featureList: [
        'Referencias de imagen, video y audio en un solo flujo',
        'Superficie de control multimodal',
        'Ruta alojada unificada entre varios proveedores',
      ],
    },
  },
  ja: {
    'text-to-video': {
      metadataTitle: 'テキストから動画 AIジェネレーター | mogged',
      heading: 'mogged text-to-video',
      description:
        'mogged text-to-video は、コンセプトショット、絵コンテ確認、最初の動きの方向出しに向いたホスト型ワークフローで、プロンプトから直接動画を生成します。',
      keywords:
        'mogged text-to-video, プロンプトから動画, mogged 動画生成',
      featureList: [
        'プロンプトのみで動画生成',
        'Fast 切り替え',
        '対応時のみ音声とウェブ検索の設定',
      ],
    },
    'image-to-video': {
      metadataTitle: '画像から動画 AIジェネレーター | mogged',
      heading: 'mogged image-to-video',
      description:
        'mogged image-to-video では、開始フレームと任意の終了フレームを使って、商品カット、連続性確認、制御しやすいカメラ移動を作れます。',
      keywords:
        'mogged image-to-video, 開始フレーム動画, 終了フレームアニメーション',
      featureList: [
        '開始フレームと任意の終了フレーム制御',
        'Fast 切り替え',
        '尺・解像度・アスペクト比の設定',
      ],
    },
    'reference-to-video': {
      metadataTitle: '参照から動画 AIジェネレーター | mogged',
      heading: 'mogged reference-to-video',
      description:
        'mogged reference-to-video は、ひとつのプロンプトだけでは動き、スタイル、連続性を保ちにくい時に、画像・動画・音声の参照を一緒に使えます。',
      keywords:
        'mogged reference-to-video, マルチモーダル動画生成, 参照動画',
      featureList: [
        '画像・動画・音声参照をひとつのワークフローに集約',
        'マルチモーダル制御',
        '複数プロバイダーをまたぐ統一ホストルート',
      ],
    },
  },
  it: {
    'text-to-video': {
      metadataTitle: 'Generatore AI da testo a video | mogged',
      heading: 'mogged text-to-video',
      description:
        'Genera clip mogged text-to-video da prompt in un workflow ospitato pensato per concept shot, test di storyboard e prime idee di movimento.',
      keywords:
        'mogged text-to-video, prompt in video, generazione video mogged',
      featureList: [
        'Generazione video solo da prompt',
        'Interruttore Fast',
        'Controlli audio e ricerca web quando supportati',
      ],
    },
    'image-to-video': {
      metadataTitle: 'Generatore AI da immagine a video | mogged',
      heading: 'mogged image-to-video',
      description:
        'Usa mogged image-to-video per animare un primo fotogramma e uno finale opzionale per scene prodotto, continuità e camera guidata.',
      keywords:
        'mogged image-to-video, video da primo fotogramma, animazione con fotogramma finale',
      featureList: [
        'Controllo del primo e dell’eventuale ultimo fotogramma',
        'Interruttore Fast',
        'Controlli su durata, risoluzione e aspect ratio',
      ],
    },
    'reference-to-video': {
      metadataTitle: 'Generatore AI da riferimento a video | mogged',
      heading: 'mogged reference-to-video',
      description:
        'Usa mogged reference-to-video con riferimenti immagine, video e audio quando un solo prompt non basta a mantenere movimento, stile e continuità.',
      keywords:
        'mogged reference-to-video, generazione video multimodale, video di riferimento',
      featureList: [
        'Riferimenti immagine, video e audio in un solo workflow',
        'Superficie di controllo multimodale',
        'Rotta ospitata unificata tra più provider',
      ],
    },
  },
  ko: {
    'text-to-video': {
      metadataTitle: '텍스트에서 비디오로 AI 생성기 | mogged',
      heading: 'mogged text-to-video',
      description:
        'mogged text-to-video는 콘셉트 샷, 스토리보드 테스트, 첫 모션 방향 확인에 맞춘 호스팅 워크플로에서 프롬프트만으로 영상을 생성합니다.',
      keywords:
        'mogged text-to-video, 프롬프트로 비디오 생성, mogged 비디오 생성',
      featureList: [
        '프롬프트 전용 비디오 생성',
        'Fast 토글',
        '지원 시 오디오 및 웹 검색 제어',
      ],
    },
    'image-to-video': {
      metadataTitle: '이미지에서 비디오로 AI 생성기 | mogged',
      heading: 'mogged image-to-video',
      description:
        'mogged image-to-video는 첫 프레임과 선택 가능한 마지막 프레임으로 제품 장면, 연속성 점검, 제어된 카메라 움직임을 만듭니다.',
      keywords:
        'mogged image-to-video, 첫 프레임 비디오, 마지막 프레임 애니메이션',
      featureList: [
        '첫 프레임과 선택형 마지막 프레임 제어',
        'Fast 토글',
        '길이, 해상도, 비율 제어',
      ],
    },
    'reference-to-video': {
      metadataTitle: '레퍼런스에서 비디오로 AI 생성기 | mogged',
      heading: 'mogged reference-to-video',
      description:
        'mogged reference-to-video는 한 줄 프롬프트만으로 모션, 스타일, 연속성을 잡기 어려울 때 이미지, 비디오, 오디오 레퍼런스를 함께 사용합니다.',
      keywords:
        'mogged reference-to-video, 멀티모달 비디오 생성, 레퍼런스 비디오',
      featureList: [
        '이미지, 비디오, 오디오 레퍼런스를 한 워크플로에 통합',
        '멀티모달 제어',
        '여러 공급자를 가로지르는 통합 호스팅 경로',
      ],
    },
  },
  ar: {
    'text-to-video': {
      metadataTitle: 'مولد نص إلى فيديو بالذكاء الاصطناعي | mogged',
      heading: 'mogged نص إلى فيديو',
      description:
        'يولّد mogged مقاطع نص إلى فيديو من الوصف مباشرة داخل سير عمل مستضاف مناسب للقطات المفاهيمية، وتجارب الستوري بورد، وأول أفكار الحركة.',
      keywords:
        'mogged نص إلى فيديو, تحويل الوصف إلى فيديو, توليد فيديو mogged',
      featureList: [
        'توليد فيديو بالوصف فقط',
        'الخيار السريع عند توفره',
        'عناصر تحكم للصوت والبحث على الويب عند الدعم',
      ],
    },
    'image-to-video': {
      metadataTitle: 'مولد صورة إلى فيديو بالذكاء الاصطناعي | mogged',
      heading: 'mogged صورة إلى فيديو',
      description:
        'استخدم mogged لمسار الصورة إلى فيديو لتحريك الإطار الأول وإطار أخير اختياري لمشاهد المنتج، وفحوصات الاستمرارية، وحركات الكاميرا الموجّهة.',
      keywords:
        'mogged صورة إلى فيديو, فيديو من الإطار الأول, تحريك الإطار الأخير',
      featureList: [
        'التحكم في الإطار الأول والإطار الأخير الاختياري',
        'الخيار السريع عند توفره',
        'عناصر تحكم للمدة والدقة ونسبة العرض',
      ],
    },
    'reference-to-video': {
      metadataTitle: 'مولد مرجع إلى فيديو بالذكاء الاصطناعي | mogged',
      heading: 'mogged مرجع إلى فيديو',
      description:
        'استخدم mogged لمسار المرجع إلى فيديو مع مراجع الصور والفيديو والصوت عندما لا تكفي مطالبة واحدة للحفاظ على الحركة والأسلوب والاستمرارية.',
      keywords:
        'mogged مرجع إلى فيديو, توليد فيديو متعدد الوسائط, فيديو مرجعي',
      featureList: [
        'مراجع الصور والفيديو والصوت في سير عمل واحد',
        'سطح تحكم متعدد الوسائط',
        'مسار مستضاف موحّد عبر عدة مزودين',
      ],
    },
  },
};

const ROOT_GENERATOR_FAQ_COPY: Record<GeneratorCopyLocale, GeneratorFaqCopy> = {
  en: {
    id: 'faq',
    label: 'Generator FAQ',
    title: 'mogged Video Generator FAQ',
    description:
      'Clear answers about workflows, input requirements, account access, timing, history, and recovery inside the hosted mogged video workspace.',
    items: [
      {
        question: 'What workflows are included in this generator?',
        answer:
          'The public generator includes text-to-video, image-to-video, and reference-to-video. Each route starts from a different input, but they share the same hosted mogged workspace.',
      },
      {
        question: 'Which video workflow should I start with?',
        answer:
          'Start with text-to-video when you only have a prompt. Use image-to-video when a still image should anchor the clip. Use reference-to-video when several images, videos, or optional audio should guide the result.',
      },
      {
        question: 'Do I need to sign in or pay before I generate a video?',
        answer:
          'You can browse the public pages without signing in. Account access matters when you need credits, saved history, or any workflow that requires account-backed generation.',
      },
      {
        question:
          'What files can I upload for image-to-video or reference-to-video?',
        answer:
          'Image-to-video starts from one source image and can optionally use a last frame. Reference-to-video accepts image URLs, video URLs, and optional audio URLs when the provider supports them.',
      },
      {
        question: 'How long does AI video generation take?',
        answer:
          'Generation time depends on provider load, clip settings, input complexity, and queue health. The workspace keeps polling task status so you can see when a job is still running or needs a retry.',
      },
      {
        question: 'Are generated videos saved to my account?',
        answer:
          'Signed-in tasks can appear in your activity history so you can review, refresh, and download results later. Guest behavior depends on the current quota and session rules.',
      },
      {
        question: 'What happens if a video task fails?',
        answer:
          'If a task fails or stalls, the status stays visible instead of disappearing. Retry with simpler inputs, change settings, or contact support with the task id for paid jobs that need review.',
      },
    ],
  },
  zh: {
    id: 'faq',
    label: '生成器 FAQ',
    title: 'mogged 视频生成器 FAQ',
    description:
      '围绕工作流选择、输入要求、账号门槛、生成时长、任务历史和失败处理的核心说明。',
    items: [
      {
        question: '这个生成器包含哪些工作流？',
        answer:
          '公开入口包含文生视频、图生视频和参考生视频。它们的起点输入不同，但都共用同一个托管式 mogged 视频工作台。',
      },
      {
        question: '我应该先选哪种视频工作流？',
        answer:
          '只有提示词时先走文生视频；需要一张静态图来锚定画面时走图生视频；当你希望多张图、视频，或可选音频一起控制结果时走参考生视频。',
      },
      {
        question: '生成视频前一定要登录或付费吗？',
        answer:
          '公开页面可以不登录直接看。只有当你需要账号积分、任务历史，或者该工作流要求账号侧生成时，登录或付费才会变得重要。',
      },
      {
        question: '图生视频和参考生视频分别能上传什么？',
        answer:
          '图生视频从一张源图开始，也可以选填尾帧。参考生视频支持图片 URL、视频 URL，以及 provider 支持时的可选音频 URL。',
      },
      {
        question: 'AI 视频生成一般要多久？',
        answer:
          '实际时间取决于上游负载、片段设置、输入复杂度和队列状态。工作台会持续轮询任务状态，让你知道任务是在运行、排队还是需要重试。',
      },
      {
        question: '生成出来的视频会保存到账户里吗？',
        answer:
          '登录用户的任务会出现在活动历史里，方便你后续查看、刷新和下载。访客行为则取决于当前额度和会话规则。',
      },
      {
        question: '如果视频任务失败了怎么办？',
        answer:
          '任务失败或卡住时，状态会保留，不会直接消失。你可以简化输入、调整设置后重试；如果是付费任务需要核查，就把 task id 发给支持。',
      },
    ],
  },
  de: {
    id: 'faq',
    label: 'Generator-FAQ',
    title: 'mogged KI-Videogenerator FAQ',
    description:
      'Klare Antworten zu Workflow-Wahl, Eingaben, Konto-Zugang, Dauer, Verlauf und Fehlerbehandlung im gehosteten Video-Workspace.',
    items: [
      {
        question: 'Welche Workflows sind in diesem Generator enthalten?',
        answer:
          'Der öffentliche Generator umfasst text-to-video, image-to-video und reference-to-video. Jeder Workflow startet mit einer anderen Eingabe, nutzt aber denselben gehosteten mogged Video-Workspace.',
      },
      {
        question: 'Mit welchem Video-Workflow sollte ich anfangen?',
        answer:
          'Starten Sie mit text-to-video, wenn Sie nur einen Prompt haben. Nutzen Sie image-to-video, wenn ein Standbild den Clip verankern soll. Nutzen Sie reference-to-video, wenn mehrere Bilder, Videos oder optional Audio das Ergebnis steuern sollen.',
      },
      {
        question:
          'Muss ich mich anmelden oder bezahlen, bevor ich ein Video generiere?',
        answer:
          'Die öffentlichen Seiten können Sie ohne Anmeldung ansehen. Ein Konto wird wichtig, wenn Sie Credits, gespeicherten Verlauf oder einen accountgebundenen Generierungsworkflow brauchen.',
      },
      {
        question:
          'Welche Dateien kann ich für image-to-video oder reference-to-video hochladen?',
        answer:
          'Image-to-video startet mit einem Quellbild und kann optional einen letzten Frame nutzen. Reference-to-video akzeptiert Bild-URLs, Video-URLs und optionale Audio-URLs, wenn der Provider dies unterstützt.',
      },
      {
        question: 'Wie lange dauert die KI-Videogenerierung?',
        answer:
          'Die Dauer hängt von Provider-Last, Clip-Einstellungen, Eingabekomplexität und Warteschlangenstatus ab. Der Workspace fragt den Status laufend ab, damit Sie sehen, ob ein Job läuft oder erneut versucht werden sollte.',
      },
      {
        question: 'Werden generierte Videos in meinem Konto gespeichert?',
        answer:
          'Aufgaben angemeldeter Nutzer können im Aktivitätsverlauf erscheinen, damit Sie Ergebnisse später prüfen, aktualisieren und herunterladen können. Das Verhalten für Gäste hängt von Quote und Sitzung ab.',
      },
      {
        question: 'Was passiert, wenn eine Video-Aufgabe fehlschlägt?',
        answer:
          'Wenn eine Aufgabe fehlschlägt oder hängen bleibt, bleibt ihr Status sichtbar. Versuchen Sie es mit einfacheren Eingaben oder geänderten Einstellungen erneut oder kontaktieren Sie den Support mit der Task-ID bei bezahlten Jobs.',
      },
    ],
  },
  fr: {
    id: 'faq',
    label: 'FAQ générateur',
    title: 'FAQ du générateur vidéo IA mogged',
    description:
      'Réponses claires sur le choix du workflow, les entrées, l’accès au compte, la durée, l’historique et la gestion des échecs dans le workspace vidéo hébergé.',
    items: [
      {
        question: 'Quels workflows sont inclus dans ce générateur ?',
        answer:
          'Le générateur public inclut text-to-video, image-to-video et reference-to-video. Chaque route démarre avec une entrée différente, mais toutes partagent le même workspace vidéo hébergé mogged.',
      },
      {
        question: 'Par quel workflow vidéo devrais-je commencer ?',
        answer:
          'Commencez par text-to-video si vous n’avez qu’un prompt. Utilisez image-to-video lorsqu’une image fixe doit servir d’ancrage. Utilisez reference-to-video quand plusieurs images, vidéos ou un audio facultatif doivent guider le résultat.',
      },
      {
        question: 'Dois-je me connecter ou payer avant de générer une vidéo ?',
        answer:
          'Vous pouvez parcourir les pages publiques sans connexion. Le compte devient important quand vous avez besoin de crédits, d’un historique sauvegardé ou d’un workflow de génération lié au compte.',
      },
      {
        question:
          'Quels fichiers puis-je envoyer pour image-to-video ou reference-to-video ?',
        answer:
          'Image-to-video démarre avec une image source et peut utiliser une dernière image facultative. Reference-to-video accepte des URL d’image, des URL de vidéo et des URL audio optionnelles lorsque le provider le permet.',
      },
      {
        question: 'Combien de temps prend la génération vidéo IA ?',
        answer:
          'La durée dépend de la charge du provider, des réglages du clip, de la complexité des entrées et de la file d’attente. Le workspace interroge en continu l’état de la tâche pour vous montrer si le job tourne encore ou s’il faut le relancer.',
      },
      {
        question:
          'Les vidéos générées sont-elles enregistrées dans mon compte ?',
        answer:
          'Les tâches des utilisateurs connectés peuvent apparaître dans l’historique d’activité pour être revues, rafraîchies et téléchargées plus tard. Le comportement invité dépend du quota et de la session en cours.',
      },
      {
        question: 'Que se passe-t-il si une tâche vidéo échoue ?',
        answer:
          'Si une tâche échoue ou reste bloquée, son statut reste visible. Réessayez avec des entrées plus simples ou d’autres réglages, ou contactez le support avec l’identifiant de tâche pour un job payant à examiner.',
      },
    ],
  },
  es: {
    id: 'faq',
    label: 'FAQ del generador',
    title: 'FAQ del generador de video AI de mogged',
    description:
      'Respuestas claras sobre elección de workflow, entradas, acceso de cuenta, tiempos, historial y recuperación dentro del workspace de video alojado.',
    items: [
      {
        question: '¿Qué workflows incluye este generador?',
        answer:
          'El generador público incluye text-to-video, image-to-video y reference-to-video. Cada ruta empieza desde una entrada distinta, pero todas comparten el mismo workspace de video alojado de mogged.',
      },
      {
        question: '¿Con qué workflow de video debería empezar?',
        answer:
          'Empieza con text-to-video si solo tienes un prompt. Usa image-to-video cuando una imagen fija deba anclar el clip. Usa reference-to-video cuando varias imágenes, videos o audio opcional deban guiar el resultado.',
      },
      {
        question: '¿Necesito iniciar sesión o pagar antes de generar un video?',
        answer:
          'Puedes navegar por las páginas públicas sin iniciar sesión. La cuenta importa cuando necesitas créditos, historial guardado o un workflow de generación ligado a la cuenta.',
      },
      {
        question:
          '¿Qué archivos puedo subir para image-to-video o reference-to-video?',
        answer:
          'Image-to-video parte de una imagen fuente y opcionalmente puede usar un último fotograma. Reference-to-video acepta URLs de imagen, URLs de video y URLs de audio opcionales cuando el proveedor lo admite.',
      },
      {
        question: '¿Cuánto tarda la generación de video con IA?',
        answer:
          'El tiempo depende de la carga del proveedor, la configuración del clip, la complejidad de la entrada y el estado de la cola. El workspace sigue consultando el estado para que veas si el trabajo sigue corriendo o necesita reintento.',
      },
      {
        question: '¿Los videos generados se guardan en mi cuenta?',
        answer:
          'Las tareas de usuarios conectados pueden aparecer en el historial de actividad para revisarlas, refrescarlas y descargarlas más tarde. El comportamiento de invitado depende de la cuota y de la sesión.',
      },
      {
        question: '¿Qué pasa si falla una tarea de video?',
        answer:
          'Si una tarea falla o se queda bloqueada, su estado sigue visible. Reintenta con entradas más simples o con otros ajustes, o contacta con soporte usando el task id si el trabajo pagado necesita revisión.',
      },
    ],
  },
  ja: {
    id: 'faq',
    label: 'ジェネレーター FAQ',
    title: 'mogged動画ジェネレーター FAQ',
    description:
      'ワークフロー選択、入力条件、アカウント要件、所要時間、履歴、失敗時の対処についての要点です。',
    items: [
      {
        question: 'このジェネレーターにはどのワークフローが含まれていますか？',
        answer:
          '公開ジェネレーターには text-to-video、image-to-video、reference-to-video が含まれます。入口になる入力は異なりますが、どれも同じ mogged のホスト型動画ワークスペースを使います。',
      },
      {
        question: '最初にどの動画ワークフローを選ぶべきですか？',
        answer:
          'プロンプトしかない場合は text-to-video、静止画を基準にしたい場合は image-to-video、複数の画像・動画・任意の音声で結果を導きたい場合は reference-to-video から始めてください。',
      },
      {
        question: '動画を生成する前にログインや支払いは必要ですか？',
        answer:
          '公開ページの閲覧にログインは不要です。クレジット、保存された履歴、またはアカウント紐付けの生成が必要な場合にアカウント利用が重要になります。',
      },
      {
        question:
          'image-to-video や reference-to-video では何をアップロードできますか？',
        answer:
          'image-to-video は 1 枚の元画像から始まり、任意で終了フレームを追加できます。reference-to-video は画像 URL、動画 URL、そしてプロバイダー対応時には任意の音声 URL を受け付けます。',
      },
      {
        question: 'AI動画生成にはどれくらい時間がかかりますか？',
        answer:
          '所要時間はプロバイダー負荷、クリップ設定、入力の複雑さ、キュー状況で変わります。ワークスペースは継続的に状態を確認するため、まだ実行中か再試行が必要かを把握できます。',
      },
      {
        question: '生成した動画はアカウントに保存されますか？',
        answer:
          'ログインユーザーのタスクは後から確認・更新・ダウンロードできるよう、アクティビティ履歴に表示されることがあります。ゲストの扱いは現在の枠とセッション条件に依存します。',
      },
      {
        question: '動画タスクが失敗したらどうなりますか？',
        answer:
          '失敗や停止が起きてもステータスは消えずに残ります。入力を簡素化したり設定を変えて再試行するか、有料ジョブの確認が必要なら task id を添えてサポートに連絡してください。',
      },
    ],
  },
  it: {
    id: 'faq',
    label: 'FAQ del generatore',
    title: 'FAQ del generatore video AI mogged',
    description:
      'Risposte chiare su scelta del workflow, input, accesso account, tempi, cronologia e recupero nel workspace video ospitato.',
    items: [
      {
        question: 'Quali workflow sono inclusi in questo generatore?',
        answer:
          'Il generatore pubblico include text-to-video, image-to-video e reference-to-video. Ogni route parte da un input diverso, ma tutte condividono lo stesso workspace video ospitato di mogged.',
      },
      {
        question: 'Con quale workflow video dovrei iniziare?',
        answer:
          'Inizia con text-to-video se hai solo un prompt. Usa image-to-video quando un’immagine fissa deve ancorare la clip. Usa reference-to-video quando più immagini, video o audio opzionale devono guidare il risultato.',
      },
      {
        question: 'Devo accedere o pagare prima di generare un video?',
        answer:
          'Puoi consultare le pagine pubbliche senza login. L’account diventa importante quando ti servono crediti, cronologia salvata o un workflow di generazione legato all’account.',
      },
      {
        question:
          'Quali file posso caricare per image-to-video o reference-to-video?',
        answer:
          'Image-to-video parte da una sola immagine sorgente e può usare facoltativamente un frame finale. Reference-to-video accetta URL immagine, URL video e URL audio opzionali quando il provider li supporta.',
      },
      {
        question: 'Quanto tempo richiede la generazione video con IA?',
        answer:
          'Il tempo dipende dal carico del provider, dalle impostazioni della clip, dalla complessità dell’input e dallo stato della coda. Il workspace continua a interrogare lo stato così puoi vedere se il job è ancora in corso o va ritentato.',
      },
      {
        question: 'I video generati vengono salvati nel mio account?',
        answer:
          'I task degli utenti autenticati possono comparire nella cronologia attività per essere rivisti, aggiornati e scaricati più tardi. Il comportamento da ospite dipende dalla quota e dalla sessione corrente.',
      },
      {
        question: 'Cosa succede se un task video fallisce?',
        answer:
          'Se un task fallisce o si blocca, il suo stato resta visibile. Riprova con input più semplici o impostazioni diverse, oppure contatta il supporto con il task id se un lavoro pagato richiede verifica.',
      },
    ],
  },
  ko: {
    id: 'faq',
    label: '생성기 FAQ',
    title: 'mogged 비디오 생성기 FAQ',
    description:
      '워크플로 선택, 입력 조건, 계정 접근, 생성 시간, 기록, 실패 복구에 대한 핵심 답변입니다.',
    items: [
      {
        question: '이 생성기에는 어떤 워크플로가 포함되나요?',
        answer:
          '공개 생성기에는 text-to-video, image-to-video, reference-to-video가 포함됩니다. 시작 입력은 다르지만 모두 같은 mogged 호스팅 비디오 워크스페이스를 사용합니다.',
      },
      {
        question: '어떤 비디오 워크플로부터 시작해야 하나요?',
        answer:
          '프롬프트만 있다면 text-to-video, 정지 이미지를 기준으로 삼고 싶다면 image-to-video, 여러 이미지·비디오·선택형 오디오로 결과를 유도하고 싶다면 reference-to-video로 시작하세요.',
      },
      {
        question: '비디오를 생성하기 전에 로그인이나 결제가 필요한가요?',
        answer:
          '공개 페이지는 로그인 없이 둘러볼 수 있습니다. 크레딧, 저장된 기록, 계정 기반 생성이 필요할 때 계정 접근이 중요해집니다.',
      },
      {
        question:
          'image-to-video나 reference-to-video에는 무엇을 올릴 수 있나요?',
        answer:
          'image-to-video는 원본 이미지 1장으로 시작하고 선택적으로 마지막 프레임을 추가할 수 있습니다. reference-to-video는 공급자가 지원할 때 이미지 URL, 비디오 URL, 선택형 오디오 URL을 받습니다.',
      },
      {
        question: 'AI 비디오 생성에는 얼마나 걸리나요?',
        answer:
          '소요 시간은 공급자 부하, 클립 설정, 입력 복잡도, 대기열 상태에 따라 달라집니다. 워크스페이스가 계속 상태를 확인하므로 작업이 아직 진행 중인지 재시도가 필요한지 알 수 있습니다.',
      },
      {
        question: '생성된 비디오는 내 계정에 저장되나요?',
        answer:
          '로그인 사용자의 작업은 나중에 검토, 새로고침, 다운로드할 수 있도록 활동 기록에 나타날 수 있습니다. 게스트 동작은 현재 할당량과 세션 규칙에 따라 달라집니다.',
      },
      {
        question: '비디오 작업이 실패하면 어떻게 되나요?',
        answer:
          '작업이 실패하거나 멈춰도 상태는 사라지지 않고 남습니다. 더 단순한 입력이나 다른 설정으로 다시 시도하거나, 유료 작업 검토가 필요하면 task id와 함께 지원팀에 문의하세요.',
      },
    ],
  },
  ar: {
    id: 'faq',
    label: 'الأسئلة الشائعة للمولد',
    title: 'الأسئلة الشائعة لمولد الفيديو بالذكاء الاصطناعي mogged',
    description:
      'إجابات واضحة حول اختيار سير العمل ومتطلبات الإدخال والوصول إلى الحساب والمدة والسجل والتعامل مع الفشل داخل مساحة الفيديو المستضافة.',
    items: [
      {
        question: 'ما مسارات العمل التي يتضمنها هذا المولد؟',
        answer:
          'يتضمن المولد العام مسارات text-to-video و image-to-video و reference-to-video. يبدأ كل مسار من نوع إدخال مختلف، لكنها جميعًا تستخدم مساحة الفيديو المستضافة نفسها من mogged.',
      },
      {
        question: 'بأي سير عمل فيديو ينبغي أن أبدأ؟',
        answer:
          'ابدأ بـ text-to-video إذا كان لديك وصف فقط. استخدم image-to-video عندما تريد لصورة ثابتة أن تكون نقطة ارتكاز للمشهد. واستخدم reference-to-video عندما تريد أن توجه النتيجة عدة صور أو فيديوهات أو صوت اختياري.',
      },
      {
        question: 'هل أحتاج إلى تسجيل الدخول أو الدفع قبل توليد فيديو؟',
        answer:
          'يمكنك تصفح الصفحات العامة بدون تسجيل دخول. يصبح الحساب مهمًا عندما تحتاج إلى أرصدة أو سجل محفوظ أو أي توليد يعتمد على الحساب.',
      },
      {
        question:
          'ما الملفات التي يمكنني رفعها في image-to-video أو reference-to-video؟',
        answer:
          'يبدأ image-to-video بصورة مصدر واحدة ويمكنه استخدام إطار أخير اختياري. ويقبل reference-to-video روابط الصور وروابط الفيديو وروابط الصوت الاختيارية عندما يدعمها المزود.',
      },
      {
        question: 'كم تستغرق عملية توليد الفيديو بالذكاء الاصطناعي؟',
        answer:
          'يعتمد الوقت على حمل المزود وإعدادات المقطع وتعقيد الإدخال وحالة الطابور. وتستمر مساحة العمل في الاستعلام عن الحالة حتى ترى ما إذا كانت المهمة ما تزال تعمل أو تحتاج إلى إعادة محاولة.',
      },
      {
        question: 'هل يتم حفظ الفيديوهات المولدة في حسابي؟',
        answer:
          'قد تظهر مهام المستخدمين المسجلين في سجل النشاط حتى يمكن مراجعتها وتحديثها وتنزيلها لاحقًا. أما سلوك الزوار فيعتمد على الحصة الحالية وقواعد الجلسة.',
      },
      {
        question: 'ماذا يحدث إذا فشلت مهمة فيديو؟',
        answer:
          'إذا فشلت المهمة أو توقفت فستظل حالتها مرئية بدل أن تختفي. أعد المحاولة بإدخالات أبسط أو إعدادات مختلفة، أو تواصل مع الدعم باستخدام task id إذا كانت المهمة المدفوعة تحتاج إلى مراجعة.',
      },
    ],
  },
};

const MODE_GENERATOR_FAQ_COPY: Record<
  GeneratorCopyLocale,
  Record<VideoGeneratorMode, GeneratorFaqCopy>
> = {
  en: {
    'text-to-video': {
      id: 'faq',
      label: 'Text to Video FAQ',
      title: 'mogged Text to Video FAQ',
      description:
        'Focused answers about prompt-led mogged video generation.',
      items: [
        {
          question: 'What is text-to-video best for?',
          answer:
            'Use text-to-video when you want to generate a video concept directly from prompt language without providing reference files.',
        },
        {
          question: 'How detailed should my prompt be?',
          answer:
            'Describe the subject, scene, camera movement, mood, and ending beat. Clear physical details usually work better than vague style words alone.',
        },
        {
          question: 'Can I add an image to text-to-video?',
          answer:
            'No. If an image should anchor the clip, switch to image-to-video. If several media references should guide the result, use reference-to-video.',
        },
        {
          question: 'What should I change when the first result is off?',
          answer:
            'Change one variable at a time: tighten the prompt, simplify the motion, adjust duration or Fast mode, then regenerate so you can see what actually improved.',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: 'Image to Video FAQ',
      title: 'mogged Image to Video FAQ',
      description:
        'Focused answers about first and last frame driven animation.',
      items: [
        {
          question: 'Do I need both first and last frame images?',
          answer:
            'No. The first frame is required. The last frame is optional and gives you stronger control over where the clip should end.',
        },
        {
          question: 'What kind of first frame works best?',
          answer:
            'Use a clear image with the subject, framing, and lighting you want to preserve. Blurry, tiny, or heavily compressed frames give the model less stable guidance.',
        },
        {
          question: 'When should I add a last frame?',
          answer:
            'Add a last frame when the ending pose, camera destination, product angle, or scene transition matters. Skip it when you only need a natural motion draft.',
        },
        {
          question: 'What if the image upload or URL fails?',
          answer:
            'Check file type, size, and whether the URL points directly to an accessible image. Convert or compress the file first if the browser or provider rejects it.',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: 'Reference to Video FAQ',
      title: 'mogged Reference to Video FAQ',
      description:
        'Focused answers about multimodal mogged reference workflows.',
      items: [
        {
          question: 'What can I upload in reference mode?',
          answer:
            'Reference mode accepts image URLs, video URLs, and optional audio URLs. It is designed for multimodal control rather than pure prompt-only generation.',
        },
        {
          question: 'When should I include audio?',
          answer:
            'Include audio only when rhythm, pacing, or sound behavior is part of the brief. Audio is optional and may be ignored by providers that do not support it.',
        },
        {
          question: 'How many references should I provide?',
          answer:
            'Use the smallest focused set that explains the visual direction. Too many conflicting references can make the provider choose the wrong detail to preserve.',
        },
        {
          question: 'What if a reference is not supported?',
          answer:
            'The route validates required inputs before submission. If a provider cannot use a media type, remove that reference, switch mode, or retry with a direct supported URL.',
        },
      ],
    },
  },
  zh: {
    'text-to-video': {
      id: 'faq',
      label: '文生视频 FAQ',
      title: 'mogged 文生视频 FAQ',
      description: '围绕提示词驱动视频生成的核心问题。',
      items: [
        {
          question: '文生视频最适合什么场景？',
          answer:
            '当你还没有参考素材，只想先把镜头语言、节奏感和大致创意跑出来时，优先用文生视频。',
        },
        {
          question: '提示词应该写到多细？',
          answer:
            '至少写清主体、场景、镜头运动、情绪和结尾动作。具体物理细节通常比只写几个风格词更稳定。',
        },
        {
          question: '文生视频里能加图片吗？',
          answer:
            '不能。如果需要图片锚定画面，请切到图生视频；如果要多种媒体一起参考，请用参考生视频。',
        },
        {
          question: '第一次结果不对该怎么改？',
          answer:
            '一次只改一个变量：收紧提示词、简化运动、调整时长或 Fast，再重新生成。这样才知道到底是哪一步变好了。',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: '图生视频 FAQ',
      title: 'mogged 图生视频 FAQ',
      description: '围绕首尾帧驱动视频生成的核心问题。',
      items: [
        {
          question: '图生视频一定要同时给首帧和尾帧吗？',
          answer:
            '不一定。首帧必填，尾帧可选。尾帧主要用来告诉模型“最后应该落在哪里”。',
        },
        {
          question: '什么样的首帧更适合图生视频？',
          answer:
            '首帧最好清晰、有明确主体、构图和光线。太糊、太小或过度压缩的图，会让模型更难稳定延展。',
        },
        {
          question: '什么时候应该加尾帧？',
          answer:
            '当结尾姿态、镜头落点、产品角度或场景转换很重要时加尾帧；如果只是先看自然运动草稿，可以不加。',
        },
        {
          question: '图片上传或 URL 失败怎么办？',
          answer:
            '先检查文件类型、大小，以及 URL 是否是可访问的图片直链。必要时先用浏览器工具转换或压缩再提交。',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: '参考生视频 FAQ',
      title: 'mogged 参考生视频 FAQ',
      description: '围绕多模态参考生成的核心问题。',
      items: [
        {
          question: '参考模式里能传哪些素材？',
          answer:
            '可以传图片、视频，音频是可选补充。它的目标是把多种参考一起喂给工作流，而不是只靠一句提示词。',
        },
        {
          question: '什么时候需要加音频？',
          answer:
            '只有当节奏、速度或声音行为是需求的一部分时才加音频。音频是可选项，遇到不支持的 provider 也可能不会生效。',
        },
        {
          question: '参考素材是不是越多越好？',
          answer:
            '不是。最好只给能说明方向的少量素材。参考太多而且互相冲突时，模型反而可能保错重点。',
        },
        {
          question: '某个参考素材不支持怎么办？',
          answer:
            '路由会先校验必要输入。遇到 provider 不支持的媒体类型，就移除该参考、换模式，或改用可直接访问的受支持 URL。',
        },
      ],
    },
  },
  de: {
    'text-to-video': {
      id: 'faq',
      label: 'Text-zu-Video-FAQ',
      title: 'mogged Text-zu-Video FAQ',
      description:
        'Fokussierte Antworten zur promptgesteuerten Videogenerierung.',
      items: [
        {
          question: 'Wofür eignet sich Text-zu-Video am besten?',
          answer:
            'Nutzen Sie Text-zu-Video, wenn Sie ein Videokonzept direkt aus dem Prompt entwickeln möchten, ohne Referenzdateien hochzuladen.',
        },
        {
          question: 'Wie detailliert sollte mein Prompt sein?',
          answer:
            'Beschreiben Sie Motiv, Szene, Kamerabewegung, Stimmung und Schlussmoment. Klare physische Details funktionieren meist besser als nur allgemeine Stilwörter.',
        },
        {
          question: 'Kann ich bei Text-zu-Video ein Bild hinzufügen?',
          answer:
            'Nein. Wenn ein Bild den Clip verankern soll, wechseln Sie zu image-to-video. Wenn mehrere Medien das Ergebnis steuern sollen, nutzen Sie reference-to-video.',
        },
        {
          question:
            'Was sollte ich ändern, wenn das erste Ergebnis nicht passt?',
          answer:
            'Ändern Sie immer nur eine Variable: Prompt präzisieren, Bewegung vereinfachen, Dauer oder Fast-Modus anpassen und dann neu generieren.',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: 'Bild-zu-Video-FAQ',
      title: 'mogged Bild-zu-Video FAQ',
      description:
        'Fokussierte Antworten zu Animationen mit Start- und Endframe.',
      items: [
        {
          question: 'Brauche ich sowohl ein Start- als auch ein Endbild?',
          answer:
            'Nein. Das Startbild ist erforderlich. Das Endbild ist optional und gibt mehr Kontrolle darüber, wie der Clip enden soll.',
        },
        {
          question: 'Welche Art von Startbild funktioniert am besten?',
          answer:
            'Verwenden Sie ein klares Bild mit Motiv, Bildausschnitt und Licht, die erhalten bleiben sollen. Unscharfe, kleine oder stark komprimierte Bilder liefern weniger stabile Vorgaben.',
        },
        {
          question: 'Wann sollte ich ein Endbild hinzufügen?',
          answer:
            'Fügen Sie ein Endbild hinzu, wenn Endpose, Kameraziel, Produktwinkel oder Szenenwechsel wichtig sind. Lassen Sie es weg, wenn Sie nur einen natürlichen Bewegungsentwurf brauchen.',
        },
        {
          question: 'Was, wenn Bild-Upload oder URL fehlschlagen?',
          answer:
            'Prüfen Sie Dateityp, Größe und ob die URL direkt auf ein Bild zeigt. Konvertieren oder komprimieren Sie die Datei zuerst, wenn Browser oder Provider sie ablehnen.',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: 'Referenz-zu-Video-FAQ',
      title: 'mogged Referenz-zu-Video FAQ',
      description: 'Fokussierte Antworten zu multimodalen Referenz-Workflows.',
      items: [
        {
          question: 'Was kann ich im Referenzmodus hochladen?',
          answer:
            'Der Referenzmodus akzeptiert Bild-URLs, Video-URLs und optionale Audio-URLs. Er ist für multimodale Steuerung gedacht und nicht nur für reine Prompt-Generierung.',
        },
        {
          question: 'Wann sollte ich Audio hinzufügen?',
          answer:
            'Fügen Sie Audio nur hinzu, wenn Rhythmus, Tempo oder Klangverhalten Teil des Briefings sind. Audio ist optional und kann von nicht unterstützenden Providern ignoriert werden.',
        },
        {
          question: 'Wie viele Referenzen sollte ich angeben?',
          answer:
            'Nutzen Sie nur die kleinste fokussierte Auswahl, die die Richtung erklärt. Zu viele widersprüchliche Referenzen können falsche Details in den Vordergrund rücken.',
        },
        {
          question: 'Was, wenn eine Referenz nicht unterstützt wird?',
          answer:
            'Die Route prüft nötige Eingaben vor dem Absenden. Wenn ein Provider einen Medientyp nicht nutzen kann, entfernen Sie diese Referenz, wechseln den Modus oder verwenden eine direkt unterstützte URL.',
        },
      ],
    },
  },
  fr: {
    'text-to-video': {
      id: 'faq',
      label: 'FAQ texte en vidéo',
      title: 'FAQ mogged texte en vidéo',
      description:
        'Réponses ciblées sur la génération vidéo guidée par prompt.',
      items: [
        {
          question: 'Dans quels cas le texte en vidéo est-il le plus utile ?',
          answer:
            'Utilisez ce mode lorsque vous voulez créer un concept vidéo directement depuis un prompt, sans fichiers de référence.',
        },
        {
          question: 'À quel niveau de détail dois-je écrire mon prompt ?',
          answer:
            'Décrivez le sujet, la scène, le mouvement de caméra, l’ambiance et la fin du plan. Les détails physiques précis donnent généralement de meilleurs résultats que de vagues mots de style.',
        },
        {
          question: 'Puis-je ajouter une image au mode texte en vidéo ?',
          answer:
            'Non. Si une image doit servir d’ancrage, passez à image-to-video. Si plusieurs médias doivent guider le résultat, utilisez reference-to-video.',
        },
        {
          question: 'Que changer si le premier résultat ne convient pas ?',
          answer:
            'Modifiez une seule variable à la fois : le prompt, la simplicité du mouvement, la durée ou le mode Fast, puis régénérez.',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: 'FAQ image en vidéo',
      title: 'FAQ mogged image en vidéo',
      description:
        'Réponses ciblées sur l’animation guidée par première et dernière image.',
      items: [
        {
          question:
            'Ai-je besoin à la fois d’une première et d’une dernière image ?',
          answer:
            'Non. La première image est obligatoire. La dernière est optionnelle et donne plus de contrôle sur la fin du clip.',
        },
        {
          question: 'Quel type de première image fonctionne le mieux ?',
          answer:
            'Utilisez une image nette avec le sujet, le cadrage et la lumière que vous souhaitez préserver. Les images floues, minuscules ou très compressées guident moins bien le modèle.',
        },
        {
          question: 'Quand faut-il ajouter une dernière image ?',
          answer:
            'Ajoutez-la quand la pose finale, la destination de la caméra, l’angle produit ou la transition de scène comptent. Laissez-la vide pour un brouillon de mouvement plus naturel.',
        },
        {
          question: 'Que faire si l’upload ou l’URL d’image échoue ?',
          answer:
            'Vérifiez le type de fichier, sa taille et le fait que l’URL pointe directement vers une image accessible. Convertissez ou compressez d’abord le fichier si nécessaire.',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: 'FAQ référence en vidéo',
      title: 'FAQ mogged référence en vidéo',
      description:
        'Réponses ciblées sur les workflows de référence multimodaux.',
      items: [
        {
          question: 'Que puis-je envoyer en mode référence ?',
          answer:
            'Le mode référence accepte des URL d’image, des URL de vidéo et des URL audio facultatives. Il est conçu pour un contrôle multimodal, pas pour une simple génération par prompt.',
        },
        {
          question: 'Quand dois-je inclure de l’audio ?',
          answer:
            'Ajoutez de l’audio uniquement si le rythme, la vitesse ou le comportement sonore font partie du brief. L’audio reste optionnel et peut être ignoré par certains providers.',
        },
        {
          question: 'Combien de références dois-je fournir ?',
          answer:
            'Utilisez le plus petit ensemble possible qui explique clairement la direction visuelle. Trop de références contradictoires peuvent pousser le provider à conserver le mauvais détail.',
        },
        {
          question:
            'Que se passe-t-il si une référence n’est pas prise en charge ?',
          answer:
            'La route valide les entrées requises avant l’envoi. Si un provider ne peut pas utiliser un type de média, retirez cette référence, changez de mode ou essayez une URL directement compatible.',
        },
      ],
    },
  },
  es: {
    'text-to-video': {
      id: 'faq',
      label: 'FAQ de texto a video',
      title: 'FAQ de mogged texto a video',
      description:
        'Respuestas centradas en la generación de video guiada por prompt.',
      items: [
        {
          question: '¿Para qué sirve mejor texto a video?',
          answer:
            'Úsalo cuando quieras crear un concepto de video directamente desde el prompt sin aportar archivos de referencia.',
        },
        {
          question: '¿Cuánto detalle debería tener mi prompt?',
          answer:
            'Describe el sujeto, la escena, el movimiento de cámara, el ambiente y el momento final. Los detalles físicos claros suelen funcionar mejor que palabras de estilo demasiado vagas.',
        },
        {
          question: '¿Puedo añadir una imagen en texto a video?',
          answer:
            'No. Si una imagen debe anclar el clip, cambia a image-to-video. Si varios medios deben guiar el resultado, usa reference-to-video.',
        },
        {
          question: '¿Qué debería cambiar si el primer resultado sale mal?',
          answer:
            'Cambia solo una variable cada vez: el prompt, la simplicidad del movimiento, la duración o el modo Fast, y luego vuelve a generar.',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: 'FAQ de imagen a video',
      title: 'FAQ de mogged imagen a video',
      description:
        'Respuestas centradas en la animación guiada por fotograma inicial y final.',
      items: [
        {
          question: '¿Necesito a la vez imagen inicial e imagen final?',
          answer:
            'No. La imagen inicial es obligatoria. La final es opcional y te da más control sobre cómo debe terminar el clip.',
        },
        {
          question: '¿Qué tipo de imagen inicial funciona mejor?',
          answer:
            'Usa una imagen clara con el sujeto, el encuadre y la luz que quieres conservar. Las imágenes borrosas, pequeñas o muy comprimidas dan una guía menos estable.',
        },
        {
          question: '¿Cuándo debería añadir una imagen final?',
          answer:
            'Añádela cuando importe la pose final, el destino de la cámara, el ángulo del producto o la transición de escena. Déjala fuera si solo quieres un borrador de movimiento natural.',
        },
        {
          question: '¿Qué pasa si falla la subida o la URL de la imagen?',
          answer:
            'Revisa tipo de archivo, tamaño y que la URL apunte directamente a una imagen accesible. Convierte o comprime primero el archivo si hace falta.',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: 'FAQ de referencia a video',
      title: 'FAQ de mogged referencia a video',
      description:
        'Respuestas centradas en workflows de referencia multimodales.',
      items: [
        {
          question: '¿Qué puedo subir en modo referencia?',
          answer:
            'El modo referencia acepta URLs de imagen, URLs de video y URLs de audio opcionales. Está pensado para control multimodal, no para una generación solo con prompt.',
        },
        {
          question: '¿Cuándo debería incluir audio?',
          answer:
            'Incluye audio solo cuando el ritmo, la velocidad o el comportamiento sonoro formen parte del encargo. El audio es opcional y algunos proveedores pueden ignorarlo.',
        },
        {
          question: '¿Cuántas referencias debería aportar?',
          answer:
            'Usa el conjunto más pequeño y enfocado que explique la dirección visual. Demasiadas referencias en conflicto pueden hacer que el proveedor preserve el detalle equivocado.',
        },
        {
          question: '¿Qué pasa si una referencia no está soportada?',
          answer:
            'La ruta valida las entradas necesarias antes de enviar. Si un proveedor no admite un tipo de medio, elimina esa referencia, cambia de modo o prueba con una URL compatible.',
        },
      ],
    },
  },
  ja: {
    'text-to-video': {
      id: 'faq',
      label: 'テキストから動画へのFAQ',
      title: 'mogged テキストから動画へのFAQ',
      description: 'プロンプト主導の動画生成に絞った回答です。',
      items: [
        {
          question: 'テキストから動画への生成はどんな場面に向いていますか？',
          answer:
            '参照素材を使わず、プロンプトだけから動画コンセプトを作りたいときに向いています。',
        },
        {
          question: 'プロンプトはどれくらい詳しく書くべきですか？',
          answer:
            '被写体、シーン、カメラの動き、雰囲気、最後の見せ場を具体的に書いてください。曖昧なスタイル語だけより、物理的なディテールの方が安定しやすいです。',
        },
        {
          question: 'テキストから動画のモードに画像を追加できますか？',
          answer:
            'できません。画像で画面を固定したいなら image-to-video、複数のメディアで結果を導きたいなら reference-to-video を使ってください。',
        },
        {
          question: '最初の結果がずれていたら何を変えるべきですか？',
          answer:
            'プロンプト、動きの複雑さ、尺、Fast モードのどれか一つだけを変えて再生成してください。',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: '画像から動画へのFAQ',
      title: 'mogged 画像から動画へのFAQ',
      description: '開始フレームと終了フレーム主導の生成についての回答です。',
      items: [
        {
          question: '開始画像と終了画像の両方が必要ですか？',
          answer:
            'いいえ。開始画像は必須ですが、終了画像は任意です。終了地点を強くコントロールしたいときに使います。',
        },
        {
          question: 'どのような開始画像が向いていますか？',
          answer:
            '保持したい被写体、構図、光がはっきりした鮮明な画像が向いています。ぼやけた画像、小さすぎる画像、圧縮の強い画像は安定しにくくなります。',
        },
        {
          question: 'いつ終了画像を追加すべきですか？',
          answer:
            '最後のポーズ、カメラの到達点、商品角度、シーン転換が重要なときに追加してください。自然な動きの下書きだけなら省略できます。',
        },
        {
          question: '画像アップロードや URL が失敗したらどうすればいいですか？',
          answer:
            'ファイル形式、サイズ、URL が直接画像を指しているかを確認してください。必要なら先に変換や圧縮を行ってください。',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: '参照から動画へのFAQ',
      title: 'mogged 参照から動画へのFAQ',
      description: 'マルチモーダル参照ワークフローに絞った回答です。',
      items: [
        {
          question: '参照モードには何をアップロードできますか？',
          answer:
            '参照モードでは画像 URL、動画 URL、そして任意の音声 URL を使えます。単なるプロンプト生成ではなく、複数の参照で結果を制御するためのモードです。',
        },
        {
          question: '音声はどんなときに追加すべきですか？',
          answer:
            'リズム、テンポ、音の振る舞いが要件に含まれるときだけ追加してください。音声は任意で、対応していないプロバイダーでは無視されることがあります。',
        },
        {
          question: '参照は何件くらい入れるべきですか？',
          answer:
            '方向性を伝えるのに必要最小限のセットに絞ってください。相反する参照が多すぎると、保持されるべきでない細部が優先されることがあります。',
        },
        {
          question: '参照素材がサポートされていない場合は？',
          answer:
            '送信前に必要入力は検証されます。プロバイダーがそのメディアを使えない場合は、該当参照を外すか、モードを変えるか、対応 URL で再試行してください。',
        },
      ],
    },
  },
  it: {
    'text-to-video': {
      id: 'faq',
      label: 'FAQ testo in video',
      title: 'FAQ di mogged testo in video',
      description:
        'Risposte focalizzate sulla generazione video guidata da prompt.',
      items: [
        {
          question: 'In quali casi è più adatto il testo in video?',
          answer:
            'Usalo quando vuoi creare un concetto video direttamente dal prompt senza caricare file di riferimento.',
        },
        {
          question: 'Quanto dettagliato dovrebbe essere il prompt?',
          answer:
            'Descrivi soggetto, scena, movimento di camera, atmosfera e momento finale. I dettagli fisici chiari funzionano meglio di parole di stile troppo generiche.',
        },
        {
          question: 'Posso aggiungere un’immagine nel testo in video?',
          answer:
            'No. Se un’immagine deve ancorare la clip, passa a image-to-video. Se più media devono guidare il risultato, usa reference-to-video.',
        },
        {
          question: 'Cosa dovrei cambiare se il primo risultato non va bene?',
          answer:
            'Cambia una sola variabile alla volta: prompt, semplicità del movimento, durata o modalità Fast, poi rigenera.',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: 'FAQ immagine in video',
      title: 'FAQ di mogged immagine in video',
      description:
        'Risposte focalizzate sull’animazione guidata da primo e ultimo frame.',
      items: [
        {
          question: 'Mi servono sia il primo sia l’ultimo frame?',
          answer:
            'No. Il primo frame è obbligatorio. L’ultimo è facoltativo e ti dà più controllo su come deve chiudersi la clip.',
        },
        {
          question: 'Che tipo di primo frame funziona meglio?',
          answer:
            'Usa un’immagine nitida con soggetto, inquadratura e luce che vuoi preservare. Immagini sfocate, piccole o troppo compresse guidano peggio il modello.',
        },
        {
          question: 'Quando dovrei aggiungere un ultimo frame?',
          answer:
            'Aggiungilo quando contano posa finale, destinazione della camera, angolo prodotto o transizione di scena. Lascialo vuoto se vuoi solo una bozza di movimento naturale.',
        },
        {
          question:
            'Cosa succede se caricamento o URL dell’immagine falliscono?',
          answer:
            'Controlla tipo file, dimensione e che l’URL punti direttamente a un’immagine accessibile. Converti o comprimi prima il file se necessario.',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: 'FAQ riferimento in video',
      title: 'FAQ di mogged riferimento in video',
      description:
        'Risposte focalizzate sui workflow di riferimento multimodali.',
      items: [
        {
          question: 'Cosa posso caricare in modalità riferimento?',
          answer:
            'La modalità riferimento accetta URL immagine, URL video e URL audio opzionali. È pensata per il controllo multimodale, non per la sola generazione da prompt.',
        },
        {
          question: 'Quando dovrei includere l’audio?',
          answer:
            'Aggiungi audio solo quando ritmo, velocità o comportamento sonoro fanno parte del brief. L’audio è facoltativo e alcuni provider potrebbero ignorarlo.',
        },
        {
          question: 'Quanti riferimenti dovrei fornire?',
          answer:
            'Usa il set più piccolo e focalizzato che spieghi la direzione visiva. Troppi riferimenti in conflitto possono far preservare il dettaglio sbagliato.',
        },
        {
          question: 'Cosa succede se un riferimento non è supportato?',
          answer:
            'La route valida gli input richiesti prima dell’invio. Se un provider non può usare quel media, rimuovi il riferimento, cambia modalità o riprova con un URL supportato.',
        },
      ],
    },
  },
  ko: {
    'text-to-video': {
      id: 'faq',
      label: '텍스트 영상 생성 FAQ',
      title: 'mogged 텍스트 영상 생성 FAQ',
      description: '프롬프트 기반 비디오 생성에 대한 핵심 답변입니다.',
      items: [
        {
          question: '텍스트 영상 생성은 어떤 상황에 가장 잘 맞나요?',
          answer:
            '참고 파일 없이 프롬프트만으로 비디오 콘셉트를 만들고 싶을 때 사용하세요.',
        },
        {
          question: '프롬프트는 얼마나 자세해야 하나요?',
          answer:
            '주제, 장면, 카메라 움직임, 분위기, 마지막 장면을 구체적으로 적으세요. 막연한 스타일 단어보다 물리적인 디테일이 더 안정적으로 작동합니다.',
        },
        {
          question: '텍스트 영상 생성에 이미지를 추가할 수 있나요?',
          answer:
            '아니요. 이미지가 장면을 고정해야 한다면 image-to-video로, 여러 매체가 결과를 이끌어야 한다면 reference-to-video로 바꾸세요.',
        },
        {
          question: '첫 결과가 어긋나면 무엇을 바꿔야 하나요?',
          answer:
            '프롬프트, 움직임의 단순화, 길이, Fast 모드 중 하나만 바꿔 다시 생성하세요.',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: '이미지 영상 생성 FAQ',
      title: 'mogged 이미지 영상 생성 FAQ',
      description:
        '첫 프레임과 마지막 프레임 기반 애니메이션에 대한 답변입니다.',
      items: [
        {
          question: '첫 프레임과 마지막 프레임이 둘 다 필요한가요?',
          answer:
            '아니요. 첫 프레임은 필수이고 마지막 프레임은 선택입니다. 마지막 장면을 더 강하게 제어하고 싶을 때 사용합니다.',
        },
        {
          question: '어떤 첫 프레임이 가장 잘 맞나요?',
          answer:
            '유지하고 싶은 피사체, 구도, 조명이 분명한 선명한 이미지를 사용하세요. 흐리거나 너무 작거나 압축이 심한 이미지는 안내력이 약합니다.',
        },
        {
          question: '언제 마지막 프레임을 추가해야 하나요?',
          answer:
            '끝 포즈, 카메라 도착점, 제품 각도, 장면 전환이 중요할 때 추가하세요. 자연스러운 움직임 초안만 원하면 생략해도 됩니다.',
        },
        {
          question: '이미지 업로드나 URL이 실패하면 어떻게 하나요?',
          answer:
            '파일 형식, 크기, URL이 접근 가능한 직접 이미지인지 확인하세요. 필요하면 먼저 변환하거나 압축하세요.',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: '레퍼런스 영상 생성 FAQ',
      title: 'mogged 레퍼런스 영상 생성 FAQ',
      description: '멀티모달 레퍼런스 워크플로에 대한 핵심 답변입니다.',
      items: [
        {
          question: '레퍼런스 모드에는 무엇을 업로드할 수 있나요?',
          answer:
            '레퍼런스 모드는 이미지 URL, 비디오 URL, 선택형 오디오 URL을 받습니다. 순수 프롬프트 생성이 아니라 멀티모달 제어를 위한 모드입니다.',
        },
        {
          question: '오디오는 언제 넣어야 하나요?',
          answer:
            '리듬, 속도, 사운드 동작이 요구사항에 포함될 때만 추가하세요. 오디오는 선택 사항이며 일부 공급자는 무시할 수 있습니다.',
        },
        {
          question: '레퍼런스는 몇 개나 넣는 것이 좋나요?',
          answer:
            '시각적 방향을 설명하는 데 필요한 최소한의 세트만 사용하세요. 서로 충돌하는 레퍼런스가 너무 많으면 잘못된 디테일이 보존될 수 있습니다.',
        },
        {
          question: '지원되지 않는 레퍼런스가 있으면 어떻게 되나요?',
          answer:
            '전송 전에 필수 입력을 검증합니다. 공급자가 그 미디어를 쓸 수 없으면 해당 레퍼런스를 빼거나, 모드를 바꾸거나, 지원되는 URL로 다시 시도하세요.',
        },
      ],
    },
  },
  ar: {
    'text-to-video': {
      id: 'faq',
      label: 'الأسئلة الشائعة لمسار النص إلى فيديو',
      title: 'الأسئلة الشائعة لـ mogged نص إلى فيديو',
      description: 'إجابات مركزة حول توليد الفيديو المعتمد على الوصف.',
      items: [
        {
          question: 'متى يكون النص إلى فيديو هو الخيار الأنسب؟',
          answer:
            'استخدم هذا المسار عندما تريد إنشاء مفهوم فيديو مباشرة من الوصف من دون رفع ملفات مرجعية.',
        },
        {
          question: 'إلى أي حد يجب أن تكون المطالبة مفصلة؟',
          answer:
            'اذكر الموضوع والمشهد وحركة الكاميرا والإحساس واللقطة النهائية. غالبًا ما تعمل التفاصيل المادية الواضحة أفضل من كلمات الأسلوب العامة.',
        },
        {
          question: 'هل يمكنني إضافة صورة إلى النص إلى فيديو؟',
          answer:
            'لا. إذا كان يجب أن تثبّت صورة المشهد فانتقل إلى image-to-video. وإذا كانت عدة وسائط يجب أن توجه النتيجة فاستخدم reference-to-video.',
        },
        {
          question: 'ما الذي يجب أن أغيّره إذا كانت النتيجة الأولى غير مناسبة؟',
          answer:
            'غيّر متغيرًا واحدًا فقط في كل مرة: صياغة المطالبة أو بساطة الحركة أو المدة أو وضع Fast ثم أعد التوليد.',
        },
      ],
    },
    'image-to-video': {
      id: 'faq',
      label: 'الأسئلة الشائعة لمسار الصورة إلى فيديو',
      title: 'الأسئلة الشائعة لـ mogged صورة إلى فيديو',
      description: 'إجابات مركزة حول التحريك المعتمد على الإطار الأول والأخير.',
      items: [
        {
          question: 'هل أحتاج إلى الإطار الأول والأخير معًا؟',
          answer:
            'لا. الإطار الأول مطلوب، أما الإطار الأخير فاختياري ويمنحك تحكمًا أكبر في نهاية المقطع.',
        },
        {
          question: 'ما نوع الإطار الأول الذي يعمل بشكل أفضل؟',
          answer:
            'استخدم صورة واضحة فيها الموضوع والإطار والإضاءة التي تريد الحفاظ عليها. الصور الضبابية أو الصغيرة جدًا أو المضغوطة بشدة تعطي توجيهًا أضعف.',
        },
        {
          question: 'متى ينبغي أن أضيف إطارًا أخيرًا؟',
          answer:
            'أضفه عندما تكون وضعية النهاية أو وجهة الكاميرا أو زاوية المنتج أو انتقال المشهد مهمة. واتركه فارغًا إذا كنت تحتاج فقط إلى مسودة حركة طبيعية.',
        },
        {
          question: 'ماذا لو فشل رفع الصورة أو رابطها؟',
          answer:
            'تحقق من نوع الملف وحجمه ومن أن الرابط يشير مباشرة إلى صورة متاحة. حوّل الملف أو اضغطه أولًا إذا لزم الأمر.',
        },
      ],
    },
    'reference-to-video': {
      id: 'faq',
      label: 'الأسئلة الشائعة لمسار المرجع إلى فيديو',
      title: 'الأسئلة الشائعة لـ mogged مرجع إلى فيديو',
      description: 'إجابات مركزة حول سير عمل المراجع متعددة الوسائط.',
      items: [
        {
          question: 'ماذا يمكنني رفعه في وضع المرجع؟',
          answer:
            'يقبل وضع المرجع روابط الصور وروابط الفيديو وروابط الصوت الاختيارية. وقد صُمم للتحكم متعدد الوسائط لا للتوليد المعتمد على الوصف فقط.',
        },
        {
          question: 'متى ينبغي أن أضيف صوتًا؟',
          answer:
            'أضف الصوت فقط عندما يكون الإيقاع أو السرعة أو السلوك الصوتي جزءًا من الطلب. الصوت اختياري وقد تتجاهله بعض الجهات المزودة.',
        },
        {
          question: 'كم عدد المراجع التي ينبغي أن أوفرها؟',
          answer:
            'استخدم أصغر مجموعة مركزة تشرح الاتجاه البصري بوضوح. كثرة المراجع المتعارضة قد تجعل المزود يحافظ على التفصيل الخاطئ.',
        },
        {
          question: 'ماذا لو لم يكن أحد المراجع مدعومًا؟',
          answer:
            'يتحقق المسار من المدخلات المطلوبة قبل الإرسال. إذا لم يتمكن المزود من استخدام نوع الوسائط هذا، فاحذف المرجع أو غيّر الوضع أو أعد المحاولة برابط مدعوم مباشرة.',
        },
      ],
    },
  },
};

export function getGeneratorRootSeoCopy(locale?: string) {
  const normalizedLocale = normalizeGeneratorCopyLocale(locale);

  return replaceBrandTokensDeep(
    localizeAllGeneratorModesValue(
      ROOT_GENERATOR_SEO_COPY[normalizedLocale],
      normalizedLocale
    )
  );
}

export function getGeneratorModeSeoCopy(
  locale: string,
  mode: VideoGeneratorMode
) {
  const normalizedLocale = normalizeGeneratorCopyLocale(locale);

  return replaceBrandTokensDeep(
    localizeGeneratorModeValue(
      MODE_GENERATOR_SEO_COPY[normalizedLocale][mode],
      normalizedLocale,
      mode
    )
  );
}

export function getGeneratorRootFaqCopy(locale?: string) {
  const normalizedLocale = normalizeGeneratorCopyLocale(locale);

  return replaceBrandTokensDeep(
    localizeAllGeneratorModesValue(
      ROOT_GENERATOR_FAQ_COPY[normalizedLocale],
      normalizedLocale
    )
  );
}

export function getGeneratorModeFaqCopy(
  locale: string,
  mode: VideoGeneratorMode
) {
  const normalizedLocale = normalizeGeneratorCopyLocale(locale);

  return replaceBrandTokensDeep(
    localizeGeneratorModeValue(
      MODE_GENERATOR_FAQ_COPY[normalizedLocale][mode],
      normalizedLocale,
      mode
    )
  );
}

export function getGeneratorRootNarrativeCopy(locale?: string) {
  const normalizedLocale = normalizeGeneratorCopyLocale(locale);
  const messages = AI_VIDEO_MESSAGES[normalizedLocale];
  const rootCopy = getGeneratorRootSeoCopy(normalizedLocale);
  const rootFaq = getGeneratorRootFaqCopy(normalizedLocale);

  const sections: GeneratorSeoNarrativeSection[] = [
    {
      title: messages.page.title || rootCopy.heading,
      paragraphs: compactTextList([
        messages.page.description,
        rootCopy.description,
        messages.generator.description,
        rootFaq.description,
      ]),
      bullets: rootCopy.featureList,
    },
    ...VIDEO_GENERATOR_MODES.map((mode) => {
      const modeCopy = getGeneratorModeSeoCopy(normalizedLocale, mode);
      const modeFaq = getGeneratorModeFaqCopy(normalizedLocale, mode);

      return {
        title: modeCopy.heading,
        paragraphs: compactTextList([
          modeCopy.description,
          modeFaq.description,
          modeFaq.items?.[0]?.answer,
        ]),
        bullets: modeCopy.featureList,
      };
    }),
    {
      title: rootFaq.title || rootCopy.heading,
      paragraphs: getFaqNarrativeParagraphs(rootFaq),
    },
  ];

  return replaceBrandTokensDeep(finalizeNarrative(sections));
}

export function getGeneratorModeNarrativeCopy(
  locale: string,
  mode: VideoGeneratorMode
) {
  const normalizedLocale = normalizeGeneratorCopyLocale(locale);
  const messages = AI_VIDEO_MESSAGES[normalizedLocale];
  const rootCopy = getGeneratorRootSeoCopy(normalizedLocale);
  const rootFaq = getGeneratorRootFaqCopy(normalizedLocale);
  const modeCopy = getGeneratorModeSeoCopy(normalizedLocale, mode);
  const modeFaq = getGeneratorModeFaqCopy(normalizedLocale, mode);
  const siblingModes = VIDEO_GENERATOR_MODES.filter((value) => value !== mode);
  const sectionTitles =
    MODE_NARRATIVE_SECTION_TITLES[normalizedLocale]?.[mode] ?? {
      overviewTitle: modeCopy.heading,
      workspaceTitle: messages.generator.title || rootCopy.heading,
      switchTitle: modeFaq.title || modeCopy.heading,
    };

  const sections: GeneratorSeoNarrativeSection[] = [
    {
      title: sectionTitles.overviewTitle,
      paragraphs: compactTextList([
        modeCopy.description,
        modeFaq.description,
        modeFaq.items?.[0]?.answer,
      ]),
      bullets: modeCopy.featureList,
    },
    {
      title: sectionTitles.workspaceTitle,
      paragraphs: compactTextList([
        messages.generator.description,
        messages.generator.form.workflow_runtime_hint,
        rootCopy.description,
        rootFaq.items?.[1]?.answer,
      ]),
      bullets: rootCopy.featureList,
    },
    {
      title: sectionTitles.switchTitle,
      paragraphs: compactTextList([
        rootFaq.description,
        ...siblingModes.map(
          (value) =>
            getGeneratorModeSeoCopy(normalizedLocale, value).description
        ),
      ]),
      bullets: siblingModes.map(
        (value) => getGeneratorModeSeoCopy(normalizedLocale, value).heading
      ),
    },
  ];

  return replaceBrandTokensDeep(
    finalizeNarrative(sections, {
      title: GENERATOR_WORKFLOW_NOTES_TITLE[normalizedLocale],
    })
  );
}
