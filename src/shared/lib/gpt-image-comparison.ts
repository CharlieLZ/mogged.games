import {
  locales,
  resolveAppLocale,
  type AppLocale,
} from '@/config/locale';

const R2_BASE_URL = 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev';
const R2_IMAGE_URL_PATTERN = new RegExp(
  `^${R2_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/gpt-image-2-demo[1-3]-[12]\\.webp$`
);

type LocalizedText = Record<AppLocale, string>;

type GptImageComparisonImageSource = {
  alt: LocalizedText;
  label: string;
  src: string;
};

type GptImageComparisonItemSource = {
  gptImage: GptImageComparisonImageSource;
  id: string;
  nanoBanana: GptImageComparisonImageSource;
  prompt: string;
};

export type GptImageComparisonImage = {
  alt: string;
  label: string;
  src: string;
};

export type GptImageComparisonItem = {
  gptImage: GptImageComparisonImage;
  id: string;
  nanoBanana: GptImageComparisonImage;
  prompt: string;
};

export type GptImageComparisonCopy = {
  closePreview: string;
  copied: string;
  copyFailed: string;
  copyPrompt: string;
  description: string;
  imagePreview: string;
  next: string;
  openPreview: string;
  previous: string;
  promptLabel: string;
  title: string;
};

function text(values: LocalizedText) {
  return values;
}

function localizeText(value: LocalizedText, locale?: string) {
  return value[resolveAppLocale(locale)];
}

