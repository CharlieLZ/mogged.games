import { resolveAppLocale, type AppLocale } from '@/config/locale';
import {
  createShowcaseImage,
  type ShowcaseAssetKey,
  type ShowcaseImage,
} from '@/shared/lib/ai-image-generator-showcase-assets';

type ShowcaseTone = 'meadow' | 'sky' | 'sand' | 'slate';
type ShowcaseImagePosition = 'left' | 'right';
type ShowcaseSectionId =
  | 'overview-collage'
  | 'illustration-scene'
  | 'story-frame'
  | 'retail-concept';
type ShowcaseGalleryItemId =
  | 'coffee-display'
  | 'perfume-hero'
  | 'retro-poster'
  | 'journal-layout';

type LocalizedShowcaseSection = {
  id: ShowcaseSectionId;
  title: string;
  description: string;
  imageKey: ShowcaseAssetKey;
  imageAlt: string;
  tone: ShowcaseTone;
};

type LocalizedShowcaseGalleryItem = {
  id: ShowcaseGalleryItemId;
  title: string;
  imageKey: ShowcaseAssetKey;
  imageAlt: string;
};

type LocalizedShowcaseCopy = {
  sections: readonly LocalizedShowcaseSection[];
  gallery: {
    posterAlt: string;
    items: readonly LocalizedShowcaseGalleryItem[];
  };
};

const SHOWCASE_IMAGE_POSITION_BY_SECTION_ID = {
  'overview-collage': 'right',
  'illustration-scene': 'left',
  'story-frame': 'right',
  'retail-concept': 'left',
} as const satisfies Record<ShowcaseSectionId, ShowcaseImagePosition>;

export type ImageGeneratorShowcaseSection = Omit<
  LocalizedShowcaseSection,
  'imageKey' | 'imageAlt'
> & {
  imagePosition: ShowcaseImagePosition;
  image: ShowcaseImage;
};

export type ImageGeneratorShowcaseGalleryItem = Omit<
  LocalizedShowcaseGalleryItem,
  'imageKey' | 'imageAlt'
> & {
  image: ShowcaseImage;
};

export type ImageGeneratorShowcaseCopy = {
  sections: readonly ImageGeneratorShowcaseSection[];
  gallery: {
    items: readonly ImageGeneratorShowcaseGalleryItem[];
  };
};

const SHOWCASE_OVERVIEW_COPY_BY_LOCALE = {
  en: {
    title: 'Plan every AI image direction in one workspace',
    description:
      'Start with a prompt, compare visual routes, and move from reference boards to production-ready image concepts without stitching together extra tools.',
  },
  zh: {
    title: '在一个工作台里先定好所有生图方向',
    description:
      '从提示词出发，先把参考图、风格方向和可交付视觉并排看清楚，再进入正式生成，不用在一堆工具之间来回搬。',
  },
  de: {
    title: 'Plane jede KI-Bildrichtung in einem Workspace',
    description:
      'Starte mit einem Prompt, vergleiche visuelle Routen und führe Referenzboards bis zu produktionsreifen Bildkonzepten, ohne zusätzliche Tools zusammenzustecken.',
  },
  fr: {
    title: "Planifier chaque direction d'image IA dans un seul espace",
    description:
      "Pars d'un prompt, compare plusieurs routes visuelles et transforme des planches de référence en concepts image prêts à produire sans assembler d'autres outils.",
  },
  es: {
    title: 'Planifica cada dirección de imagen IA en un solo workspace',
    description:
      'Empieza con un prompt, compara rutas visuales y lleva tableros de referencia hasta conceptos listos para producción sin encadenar herramientas extra.',
  },
  ja: {
    title: 'AI 画像の方向性を 1 つのワークスペースで設計',
    description:
      'プロンプトから始め、複数のビジュアル案を比較し、参考ボードから制作に使える画像コンセプトまで、別ツールをつながずに進められます。',
  },
  it: {
    title: 'Pianifica ogni direzione immagine AI in un workspace',
    description:
      'Parti da un prompt, confronta le rotte visive e porta reference board e concept immagine fino a un livello pronto per la produzione senza collegare altri tool.',
  },
  ko: {
    title: '하나의 워크스페이스에서 모든 AI 이미지 방향 잡기',
    description:
      '프롬프트에서 시작해 여러 시각 방향을 비교하고, 레퍼런스 보드부터 제작 가능한 이미지 콘셉트까지 추가 도구 없이 이어서 정리할 수 있습니다.',
  },
  ar: {
    title: 'خطّط لكل اتجاه صورة بالذكاء الاصطناعي في مساحة واحدة',
    description:
      'ابدأ من مطالبة، قارن المسارات البصرية، وحوّل لوحات المراجع إلى مفاهيم صور جاهزة للإنتاج من دون ربط أدوات إضافية.',
  },
} as const satisfies Record<
  AppLocale,
  {
    title: string;
    description: string;
  }