const comparisonItems = [
  {
    id: 'demo-1',
    gptImage: {
      label: 'GPT Image 2',
      src: `${R2_BASE_URL}/gpt-image-2-demo1-1.webp`,
      alt: text({
        en: 'GPT Image 2 output for premium milk powder poster',
        zh: 'GPT Image 2 生成的高端奶粉海报',
        de: 'GPT Image 2 Ausgabe für Poster zu Premium-Milchpulver',
        fr: 'Résultat GPT Image 2 pour une affiche de lait en poudre premium',
        es: 'Resultado de GPT Image 2 para un póster de leche en polvo premium',
        ja: '高級粉ミルクのポスターに対する GPT Image 2 の出力',
        it: 'Output di GPT Image 2 per poster di latte in polvere premium',
        ko: '프리미엄 분유 포스터에 대한 GPT Image 2 결과',
        ar: 'مخرجات GPT Image 2 لملصق حليب بودرة فاخر',
      }),
    },
    nanoBanana: {
      label: 'Nano Banana Pro',
      src: `${R2_BASE_URL}/gpt-image-2-demo1-2.webp`,
      alt: text({
        en: 'Nano Banana Pro output for premium milk powder poster',
        zh: 'Nano Banana Pro 生成的高端奶粉海报',
        de: 'Nano Banana Pro Ausgabe für Poster zu Premium-Milchpulver',
        fr: 'Résultat Nano Banana Pro pour une affiche de lait en poudre premium',
        es: 'Resultado de Nano Banana Pro para un póster de leche en polvo premium',
        ja: '高級粉ミルクのポスターに対する Nano Banana Pro の出力',
        it: 'Output di Nano Banana Pro per poster di latte in polvere premium',
        ko: '프리미엄 분유 포스터에 대한 Nano Banana Pro 결과',
        ar: 'مخرجات Nano Banana Pro لملصق حليب بودرة فاخر',
      }),
    },
    prompt:
      "Design a modern, professional promotional poster for a premium milk powder. Highlight its unique feature of '25% More Calcium.' Showcase a 3D, soft, swirling image of a milk powder container, with a golden shield displaying '+25%' inside, symbolizing the added calcium. Surround the container with fluid, glowing lines to emphasize nutrition and purity. Use a soft, light-blue gradient background with a clean, scientific aesthetic. Incorporate bold, white headline typography, with glossy, clinical lighting to create a high-tech, trustworthy, and professional look.",
  },
  {
    id: 'demo-2',
    gptImage: {
      label: 'GPT Image 2',
      src: `${R2_BASE_URL}/gpt-image-2-demo2-1.webp`,
      alt: text({
        en: 'GPT Image 2 output for Bunny Clothing brand identity mockup',
        zh: 'GPT Image 2 生成的 Bunny Clothing 品牌物料样机',
        de: 'GPT Image 2 Ausgabe für Bunny Clothing Marken-Mockup',
        fr: 'Résultat GPT Image 2 pour une maquette d’identité de Bunny Clothing',
        es: 'Resultado de GPT Image 2 para mockup de identidad de Bunny Clothing',
        ja: 'Bunny Clothing ブランドモックアップに対する GPT Image 2 の出力',
        it: 'Output di GPT Image 2 per mockup identità di Bunny Clothing',
        ko: 'Bunny Clothing 브랜드 아이덴티티 목업에 대한 GPT Image 2 결과',
        ar: 'مخرجات GPT Image 2 لنموذج هوية علامة Bunny Clothing',
      }),
    },
    nanoBanana: {
      label: 'Nano Banana Pro',
      src: `${R2_BASE_URL}/gpt-image-2-demo2-2.webp`,
      alt: text({
        en: 'Nano Banana Pro output for Bunny Clothing brand identity mockup',
        zh: 'Nano Banana Pro 生成的 Bunny Clothing 品牌物料样机',
        de: 'Nano Banana Pro Ausgabe für Bunny Clothing Marken-Mockup',
        fr: 'Résultat Nano Banana Pro pour une maquette d’identité de Bunny Clothing',
        es: 'Resultado de Nano Banana Pro para mockup de identidad de Bunny Clothing',
        ja: 'Bunny Clothing ブランドモックアップに対する Nano Banana Pro の出力',
        it: 'Output di Nano Banana Pro per mockup identità di Bunny Clothing',
        ko: 'Bunny Clothing 브랜드 아이덴티티 목업에 대한 Nano Banana Pro 결과',
        ar: 'مخرجات Nano Banana Pro لنموذج هوية علامة Bunny Clothing',
      }),
    },
    prompt:
      "Design a professional studio brand identity mockup for a clothing brand named 'BUNNY CLOTHING.' Include a kraft box, apparel tags, hoodie, tote bag, folded T-shirt, and beanie. Feature a minimal bunny face logo, paired with bold dark-brown sans-serif branding. Use a monochrome color palette with shades of beige, taupe, and soft grey. Set against a matte chocolate background, with soft studio lighting to highlight the clothing's textures and details. The composition should be clean, photorealistic, and convey a sense of casual, high-quality fashion.",
  },
  {
    id: 'demo-3',
    gptImage: {
      label: 'GPT Image 2',
      src: `${R2_BASE_URL}/gpt-image-2-demo3-1.webp`,
      alt: text({
        en: 'GPT Image 2 output for first-person shooter game scene',
        zh: 'GPT Image 2 生成的第一人称射击游戏场景',
        de: 'GPT Image 2 Ausgabe für Ego-Shooter-Spielszene',
        fr: 'Résultat GPT Image 2 pour une scène de jeu de tir à la première personne',
        es: 'Resultado de GPT Image 2 para una escena de juego FPS',
        ja: 'FPS ゲームシーンに対する GPT Image 2 の出力',
        it: 'Output di GPT Image 2 per scena di sparatutto in prima persona',
        ko: '1인칭 슈팅 게임 장면에 대한 GPT Image 2 결과',
        ar: 'مخرجات GPT Image 2 لمشهد لعبة تصويب من منظور الشخص الأول',
      }),
    },
    nanoBanana: {
      label: 'Nano Banana Pro',
      src: `${R2_BASE_URL}/gpt-image-2-demo3-2.webp`,
      alt: text({
        en: 'Nano Banana Pro output for first-person shooter game scene',
        zh: 'Nano Banana Pro 生成的第一人称射击游戏场景',
        de: 'Nano Banana Pro Ausgabe für Ego-Shooter-Spielszene',
        fr: 'Résultat Nano Banana Pro pour une scène de jeu de tir à la première personne',
        es: 'Resultado de Nano Banana Pro para una escena de juego FPS',
        ja: 'FPS ゲームシーンに対する Nano Banana Pro の出力',
        it: 'Output di Nano Banana Pro per scena di sparatutto in prima persona',
        ko: '1인칭 슈팅 게임 장면에 대한 Nano Banana Pro 결과',
        ar: 'مخرجات Nano Banana Pro لمشهد لعبة تصويب من منظور الشخص الأول',
      }),
    },
    prompt:
      "Create a realistic first-person shooter (FPS) game scene, showing the player's perspective as they engage in an intense gunfight. The screen should display a detailed weapon, like an assault rifle or pistol, with realistic hand positioning and weapon recoil. In the background, show enemies hiding behind cover, with gunfire, smoke, and explosions lighting up the environment. The player's view includes realistic muzzle flashes and aiming reticles, with motion blur and dynamic lighting that enhances the feeling of action. The environment should be a war-torn city or abandoned building with broken walls, debris, and dim lighting for added tension and realism.",
  },
] as const satisfies readonly GptImageComparisonItemSource[];

const comparisonCopyByLocale = {
  en: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description:
      'Side-by-side comparison using the same prompts. See the difference in detail, text rendering, and composition.',
    promptLabel: 'Prompt',
    copyPrompt: 'Copy prompt',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    previous: 'Previous comparison',
    next: 'Next comparison',
    imagePreview: 'Image preview',
    openPreview: 'Open image preview',
    closePreview: 'Close image preview',
  },
  zh: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description: '使用同一组提示词做并排对比，直接看细节、文字渲染和构图差异。',
    promptLabel: '提示词',
    copyPrompt: '复制提示词',
    copied: '已复制',
    copyFailed: '复制失败',
    previous: '上一组对比',
    next: '下一组对比',
    imagePreview: '图片预览',
    openPreview: '打开图片预览',
    closePreview: '关闭图片预览',
  },
  de: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description:
      'Direkter Vergleich mit denselben Prompts. So siehst du Unterschiede bei Details, Textdarstellung und Komposition.',
    promptLabel: 'Prompt',
    copyPrompt: 'Prompt kopieren',
    copied: 'Kopiert',
    copyFailed: 'Kopieren fehlgeschlagen',
    previous: 'Vorheriger Vergleich',
    next: 'Nächster Vergleich',
    imagePreview: 'Bildvorschau',
    openPreview: 'Bildvorschau öffnen',
    closePreview: 'Bildvorschau schließen',
  },
  fr: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description:
      'Comparaison côte à côte avec les mêmes prompts pour voir les écarts de détail, de rendu du texte et de composition.',
    promptLabel: 'Prompt',
    copyPrompt: 'Copier le prompt',
    copied: 'Copié',
    copyFailed: 'Copie impossible',
    previous: 'Comparaison précédente',
    next: 'Comparaison suivante',
    imagePreview: "Aperçu de l'image",
    openPreview: "Ouvrir l'aperçu de l'image",
    closePreview: "Fermer l'aperçu de l'image",
  },
  es: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description:
      'Comparación lado a lado con los mismos prompts para ver diferencias en detalle, texto y composición.',
    promptLabel: 'Prompt',
    copyPrompt: 'Copiar prompt',
    copied: 'Copiado',
    copyFailed: 'No se pudo copiar',
    previous: 'Comparación anterior',
    next: 'Siguiente comparación',
    imagePreview: 'Vista previa de imagen',
    openPreview: 'Abrir vista previa de imagen',
    closePreview: 'Cerrar vista previa de imagen',
  },
  ja: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description:
      '同じプロンプトで並べて比較し、ディテール、文字表現、構図の違いを確認できます。',
    promptLabel: 'プロンプト',
    copyPrompt: 'プロンプトをコピー',
    copied: 'コピーしました',
    copyFailed: 'コピーに失敗しました',
    previous: '前の比較',
    next: '次の比較',
    imagePreview: '画像プレビュー',
    openPreview: '画像プレビューを開く',
    closePreview: '画像プレビューを閉じる',
  },
  it: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description:
      'Confronto affiancato con gli stessi prompt per vedere differenze in dettaglio, resa del testo e composizione.',
    promptLabel: 'Prompt',
    copyPrompt: 'Copia prompt',
    copied: 'Copiato',
    copyFailed: 'Copia non riuscita',
    previous: 'Confronto precedente',
    next: 'Confronto successivo',
    imagePreview: 'Anteprima immagine',
    openPreview: 'Apri anteprima immagine',
    closePreview: 'Chiudi anteprima immagine',
  },
  ko: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description:
      '같은 프롬프트로 나란히 비교해 디테일, 텍스트 렌더링, 구도 차이를 바로 확인할 수 있습니다.',
    promptLabel: '프롬프트',
    copyPrompt: '프롬프트 복사',
    copied: '복사됨',
    copyFailed: '복사 실패',
    previous: '이전 비교',
    next: '다음 비교',
    imagePreview: '이미지 미리보기',
    openPreview: '이미지 미리보기 열기',
    closePreview: '이미지 미리보기 닫기',
  },
  ar: {
    title: 'GPT Image 2 vs Nano Banana Pro',
    description:
      'مقارنة جنبًا إلى جنب باستخدام المطالبات نفسها لرؤية الفرق في التفاصيل وإظهار النص والتكوين.',
    promptLabel: 'الوصف',
    copyPrompt: 'نسخ الوصف',
    copied: 'تم النسخ',
    copyFailed: 'فشل النسخ',
    previous: 'المقارنة السابقة',
    next: 'المقارنة التالية',
    imagePreview: 'معاينة الصورة',
    openPreview: 'فتح معاينة الصورة',
    closePreview: 'إغلاق معاينة الصورة',
  },
} as const satisfies Record<AppLocale, GptImageComparisonCopy>;