>;

const SHOWCASE_COPY_BY_LOCALE = {
  en: {
    sections: [
      {
        id: 'illustration-scene',
        title: 'Turn one art brief into a polished scene',
        description:
          'Use a tight prompt to map color, architecture, and atmosphere before you invest in custom illustration work.',
        imageKey: 'santorini',
        imageAlt: 'Mediterranean illustration prompt showcase',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: 'Keep stylized characters readable in every frame',
        description:
          'Use the generator to hold mood, spacing, and character chemistry when you need a playful narrative image fast.',
        imageKey: 'story',
        imageAlt: 'Winter character storytelling prompt showcase',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: 'Mock up product worlds before the shoot',
        description:
          'Build packaged lifestyle concepts with props and motion cues so merchandising, ads, and landing pages align earlier.',
        imageKey: 'basket',
        imageAlt: 'Retail concept prompt showcase with product basket',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: 'AI image generator collage preview',
      items: [
        {
          id: 'coffee-display',
          title: 'Revolutionize e-commerce listings',
          imageKey: 'coffee',
          imageAlt: 'Minimal coffee display prompt board',
        },
        {
          id: 'perfume-hero',
          title: 'Craft professional marketing banners',
          imageKey: 'perfume',
          imageAlt: 'Desert fragrance hero prompt board',
        },
        {
          id: 'retro-poster',
          title: 'Bring creative visions to life',
          imageKey: 'poster',
          imageAlt: 'Retro ocean poster prompt board',
        },
        {
          id: 'journal-layout',
          title: 'Boost social media engagement',
          imageKey: 'journal',
          imageAlt: 'Journal collage layout prompt board',
        },
      ],
    },
  },
  zh: {
    sections: [
      {
        id: 'illustration-scene',
        title: '一条创意说明，先落成完整场景',
        description:
          '先用精确提示词把配色、建筑关系和整体气氛跑通，再决定要不要进入定制插画制作。',
        imageKey: 'santorini',
        imageAlt: '地中海插画提示词展示图',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: '风格化角色也能在同一画面里讲清关系',
        description:
          '当你需要更轻快的叙事画面时，可以先用生图把角色距离、情绪和冬日氛围一起定住。',
        imageKey: 'story',
        imageAlt: '冬日角色叙事提示词展示图',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: '拍摄前先把商品世界观搭出来',
        description:
          '先把道具、构图和动势方案做成零售概念图，让商品页、广告图和落地页更早统一方向。',
        imageKey: 'basket',
        imageAlt: '商品篮子零售概念提示词展示图',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: 'AI 图片生成拼贴预览',
      items: [
        {
          id: 'coffee-display',
          title: '提升电商商品页质感',
          imageKey: 'coffee',
          imageAlt: '极简咖啡陈列提示词板',
        },
        {
          id: 'perfume-hero',
          title: '做出更专业的营销横幅',
          imageKey: 'perfume',
          imageAlt: '沙漠香水主视觉提示词板',
        },
        {
          id: 'retro-poster',
          title: '把创意想法真正落成画面',
          imageKey: 'poster',
          imageAlt: '复古海洋海报提示词板',
        },
        {
          id: 'journal-layout',
          title: '做出更抓人的社媒内容',
          imageKey: 'journal',
          imageAlt: '手账拼贴版式提示词板',
        },
      ],
    },
  },
  de: {
    sections: [
      {
        id: 'illustration-scene',
        title: 'Aus einem Briefing schnell eine fertige Szene machen',
        description:
          'Lege Farben, Architektur und Stimmung per Prompt fest, bevor du in eine aufwendige Illustrationsproduktion gehst.',
        imageKey: 'santorini',
        imageAlt: 'Prompt-Beispiel für mediterrane Illustration',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: 'Stilisierte Figuren bleiben in jeder Szene klar lesbar',
        description:
          'Wenn du schnell ein erzählerisches Motiv brauchst, hält der Generator Stimmung, Abstand und Chemie der Figuren konsistent.',
        imageKey: 'story',
        imageAlt: 'Prompt-Beispiel für winterliche Figuren-Szene',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: 'Produktwelten vor dem Shooting zuerst als Mock-up bauen',
        description:
          'Erstelle Lifestyle-Konzepte mit Requisiten und Bewegungshinweisen, damit Shop, Ads und Landingpage früher auf einer Linie sind.',
        imageKey: 'basket',
        imageAlt: 'Prompt-Beispiel für Retail-Konzept mit Einkaufskorb',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: 'Collage-Vorschau des KI-Bildgenerators',
      items: [
        {
          id: 'coffee-display',
          title: 'E-Commerce-Listings aufwerten',
          imageKey: 'coffee',
          imageAlt: 'Prompt-Board für minimalistischen Kaffee-Aufbau',
        },
        {
          id: 'perfume-hero',
          title: 'Professionelle Marketing-Banner gestalten',
          imageKey: 'perfume',
          imageAlt: 'Prompt-Board für Parfüm-Hero in der Wüste',
        },
        {
          id: 'retro-poster',
          title: 'Kreative Visionen sichtbar machen',
          imageKey: 'poster',
          imageAlt: 'Prompt-Board für Retro-Ozean-Poster',
        },
        {
          id: 'journal-layout',
          title: 'Mehr Engagement in Social Media',
          imageKey: 'journal',
          imageAlt: 'Prompt-Board für Journal-Collage-Layout',
        },
      ],
    },
  },
  fr: {
    sections: [
      {
        id: 'illustration-scene',
        title: 'Transformer un brief visuel en scène déjà crédible',
        description:
          "Calibre d'abord la couleur, l'architecture et l'atmosphère avec un prompt précis avant de lancer une illustration sur mesure.",
        imageKey: 'santorini',
        imageAlt: 'Vitrine de prompt pour illustration méditerranéenne',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: 'Des personnages stylisés restent lisibles image après image',
        description:
          "Quand il faut une scène narrative rapidement, le générateur garde l'humeur, l'espacement et la chimie entre les personnages.",
        imageKey: 'story',
        imageAlt: 'Vitrine de prompt pour scène hivernale avec personnages',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: 'Construire un univers produit avant le shooting',
        description:
          'Prépare des concepts lifestyle avec accessoires et mouvement pour aligner plus tôt merchandising, ads et landing pages.',
        imageKey: 'basket',
        imageAlt: 'Vitrine de prompt pour concept retail avec panier',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: "Aperçu en collage du générateur d'image IA",
      items: [
        {
          id: 'coffee-display',
          title: 'Renforcer les visuels e-commerce',
          imageKey: 'coffee',
          imageAlt: 'Planche de prompt pour présentation café minimaliste',
        },
        {
          id: 'perfume-hero',
          title: 'Créer des bannières marketing plus pro',
          imageKey: 'perfume',
          imageAlt: 'Planche de prompt pour hero parfum dans le désert',
        },
        {
          id: 'retro-poster',
          title: 'Donner vie aux visions créatives',
          imageKey: 'poster',
          imageAlt: 'Planche de prompt pour poster océan rétro',
        },
        {
          id: 'journal-layout',
          title: 'Booster l’engagement sur les réseaux sociaux',
          imageKey: 'journal',
          imageAlt: 'Planche de prompt pour collage journal',
        },
      ],
    },
  },
  es: {
    sections: [
      {
        id: 'illustration-scene',
        title: 'Convierte un brief visual en una escena ya resuelta',
        description:
          'Define color, arquitectura y atmósfera con un prompt preciso antes de entrar en una ilustración personalizada más costosa.',
        imageKey: 'santorini',
        imageAlt: 'Muestra de prompt para ilustración mediterránea',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: 'Los personajes estilizados siguen claros en cada toma',
        description:
          'Cuando necesitas una imagen narrativa rápida, el generador mantiene el tono, la distancia y la química entre personajes.',
        imageKey: 'story',
        imageAlt: 'Muestra de prompt para escena invernal con personajes',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: 'Construye mundos de producto antes de la sesión',
        description:
          'Prepara conceptos lifestyle con utilería y movimiento para alinear antes merchandising, anuncios y landing pages.',
        imageKey: 'basket',
        imageAlt: 'Muestra de prompt para concepto retail con cesta',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: 'Vista previa en collage del generador de imágenes IA',
      items: [
        {
          id: 'coffee-display',
          title: 'Mejorar los visuales de e-commerce',
          imageKey: 'coffee',
          imageAlt: 'Tablero de prompt para exhibición minimalista de café',
        },
        {
          id: 'perfume-hero',
          title: 'Crear banners de marketing más profesionales',
          imageKey: 'perfume',
          imageAlt: 'Tablero de prompt para hero de perfume en el desierto',
        },
        {
          id: 'retro-poster',
          title: 'Dar vida a ideas creativas',
          imageKey: 'poster',
          imageAlt: 'Tablero de prompt para póster oceánico retro',
        },
        {
          id: 'journal-layout',
          title: 'Impulsar el engagement en redes sociales',
          imageKey: 'journal',
          imageAlt: 'Tablero de prompt para diseño collage de journal',
        },
      ],
    },
  },
  ja: {
    sections: [
      {
        id: 'illustration-scene',
        title: '1 本のアート指示から完成度の高いシーンまで詰める',
        description:
          '色、建築、空気感をまずプロンプトで固めてから、本格的なオーダー制作に進むか判断できます。',
        imageKey: 'santorini',
        imageAlt: '地中海イラスト用プロンプトのショーケース',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: 'スタイライズされたキャラクターも毎フレームで関係性を保てる',
        description:
          '物語性のある 1 枚を急いで作りたいときも、ムード、距離感、キャラクター同士の空気をまとめて維持できます。',
        imageKey: 'story',
        imageAlt: '冬のキャラクターシーン用プロンプトのショーケース',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: '撮影前に商品世界観を先にモックアップする',
        description:
          '小物や動きのヒントまで含めたライフスタイル案を先に出し、商品ページ、広告、LP の方向を早めに揃えます。',
        imageKey: 'basket',
        imageAlt: '商品バスケット付きリテール案のプロンプトショーケース',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: 'AI画像ジェネレーターのコラージュプレビュー',
      items: [
        {
          id: 'coffee-display',
          title: 'EC 商品ページの見え方を底上げする',
          imageKey: 'coffee',
          imageAlt: 'ミニマルなコーヒー陳列のプロンプトボード',
        },
        {
          id: 'perfume-hero',
          title: 'よりプロらしい販促バナーを作る',
          imageKey: 'perfume',
          imageAlt: '砂漠の香水ヒーローのプロンプトボード',
        },
        {
          id: 'retro-poster',
          title: '創造的なアイデアをきちんと画にする',
          imageKey: 'poster',
          imageAlt: 'レトロ海洋ポスターのプロンプトボード',
        },
        {
          id: 'journal-layout',
          title: 'SNS エンゲージメントを高める',
          imageKey: 'journal',
          imageAlt: 'ジャーナルコラージュ構成のプロンプトボード',
        },
      ],
    },
  },
  it: {
    sections: [
      {
        id: 'illustration-scene',
        title: 'Da un brief creativo a una scena già rifinita',
        description:
          "Definisci colore, architettura e atmosfera con un prompt mirato prima di investire in un'illustrazione personalizzata più costosa.",
        imageKey: 'santorini',
        imageAlt: 'Vetrina prompt per illustrazione mediterranea',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: 'I personaggi stilizzati restano chiari in ogni scena',
        description:
          'Quando serve un’immagine narrativa in fretta, il generatore mantiene tono, distanza e chimica tra i personaggi.',
        imageKey: 'story',
        imageAlt: 'Vetrina prompt per scena invernale con personaggi',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: 'Costruisci mondi di prodotto prima dello shooting',
        description:
          'Prepara concept lifestyle con props e movimento per allineare prima merchandising, ads e landing page.',
        imageKey: 'basket',
        imageAlt: 'Vetrina prompt per concept retail con cestino',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: 'Anteprima collage del generatore immagini AI',
      items: [
        {
          id: 'coffee-display',
          title: 'Rafforzare i visual e-commerce',
          imageKey: 'coffee',
          imageAlt: 'Board prompt per esposizione caffè minimale',
        },
        {
          id: 'perfume-hero',
          title: 'Creare banner marketing più professionali',
          imageKey: 'perfume',
          imageAlt: 'Board prompt per hero fragranza nel deserto',
        },
        {
          id: 'retro-poster',
          title: 'Dare forma alle visioni creative',
          imageKey: 'poster',
          imageAlt: 'Board prompt per poster oceano rétro',
        },
        {
          id: 'journal-layout',
          title: 'Aumentare l’engagement social',
          imageKey: 'journal',
          imageAlt: 'Board prompt per layout collage journal',
        },
      ],
    },
  },
  ko: {
    sections: [
      {
        id: 'illustration-scene',
        title: '하나의 아트 브리프로 완성형 장면까지 먼저 잡기',
        description:
          '색감, 건축 요소, 공기감을 프롬프트로 먼저 맞춘 뒤 본격적인 커스텀 일러스트 제작 여부를 결정할 수 있습니다.',
        imageKey: 'santorini',
        imageAlt: '지중해 일러스트 프롬프트 쇼케이스',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: '스타일화된 캐릭터도 장면마다 관계가 또렷하게 유지됩니다',
        description:
          '빠르게 서사형 이미지를 만들어야 할 때도 무드, 거리감, 캐릭터 케미를 한 장 안에서 안정적으로 잡아줍니다.',
        imageKey: 'story',
        imageAlt: '겨울 캐릭터 장면 프롬프트 쇼케이스',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: '촬영 전에 제품 세계관부터 먼저 목업으로 만듭니다',
        description:
          '소품과 움직임 힌트가 들어간 라이프스타일 콘셉트를 먼저 만들어 상품 페이지, 광고, 랜딩 방향을 일찍 맞춥니다.',
        imageKey: 'basket',
        imageAlt: '제품 바구니 리테일 콘셉트 프롬프트 쇼케이스',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: 'AI 이미지 생성 콜라주 미리보기',
      items: [
        {
          id: 'coffee-display',
          title: '이커머스 상품 비주얼 완성도 높이기',
          imageKey: 'coffee',
          imageAlt: '미니멀 커피 디스플레이 프롬프트 보드',
        },
        {
          id: 'perfume-hero',
          title: '더 프로다운 마케팅 배너 만들기',
          imageKey: 'perfume',
          imageAlt: '사막 향수 히어로 컷 프롬프트 보드',
        },
        {
          id: 'retro-poster',
          title: '창의적인 아이디어를 실제 화면으로 만들기',
          imageKey: 'poster',
          imageAlt: '레트로 오션 포스터 프롬프트 보드',
        },
        {
          id: 'journal-layout',
          title: '소셜 미디어 반응 끌어올리기',
          imageKey: 'journal',
          imageAlt: '저널 콜라주 레이아웃 프롬프트 보드',
        },
      ],
    },
  },
  ar: {
    sections: [
      {
        id: 'illustration-scene',
        title: 'حوّل موجزًا بصريًا واحدًا إلى مشهد مكتمل',
        description:
          'اضبط اللون والعمارة والأجواء عبر مطالبة دقيقة قبل أن تنتقل إلى تنفيذ رسوم مخصصة أكثر كلفة.',
        imageKey: 'santorini',
        imageAlt: 'عرض مطالبة لتوضيح متوسطي',
        tone: 'meadow',
      },
      {
        id: 'story-frame',
        title: 'تبقى الشخصيات الأسلوبية واضحة في كل لقطة',
        description:
          'عندما تحتاج صورة سردية بسرعة، يحافظ المولد على المزاج والمسافة والكيمياء بين الشخصيات داخل الإطار نفسه.',
        imageKey: 'story',
        imageAlt: 'عرض مطالبة لمشهد شتوي بشخصيات',
        tone: 'meadow',
      },
      {
        id: 'retail-concept',
        title: 'ابنِ عالم المنتج قبل جلسة التصوير',
        description:
          'أنشئ مفاهيم لايف ستايل مع الإكسسوارات وإيحاءات الحركة حتى تتماشى صفحات المتجر والإعلانات والهبوط مبكرًا.',
        imageKey: 'basket',
        imageAlt: 'عرض مطالبة لمفهوم تجزئة مع سلة منتجات',
        tone: 'meadow',
      },
    ],
    gallery: {
      posterAlt: 'معاينة كولاج لمولد الصور بالذكاء الاصطناعي',
      items: [
        {
          id: 'coffee-display',
          title: 'رفع جودة صور القوائم في المتجر',
          imageKey: 'coffee',
          imageAlt: 'لوحة مطالبة لعرض قهوة مينيمالي',
        },
        {
          id: 'perfume-hero',
          title: 'إنشاء بانرات تسويقية أكثر احترافية',
          imageKey: 'perfume',
          imageAlt: 'لوحة مطالبة لمشهد عطر بطابع صحراوي',
        },
        {
          id: 'retro-poster',
          title: 'تحويل الرؤى الإبداعية إلى صور',
          imageKey: 'poster',
          imageAlt: 'لوحة مطالبة لملصق بحري ريترو',
        },
        {
          id: 'journal-layout',
          title: 'زيادة التفاعل على وسائل التواصل',
          imageKey: 'journal',
          imageAlt: 'لوحة مطالبة لتخطيط كولاج يوميات',
        },
      ],
    },
  },
} as const satisfies Record<AppLocale, LocalizedShowcaseCopy>;

export function getImageGeneratorShowcaseCopy(
  locale?: string | null
): ImageGeneratorShowcaseCopy {
  const resolvedLocale = resolveAppLocale(locale);
  const localizedCopy = SHOWCASE_COPY_BY_LOCALE[resolvedLocale];
  const overviewCopy = SHOWCASE_OVERVIEW_COPY_BY_LOCALE[resolvedLocale];
  if (localizedCopy.sections.length !== 3) {
    throw new Error(
      `[ai-image-generator-showcase] expected 3 feature sections for ${resolvedLocale}`
    );
  }

  if (localizedCopy.gallery.items.length !== 4) {
    throw new Error(
      `[ai-image-generator-showcase] expected 4 gallery items for ${resolvedLocale}`
    );
  }

  return {
    sections: [
      {
        id: 'overview-collage',
        title: overviewCopy.title,
        description: overviewCopy.description,
        imagePosition: SHOWCASE_IMAGE_POSITION_BY_SECTION_ID['overview-collage'],
        tone: 'slate',
        image: createShowcaseImage('collage', localizedCopy.gallery.posterAlt),
      },
      ...localizedCopy.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        imagePosition: SHOWCASE_IMAGE_POSITION_BY_SECTION_ID[section.id],
        tone: section.tone,
        image: createShowcaseImage(section.imageKey, section.imageAlt),
      })),
    ],
    gallery: {
      items: localizedCopy.gallery.items.map((item) => ({
        id: item.id,
        title: item.title,
        image: createShowcaseImage(item.imageKey, item.imageAlt),
      })),
    },
  };
}