function assertNonEmptyString(value: string, field: string, itemId: string) {
  if (!value.trim()) {
    throw new Error(`[gpt-image-comparison] missing ${field} for ${itemId}`);
  }
}

function assertLocalizedText(
  value: LocalizedText,
  field: string,
  itemId: string
) {
  for (const locale of locales) {
    if (!value[locale]?.trim()) {
      throw new Error(
        `[gpt-image-comparison] missing ${field} for ${itemId} (${locale})`
      );
    }
  }
}

function assertComparisonImage(
  image: GptImageComparisonImageSource,
  field: string,
  itemId: string
) {
  assertNonEmptyString(image.label, `${field}.label`, itemId);
  assertLocalizedText(image.alt, `${field}.alt`, itemId);
  assertNonEmptyString(image.src, `${field}.src`, itemId);

  if (!R2_IMAGE_URL_PATTERN.test(image.src)) {
    throw new Error(
      `[gpt-image-comparison] invalid R2 image URL for ${itemId}.${field}`
    );
  }
}

function assertComparisonItem(item: GptImageComparisonItemSource) {
  assertNonEmptyString(item.id, 'id', 'unknown');
  assertNonEmptyString(item.prompt, 'prompt', item.id);
  assertComparisonImage(item.gptImage, 'gptImage', item.id);
  assertComparisonImage(item.nanoBanana, 'nanoBanana', item.id);
}

export function getGptImageComparisonItems(locale?: string): GptImageComparisonItem[] {
  comparisonItems.forEach(assertComparisonItem);

  return comparisonItems.map((item) => ({
    ...item,
    gptImage: {
      label: item.gptImage.label,
      src: item.gptImage.src,
      alt: localizeText(item.gptImage.alt, locale),
    },
    nanoBanana: {
      label: item.nanoBanana.label,
      src: item.nanoBanana.src,
      alt: localizeText(item.nanoBanana.alt, locale),
    },
  }));
}

export function getGptImageComparisonCopy(
  locale?: string
): GptImageComparisonCopy {
  return comparisonCopyByLocale[resolveAppLocale(locale)];
}
