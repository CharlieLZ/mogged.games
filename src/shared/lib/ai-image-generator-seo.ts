import { resolveAppLocale } from '@/config/locale';
import arImageCopy from '@/config/locale/messages/ar/ai/image.json';
import deImageCopy from '@/config/locale/messages/de/ai/image.json';
import enImageCopy from '@/config/locale/messages/en/ai/image.json';
import esImageCopy from '@/config/locale/messages/es/ai/image.json';
import frImageCopy from '@/config/locale/messages/fr/ai/image.json';
import itImageCopy from '@/config/locale/messages/it/ai/image.json';
import jaImageCopy from '@/config/locale/messages/ja/ai/image.json';
import koImageCopy from '@/config/locale/messages/ko/ai/image.json';
import zhImageCopy from '@/config/locale/messages/zh/ai/image.json';
import type { ImageGeneratorMode } from '@/shared/blocks/generator/image-generator-mode';
import { ROOT_IMAGE_GENERATOR_FAQ_COPY } from '@/shared/lib/ai-image-generator-faq';
import type { GeneratorSeoCopy } from '@/shared/lib/ai-video-generator-seo';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';
import type { FAQ as LandingFAQ } from '@/shared/types/blocks/landing';

const imageCopyByLocale = {
  en: enImageCopy,
  zh: zhImageCopy,
  de: deImageCopy,
  fr: frImageCopy,
  es: esImageCopy,
  ja: jaImageCopy,
  it: itImageCopy,
  ko: koImageCopy,
  ar: arImageCopy,
} as const;

type ImageGeneratorCopyLocale = keyof typeof imageCopyByLocale;

function normalizeImageGeneratorCopyLocale(
  locale?: string
): ImageGeneratorCopyLocale {
  return resolveAppLocale(locale) as ImageGeneratorCopyLocale;
}

const ROOT_IMAGE_GENERATOR_FEATURES: Record<
  ImageGeneratorCopyLocale,
  string[]
> = {
  en: [
    'Free-start mogged online image generator',
    'Hosted online image editor workspace',
    'Text-to-image image generation',
    'Image-to-image image editing',
    'AI photo editing and picture refinement',
  ],
  zh: [
    '免费起步的 mogged 在线图片生成器',
    '托管式在线图片编辑器工作台',
    '文生图图片生成',
    '图生图图片编辑',
    'AI 修图与图片细化',
  ],
  de: [
    'Gehosteter KI-Bildeditor-Workspace',
    'Text-to-image für neue Bildideen',
    'Image-to-image für gezielte Verfeinerung',
    'KI-Fotobearbeitung und Bildoptimierung',
  ],
  fr: [
    "Espace hébergé d'édition d'image IA",
    'Text-to-image pour les nouvelles idées visuelles',
    'Image-to-image pour les retouches guidées',
    "Retouche photo IA et amélioration d'image",
  ],
  es: [
    'Workspace alojado de edición de imagen IA',
    'Text-to-image para conceptos nuevos',
    'Image-to-image para cambios guiados',
    'Edición fotográfica con IA y mejora de imagen',
  ],
  ja: [
    'ホスト型 AI画像編集ワークスペース',
    'text-to-image による新規ビジュアル作成',
    'image-to-image による元画像ベースの調整',
    'AI写真編集と画像強化',
  ],
  it: [
    'Workspace ospitato di editing immagini AI',
    'Text-to-image per nuove idee visive',
    'Image-to-image per modifiche guidate',
    'Editing foto AI e miglioramento immagine',
  ],
  ko: [
    '호스팅형 AI 이미지 편집 워크스페이스',
    'text-to-image 기반 새 콘셉트 제작',
    'image-to-image 기반 가이드 편집',
    'AI 사진 편집과 이미지 향상',
  ],
  ar: [
    'مساحة تحرير صور بالذكاء الاصطناعي مستضافة',
    'text-to-image للأفكار البصرية الجديدة',
    'image-to-image للتعديلات الموجهة',
    'تحرير الصور وتحسينها بالذكاء الاصطناعي',
  ],
};

const MODE_IMAGE_GENERATOR_SEO_COPY: Record<
  ImageGeneratorCopyLocale,
  Record<ImageGeneratorMode, GeneratorSeoCopy>
> = {
  en: {
    'text-to-image': {
      metadataTitle: 'Text to Image in the AI Image Editor',
      heading: 'Text to Image in the AI Image Editor',
      description:
        'Start from a prompt when you need a new concept, product still, portrait direction, or campaign visual.',
      keywords:
        'text-to-image, ai image editor, ai photo editor, prompt image generation',
      featureList: ['Prompt-led image generation', 'New concept ideation'],
    },
    'image-to-image': {
      metadataTitle: 'Image to Image in the AI Image Editor',
      heading: 'Image to Image in the AI Image Editor',
      description:
        'Upload one source image when you need guided edits, targeted refinements, and closer visual continuity.',
      keywords:
        'image-to-image, ai image editor, ai photo editor, source image refinement',
      featureList: ['Source-image-guided edits', 'AI image enhancement'],
    },
  },
  zh: {
    'text-to-image': {
      metadataTitle: 'AI 图片编辑器中的文生图',
      heading: 'AI 图片编辑器中的文生图',
      description:
        '想从零起稿新概念图、产品图、人像方向图或活动视觉时，直接从提示词开始。',
      keywords: '文生图, AI 图片编辑器, AI 修图, 提示词生图',
      featureList: ['提示词直接生成图片', '新概念起稿'],
    },
    'image-to-image': {
      metadataTitle: 'AI 图片编辑器中的图生图',
      heading: 'AI 图片编辑器中的图生图',
      description:
        '当你需要围绕原图做定向修改、细化增强和视觉连续性控制时，上传一张源图即可开始。',
      keywords: '图生图, AI 图片编辑器, AI 修图, 原图细化增强',
      featureList: ['基于原图的定向修改', 'AI 图片增强'],
    },
  },
  de: {
    'text-to-image': {
      metadataTitle: 'Text-to-image im KI-Bildeditor',
      heading: 'Text-to-image im KI-Bildeditor',
      description:
        'Starten Sie mit einem Prompt, wenn Sie ein neues Konzept, Produktstill, Porträtmotiv oder Kampagnenvisual entwickeln möchten.',
      keywords:
        'text-to-image, KI-Bildeditor, KI-Fotobearbeitung, Prompt-Bildgenerierung',
      featureList: ['Prompt-basierte Bildgenerierung', 'Neue Bildideen'],
    },
    'image-to-image': {
      metadataTitle: 'Image-to-image im KI-Bildeditor',
      heading: 'Image-to-image im KI-Bildeditor',
      description:
        'Laden Sie ein Ausgangsbild hoch, wenn Sie geführte Änderungen, gezielte Verfeinerung und bessere visuelle Kontinuität brauchen.',
      keywords:
        'image-to-image, KI-Bildeditor, KI-Fotobearbeitung, Bildverfeinerung',
      featureList: ['Quellbildgestützte Änderungen', 'KI-Bildoptimierung'],
    },
  },
  fr: {
    'text-to-image': {
      metadataTitle: "Text-to-image dans l'éditeur d'image IA",
      heading: "Text-to-image dans l'éditeur d'image IA",
      description:
        "Partez d'un prompt lorsque vous avez besoin d'un nouveau concept, d'un visuel produit, d'une direction portrait ou d'un visuel de campagne.",
      keywords:
        'text-to-image, éditeur d’image IA, retouche photo IA, génération par prompt',
      featureList: ['Génération par prompt', 'Nouveaux concepts visuels'],
    },
    'image-to-image': {
      metadataTitle: "Image-to-image dans l'éditeur d'image IA",
      heading: "Image-to-image dans l'éditeur d'image IA",
      description:
        "Ajoutez une image source lorsque vous avez besoin de retouches guidées, d'ajustements ciblés et d'une meilleure continuité visuelle.",
      keywords:
        'image-to-image, éditeur d’image IA, retouche photo IA, affinage à partir d’une image',
      featureList: [
        'Retouches guidées par image source',
        "Amélioration d'image IA",
      ],
    },
  },
  es: {
    'text-to-image': {
      metadataTitle: 'Text-to-image en el editor de imagen IA',
      heading: 'Text-to-image en el editor de imagen IA',
      description:
        'Empieza desde un prompt cuando necesites un concepto nuevo, una imagen de producto, una dirección de retrato o una pieza visual de campaña.',
      keywords:
        'text-to-image, editor de imagen IA, edición fotográfica IA, generación por prompt',
      featureList: [
        'Generación de imagen por prompt',
        'Conceptos visuales nuevos',
      ],
    },
    'image-to-image': {
      metadataTitle: 'Image-to-image en el editor de imagen IA',
      heading: 'Image-to-image en el editor de imagen IA',
      description:
        'Sube una imagen fuente cuando necesites cambios guiados, refinado puntual y una continuidad visual más cercana.',
      keywords:
        'image-to-image, editor de imagen IA, edición fotográfica IA, refinado desde imagen fuente',
      featureList: ['Edición guiada por imagen fuente', 'Mejora de imagen IA'],
    },
  },
  ja: {
    'text-to-image': {
      metadataTitle: 'AI画像編集ワークスペースの text-to-image',
      heading: 'AI画像編集ワークスペースの text-to-image',
      description:
        '新しいコンセプト、商品ビジュアル、ポートレート案、キャンペーン用静止画を作りたいときは、まずプロンプトから始めます。',
      keywords: 'text-to-image, AI画像編集, AI写真編集, プロンプト画像生成',
      featureList: ['プロンプト起点の画像生成', '新規ビジュアル案の作成'],
    },
    'image-to-image': {
      metadataTitle: 'AI画像編集ワークスペースの image-to-image',
      heading: 'AI画像編集ワークスペースの image-to-image',
      description:
        '元画像ベースで調整したい場合は、1 枚のソース画像をアップロードして、ガイド付き編集や細かな改善を進められます。',
      keywords: 'image-to-image, AI画像編集, AI写真編集, 元画像ベースの微調整',
      featureList: ['元画像ベースの編集', 'AI画像強化'],
    },
  },
  it: {
    'text-to-image': {
      metadataTitle: 'Text-to-image nel workspace di editing immagini AI',
      heading: 'Text-to-image nel workspace di editing immagini AI',
      description:
        'Parti da un prompt quando ti serve un nuovo concept, uno still di prodotto, una direzione ritratto o un visual di campagna.',
      keywords:
        'text-to-image, editing immagini AI, editing foto AI, generazione da prompt',
      featureList: ['Generazione da prompt', 'Nuovi concept visivi'],
    },
    'image-to-image': {
      metadataTitle: 'Image-to-image nel workspace di editing immagini AI',
      heading: 'Image-to-image nel workspace di editing immagini AI',
      description:
        "Carica un'immagine sorgente quando hai bisogno di modifiche guidate, rifinitura mirata e maggiore continuità visiva.",
      keywords:
        'image-to-image, editing immagini AI, editing foto AI, rifinitura da immagine sorgente',
      featureList: [
        "Modifiche guidate dall'immagine sorgente",
        'Miglioramento immagine AI',
      ],
    },
  },
  ko: {
    'text-to-image': {
      metadataTitle: 'AI 이미지 편집기의 text-to-image',
      heading: 'AI 이미지 편집기의 text-to-image',
      description:
        '새 콘셉트, 제품 스틸, 인물 방향안, 캠페인 비주얼이 필요할 때는 프롬프트부터 시작합니다.',
      keywords:
        'text-to-image, AI 이미지 편집기, AI 사진 편집, 프롬프트 이미지 생성',
      featureList: ['프롬프트 기반 이미지 생성', '새 비주얼 콘셉트 제작'],
    },
    'image-to-image': {
      metadataTitle: 'AI 이미지 편집기의 image-to-image',
      heading: 'AI 이미지 편집기의 image-to-image',
      description:
        '원본 이미지를 기준으로 수정해야 할 때는 한 장의 소스 이미지를 업로드해 가이드 편집과 세부 보정을 진행할 수 있습니다.',
      keywords:
        'image-to-image, AI 이미지 편집기, AI 사진 편집, 원본 이미지 보정',
      featureList: ['원본 이미지 기반 편집', 'AI 이미지 향상'],
    },
  },
  ar: {
    'text-to-image': {
      metadataTitle: 'text-to-image داخل محرر الصور بالذكاء الاصطناعي',
      heading: 'text-to-image داخل محرر الصور بالذكاء الاصطناعي',
      description:
        'ابدأ من مطالبة نصية عندما تحتاج إلى مفهوم جديد أو صورة منتج أو اتجاه بصري للصور الشخصية أو مادة بصرية لحملة.',
      keywords:
        'text-to-image, محرر صور بالذكاء الاصطناعي, تحرير صور, توليد الصور من المطالبة',
      featureList: [
        'توليد الصور انطلاقًا من المطالبة',
        'بناء أفكار بصرية جديدة',
      ],
    },
    'image-to-image': {
      metadataTitle: 'image-to-image داخل محرر الصور بالذكاء الاصطناعي',
      heading: 'image-to-image داخل محرر الصور بالذكاء الاصطناعي',
      description:
        'ارفع صورة مصدر واحدة عندما تحتاج إلى تعديلات موجهة وتحسينات دقيقة واستمرارية بصرية أقرب.',
      keywords:
        'image-to-image, محرر صور بالذكاء الاصطناعي, تحرير صور, تحسين انطلاقًا من صورة مصدر',
      featureList: [
        'تعديلات موجهة من صورة مصدر',
        'تحسين الصور بالذكاء الاصطناعي',
      ],
    },
  },
};

const MODE_IMAGE_GENERATOR_FAQ_COPY: Record<
  ImageGeneratorCopyLocale,
  Record<ImageGeneratorMode, LandingFAQ>
> = {
  en: {
    'text-to-image': {
      title: 'Text to Image FAQ',
      description:
        'Prompt-only image generation inside the hosted AI image editor workspace.',
      items: [
        {
          question: 'Do I need to upload any image for text-to-image?',
          answer:
            'No. Text-to-image only needs a prompt, plus any optional controls you want to use.',
        },
        {
          question: 'What prompt details matter most?',
          answer:
            'Name the subject, setting, style direction, composition, lighting, and output use. Specific details make the result easier to judge and refine.',
        },
        {
          question: 'Can I edit a text-to-image result afterward?',
          answer:
            'Yes. Download the closest result or use it as a source image in image-to-image, then describe the exact change you want.',
        },
        {
          question: 'What should I change if the image is wrong?',
          answer:
            'Change one thing at a time: prompt wording, model, aspect ratio, or resolution. That keeps retries understandable and avoids wasting credits on random changes.',
        },
      ],
    },
    'image-to-image': {
      title: 'Image to Image FAQ',
      description:
        'Source-image-guided editing inside the hosted AI image editor workspace.',
      items: [
        {
          question: 'Do I need to upload an image for image-to-image?',
          answer:
            'Yes. Image-to-image requires one source image, either uploaded directly or provided as a public image URL.',
        },
        {
          question: 'What kind of source image works best?',
          answer:
            'Use a clear image you have rights to process, with the subject and framing you want preserved. Avoid tiny screenshots or files with heavy compression artifacts.',
        },
        {
          question: 'Can I preserve a person, product, or layout?',
          answer:
            'Yes, but say what must stay stable and what should change. Image-to-image works best when the prompt separates preserved structure from requested edits.',
        },
        {
          question: 'What if the upload or public URL is rejected?',
          answer:
            'Check file type, size, and whether the URL is a direct image link. Use the browser converter or compressor first when the source file is too large or in the wrong format.',
        },
      ],
    },
  },
  zh: {
    'text-to-image': {
      title: '文生图常见问题',
      description: '适用于托管式 AI 图片编辑器工作台里的提示词起稿模式。',
      items: [
        {
          question: '文生图一定要先上传图片吗？',
          answer: '不用。文生图只需要提示词，其他控制项都只是辅助选项。',
        },
        {
          question: '提示词里哪些信息最重要？',
          answer:
            '写清主体、场景、风格方向、构图、光线和最终用途。细节越具体，结果越容易判断和继续细修。',
        },
        {
          question: '文生图结果后面还能继续编辑吗？',
          answer:
            '可以。把最接近目标的结果下载下来，或直接作为图生图源图，再描述你要改的具体位置和效果。',
        },
        {
          question: '图片跑偏时应该先改什么？',
          answer:
            '一次只改一个变量：提示词、模型、比例或分辨率。这样重试更可控，也能少浪费积分。',
        },
      ],
    },
    'image-to-image': {
      title: '图生图常见问题',
      description: '适用于托管式 AI 图片编辑器工作台里的原图定向修改模式。',
      items: [
        {
          question: '图生图一定要先提供图片吗？',
          answer:
            '要。图生图必须先提供一张源图，可以上传，也可以填写公开图片 URL。',
        },
        {
          question: '什么样的源图更适合图生图？',
          answer:
            '源图最好清晰，并且你有权处理，画面里要保留的主体和构图也要明确。太小、太糊或压缩痕迹很重的图不适合做精修起点。',
        },
        {
          question: '能保留人物、产品或版式吗？',
          answer:
            '可以，但要写清哪些必须稳定、哪些需要变化。图生图最怕提示词含糊，把“保留”和“修改”分开写会更稳。',
        },
        {
          question: '上传或公开 URL 被拒怎么办？',
          answer:
            '先检查文件类型、大小，以及 URL 是否是图片直链。文件太大或格式不合适时，先用浏览器转换或压缩工具处理。',
        },
      ],
    },
  },
  de: {
    'text-to-image': {
      title: 'FAQ zur Text-zu-Bild-Generierung',
      description:
        'Prompt-basierte Bildgenerierung im gehosteten KI-Bildeditor-Workspace.',
      items: [
        {
          question:
            'Muss ich für die Text-zu-Bild-Generierung ein Bild hochladen?',
          answer:
            'Nein. Für die Text-zu-Bild-Generierung brauchen Sie nur einen Prompt und optional zusätzliche Einstellungen.',
        },
        {
          question: 'Welche Prompt-Details sind am wichtigsten?',
          answer:
            'Beschreiben Sie Motiv, Szene, Stilrichtung, Komposition, Licht und Verwendungszweck. Konkrete Details machen Ergebnisse leichter beurteilbar und einfacher zu verfeinern.',
        },
        {
          question:
            'Kann ich ein Text-zu-Bild-Ergebnis später weiterbearbeiten?',
          answer:
            'Ja. Laden Sie das beste Ergebnis herunter oder nutzen Sie es in image-to-image als Ausgangsbild und beschreiben Sie die gewünschte Änderung präzise.',
        },
        {
          question: 'Was sollte ich ändern, wenn das Bild nicht passt?',
          answer:
            'Ändern Sie jeweils nur eine Variable: Prompt, Modell, Seitenverhältnis oder Auflösung. So bleiben Wiederholungen nachvollziehbar und Credits werden nicht zufällig verbraucht.',
        },
      ],
    },
    'image-to-image': {
      title: 'FAQ zur Bild-zu-Bild-Bearbeitung',
      description:
        'Quellbildgestützte Bearbeitung im gehosteten KI-Bildeditor-Workspace.',
      items: [
        {
          question:
            'Muss ich für die Bild-zu-Bild-Bearbeitung ein Bild bereitstellen?',
          answer:
            'Ja. Für image-to-image brauchen Sie ein Ausgangsbild, entweder per Upload oder als öffentliche Bild-URL.',
        },
        {
          question: 'Welche Art von Ausgangsbild funktioniert am besten?',
          answer:
            'Nutzen Sie ein klares Bild, an dem Sie die nötigen Rechte haben und auf dem Motiv und Bildausschnitt bereits stimmen. Vermeiden Sie winzige Screenshots oder stark komprimierte Dateien.',
        },
        {
          question: 'Kann ich Person, Produkt oder Layout erhalten?',
          answer:
            'Ja, aber nennen Sie klar, was stabil bleiben muss und was sich ändern soll. Bild-zu-Bild funktioniert am besten, wenn Struktur und Änderungswunsch getrennt beschrieben werden.',
        },
        {
          question: 'Was passiert, wenn Upload oder Bild-URL abgelehnt werden?',
          answer:
            'Prüfen Sie Dateityp, Dateigröße und ob die URL direkt auf ein Bild zeigt. Nutzen Sie zuerst Browser-Konverter oder -Kompressor, wenn die Datei zu groß oder im falschen Format ist.',
        },
      ],
    },
  },
  fr: {
    'text-to-image': {
      title: 'FAQ génération texte en image',
      description:
        "Génération d'image à partir d'un prompt dans l'espace hébergé d'édition d'image IA.",
      items: [
        {
          question:
            'Dois-je téléverser une image pour la génération texte en image ?',
          answer:
            'Non. Un prompt suffit, avec des réglages optionnels si vous en avez besoin.',
        },
        {
          question: 'Quels détails du prompt comptent le plus ?',
          answer:
            'Précisez le sujet, la scène, la direction visuelle, la composition, la lumière et l’usage final. Des détails concrets rendent le résultat plus simple à juger et à affiner.',
        },
        {
          question:
            'Puis-je retoucher ensuite une image générée depuis un prompt ?',
          answer:
            'Oui. Téléchargez le résultat le plus proche de votre objectif ou réutilisez-le comme image source dans image-to-image, puis décrivez la modification exacte souhaitée.',
        },
        {
          question: 'Que changer si la première image n’est pas bonne ?',
          answer:
            'Modifiez une seule variable à la fois : le prompt, le modèle, le ratio ou la résolution. Cela rend les essais plus lisibles et évite de gaspiller des crédits.',
        },
      ],
    },
    'image-to-image': {
      title: 'FAQ édition image en image',
      description:
        "Édition guidée par image source dans l'espace hébergé d'édition d'image IA.",
      items: [
        {
          question: 'Dois-je fournir une image pour l’édition image en image ?',
          answer:
            "Oui. Image-to-image nécessite une image source, soit via upload direct, soit via une URL d'image publique.",
        },
        {
          question: 'Quel type d’image source fonctionne le mieux ?',
          answer:
            'Utilisez une image nette que vous êtes autorisé à traiter, avec le sujet et le cadrage que vous souhaitez conserver. Évitez les petites captures floues ou trop compressées.',
        },
        {
          question:
            'Puis-je préserver une personne, un produit ou une mise en page ?',
          answer:
            'Oui, mais indiquez clairement ce qui doit rester stable et ce qui doit changer. Image-to-image fonctionne mieux quand la structure à conserver et les modifications demandées sont séparées.',
        },
        {
          question:
            'Que faire si le téléversement ou l’URL publique est refusé ?',
          answer:
            'Vérifiez le type de fichier, sa taille et le fait que l’URL pointe directement vers une image. Utilisez d’abord le convertisseur ou le compresseur du navigateur si le fichier est trop lourd ou dans le mauvais format.',
        },
      ],
    },
  },
  es: {
    'text-to-image': {
      title: 'FAQ de texto a imagen',
      description:
        'Generación de imagen a partir de prompt dentro del workspace alojado de edición de imagen IA.',
      items: [
        {
          question: '¿Necesito subir una imagen para texto a imagen?',
          answer:
            'No. Solo necesitas un prompt y, si quieres, controles opcionales.',
        },
        {
          question: '¿Qué detalles del prompt importan más?',
          answer:
            'Describe el sujeto, la escena, la dirección de estilo, la composición, la luz y el uso final. Los detalles concretos hacen que el resultado sea más fácil de evaluar y refinar.',
        },
        {
          question: '¿Puedo editar después una imagen creada desde texto?',
          answer:
            'Sí. Descarga el resultado más cercano a tu objetivo o úsalo como imagen fuente en image-to-image y describe el cambio exacto que quieres hacer.',
        },
        {
          question: '¿Qué debería cambiar si la imagen sale mal?',
          answer:
            'Cambia solo una variable cada vez: el prompt, el modelo, la proporción o la resolución. Así los reintentos siguen siendo claros y no desperdicias créditos.',
        },
      ],
    },
    'image-to-image': {
      title: 'FAQ de imagen a imagen',
      description:
        'Edición guiada por imagen fuente dentro del workspace alojado de edición de imagen IA.',
      items: [
        {
          question: '¿Necesito aportar una imagen para imagen a imagen?',
          answer:
            'Sí. Image-to-image requiere una imagen fuente, ya sea subida directamente o mediante una URL pública de imagen.',
        },
        {
          question: '¿Qué tipo de imagen fuente funciona mejor?',
          answer:
            'Usa una imagen clara que tengas derecho a procesar y donde ya estén el sujeto y el encuadre que quieres conservar. Evita capturas pequeñas o archivos con mucha compresión.',
        },
        {
          question: '¿Puedo conservar una persona, un producto o el layout?',
          answer:
            'Sí, pero indica con claridad qué debe mantenerse estable y qué debe cambiar. Image-to-image funciona mejor cuando separas la estructura que quieres conservar de las ediciones pedidas.',
        },
        {
          question: '¿Qué pasa si se rechaza la subida o la URL pública?',
          answer:
            'Revisa el tipo de archivo, el tamaño y que la URL apunte directamente a una imagen. Usa antes el conversor o el compresor del navegador si el archivo es demasiado grande o tiene un formato incorrecto.',
        },
      ],
    },
  },
  ja: {
    'text-to-image': {
      title: 'テキストから画像へのFAQ',
      description:
        'ホスト型 AI画像編集ワークスペース内でのプロンプト起点の画像生成です。',
      items: [
        {
          question: 'テキストから画像への生成に画像アップロードは必要ですか？',
          answer:
            'いいえ。プロンプトだけで開始でき、必要に応じて追加設定を使えます。',
        },
        {
          question: 'プロンプトでは何を詳しく書くべきですか？',
          answer:
            '被写体、シーン、スタイルの方向、構図、光、用途を具体的に書いてください。情報が具体的なほど結果を判断しやすく、次の調整もしやすくなります。',
        },
        {
          question: 'テキストから生成した画像は後から編集できますか？',
          answer:
            'はい。最も近い結果をダウンロードするか、それを image-to-image の元画像として使い、変更したい内容を具体的に指示してください。',
        },
        {
          question: '画像が思った通りでないときは何を変えるべきですか？',
          answer:
            'プロンプト、モデル、アスペクト比、解像度のどれか一つだけを順番に変えてください。そうすると再試行の理由が分かりやすくなり、クレジットも無駄にしにくくなります。',
        },
      ],
    },
    'image-to-image': {
      title: '画像から画像へのFAQ',
      description:
        'ホスト型 AI画像編集ワークスペース内での元画像ベース編集です。',
      items: [
        {
          question: '画像から画像への編集には元画像が必要ですか？',
          answer:
            'はい。image-to-image では元画像が 1 枚必要で、直接アップロードするか公開画像 URL を使います。',
        },
        {
          question: 'どのような元画像が向いていますか？',
          answer:
            '権利上問題なく処理でき、被写体と構図がすでに整っている鮮明な画像が最適です。小さすぎる画像や強く圧縮された画像は避けてください。',
        },
        {
          question: '人物や商品、レイアウトを保てますか？',
          answer:
            'はい。ただし、何を維持し、何を変えるのかを明確に書いてください。保持したい構造と変更点を分けて書くほど安定しやすくなります。',
        },
        {
          question:
            'アップロードや公開 URL が拒否されたらどうすればいいですか？',
          answer:
            'ファイル形式、サイズ、そして URL が画像直リンクになっているかを確認してください。大きすぎる場合や形式が合わない場合は、先にブラウザの変換ツールや圧縮ツールを使ってください。',
        },
      ],
    },
  },
  it: {
    'text-to-image': {
      title: 'FAQ testo in immagine',
      description:
        'Generazione da prompt nel workspace ospitato di editing immagini AI.',
      items: [
        {
          question: 'Serve caricare un’immagine per testo in immagine?',
          answer: 'No. Basta un prompt, più eventuali controlli opzionali.',
        },
        {
          question: 'Quali dettagli del prompt contano di più?',
          answer:
            'Indica soggetto, scena, direzione stilistica, composizione, luce e uso finale. Più i dettagli sono specifici, più il risultato è semplice da valutare e rifinire.',
        },
        {
          question: 'Posso modificare dopo un risultato testo in immagine?',
          answer:
            'Sì. Scarica il risultato più vicino all’obiettivo oppure usalo come immagine sorgente in image-to-image e descrivi la modifica esatta che vuoi ottenere.',
        },
        {
          question: 'Cosa dovrei cambiare se l’immagine non è corretta?',
          answer:
            'Cambia una sola variabile per volta: prompt, modello, rapporto o risoluzione. Così i tentativi restano comprensibili e non sprechi crediti in modifiche casuali.',
        },
      ],
    },
    'image-to-image': {
      title: 'FAQ immagine in immagine',
      description:
        'Editing guidato da immagine sorgente nel workspace ospitato di editing immagini AI.',
      items: [
        {
          question: 'Serve fornire un’immagine per immagine in immagine?',
          answer:
            "Sì. Image-to-image richiede un'immagine sorgente, caricata direttamente oppure fornita come URL pubblico.",
        },
        {
          question: 'Che tipo di immagine sorgente funziona meglio?',
          answer:
            'Usa un’immagine nitida che hai il diritto di elaborare, con soggetto e inquadratura già vicini a ciò che vuoi preservare. Evita screenshot piccoli o file con forti artefatti di compressione.',
        },
        {
          question: 'Posso preservare una persona, un prodotto o il layout?',
          answer:
            'Sì, ma specifica chiaramente cosa deve restare stabile e cosa deve cambiare. Image-to-image funziona meglio quando separi la struttura da conservare dalle modifiche richieste.',
        },
        {
          question:
            'Cosa succede se il caricamento o l’URL pubblico vengono rifiutati?',
          answer:
            'Controlla tipo file, dimensione e che l’URL punti direttamente a un’immagine. Usa prima il convertitore o il compressore nel browser se il file è troppo grande o nel formato sbagliato.',
        },
      ],
    },
  },
  ko: {
    'text-to-image': {
      title: '텍스트 이미지 생성 FAQ',
      description:
        '호스팅형 AI 이미지 편집 워크스페이스 안에서 프롬프트로 시작하는 이미지 생성입니다.',
      items: [
        {
          question: '텍스트 이미지 생성에 이미지를 올려야 하나요?',
          answer:
            '아니요. 프롬프트만 있으면 시작할 수 있고, 필요하면 추가 옵션을 함께 쓸 수 있습니다.',
        },
        {
          question: '프롬프트에서는 어떤 정보가 가장 중요하나요?',
          answer:
            '주제, 장면, 스타일 방향, 구도, 조명, 최종 용도를 구체적으로 적어 주세요. 디테일이 구체적일수록 결과를 판단하고 다시 다듬기 쉬워집니다.',
        },
        {
          question: '텍스트로 만든 이미지를 나중에 다시 편집할 수 있나요?',
          answer:
            '네. 가장 가까운 결과를 내려받거나 그것을 image-to-image의 원본으로 사용한 뒤, 원하는 변경 사항을 구체적으로 설명하면 됩니다.',
        },
        {
          question:
            '이미지가 원하는 대로 나오지 않으면 무엇을 먼저 바꿔야 하나요?',
          answer:
            '프롬프트, 모델, 비율, 해상도 중 한 번에 하나만 바꾸세요. 그래야 재시도가 이해하기 쉬워지고 크레딧도 불필요하게 낭비하지 않습니다.',
        },
      ],
    },
    'image-to-image': {
      title: '이미지 편집 FAQ',
      description:
        '호스팅형 AI 이미지 편집 워크스페이스 안에서 원본 기반으로 편집하는 모드입니다.',
      items: [
        {
          question: '이미지 편집에는 원본 이미지가 꼭 필요한가요?',
          answer:
            '네. image-to-image에는 원본 이미지가 1장 필요하며, 직접 업로드하거나 공개 이미지 URL을 사용할 수 있습니다.',
        },
        {
          question: '어떤 원본 이미지가 가장 잘 맞나요?',
          answer:
            '처리 권한이 있고, 유지하고 싶은 피사체와 구도가 이미 잘 잡힌 선명한 이미지를 쓰세요. 너무 작은 스크린샷이나 압축 흔적이 심한 파일은 피하는 것이 좋습니다.',
        },
        {
          question: '사람, 상품, 레이아웃을 유지할 수 있나요?',
          answer:
            '네. 다만 무엇을 유지하고 무엇을 바꿀지 분명하게 적어야 합니다. 유지할 구조와 변경 요청을 나눠 설명할수록 결과가 더 안정적입니다.',
        },
        {
          question: '업로드나 공개 URL이 거부되면 어떻게 해야 하나요?',
          answer:
            '파일 형식, 크기, 그리고 URL이 직접 이미지로 연결되는지 확인하세요. 파일이 너무 크거나 형식이 맞지 않으면 먼저 브라우저 변환기나 압축기를 사용하세요.',
        },
      ],
    },
  },
  ar: {
    'text-to-image': {
      title: 'الأسئلة الشائعة لتحويل النص إلى صورة',
      description:
        'توليد الصور انطلاقًا من المطالبة داخل مساحة تحرير الصور المستضافة.',
      items: [
        {
          question: 'هل أحتاج إلى رفع صورة لاستخدام تحويل النص إلى صورة؟',
          answer:
            'لا. يكفي إدخال مطالبة نصية، ويمكنك إضافة إعدادات اختيارية عند الحاجة.',
        },
        {
          question: 'ما أهم التفاصيل التي يجب أن أكتبها في المطالبة؟',
          answer:
            'اذكر الموضوع والمشهد والاتجاه البصري والتكوين والإضاءة والاستخدام النهائي. كلما كانت التفاصيل أوضح كان تقييم النتيجة وتحسينها أسهل.',
        },
        {
          question: 'هل يمكنني تعديل الصورة الناتجة من النص لاحقًا؟',
          answer:
            'نعم. نزّل أقرب نتيجة لهدفك أو استخدمها كصورة مصدر داخل image-to-image ثم صف التعديل المطلوب بدقة.',
        },
        {
          question: 'ما الذي يجب أن أغيّره إذا كانت الصورة غير صحيحة؟',
          answer:
            'غيّر عنصرًا واحدًا في كل مرة: صياغة المطالبة أو النموذج أو نسبة الأبعاد أو الدقة. بهذه الطريقة تبقى المحاولات مفهومة ولا تُهدر الأرصدة عشوائيًا.',
        },
      ],
    },
    'image-to-image': {
      title: 'الأسئلة الشائعة لتحرير الصورة انطلاقًا من صورة',
      description:
        'تحرير موجّه انطلاقًا من صورة مصدر داخل مساحة تحرير الصور المستضافة.',
      items: [
        {
          question: 'هل أحتاج إلى صورة لاستخدام التحرير انطلاقًا من صورة؟',
          answer:
            'نعم. يتطلب image-to-image صورة مصدر واحدة، إمّا عبر الرفع المباشر أو عبر رابط صورة عام.',
        },
        {
          question: 'ما نوع صورة المصدر الذي يعمل بشكل أفضل؟',
          answer:
            'استخدم صورة واضحة تملك حق معالجتها وتُظهر الموضوع والإطار اللذين تريد الحفاظ عليهما. تجنب اللقطات الصغيرة جدًا أو الملفات المضغوطة بشدة.',
        },
        {
          question: 'هل يمكنني الحفاظ على شخص أو منتج أو تخطيط الصفحة؟',
          answer:
            'نعم، لكن عليك توضيح ما يجب أن يبقى ثابتًا وما الذي تريد تغييره. يعمل image-to-image بشكل أفضل عندما تفصل بين البنية التي تريد الحفاظ عليها والتعديلات المطلوبة.',
        },
        {
          question: 'ماذا لو تم رفض الرفع أو رابط الصورة العام؟',
          answer:
            'تحقق من نوع الملف وحجمه وما إذا كان الرابط يشير مباشرة إلى صورة. استخدم أداة التحويل أو الضغط في المتصفح أولًا إذا كان الملف كبيرًا جدًا أو بصيغة غير مناسبة.',
        },
      ],
    },
  },
};

const ROOT_IMAGE_GENERATOR_FAQ_SELECTIONS = [
  [0, 0],
  [0, 2],
  [0, 6],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 1],
  [1, 3],
  [1, 7],
  [1, 5],
  [2, 1],
  [2, 5],
] as const;

function getSelectedRootImageFaqCopy(locale: ImageGeneratorCopyLocale) {
  const sourceFaq = ROOT_IMAGE_GENERATOR_FAQ_COPY[locale];
  const sourceCategories = sourceFaq.categories || [];
  const items = ROOT_IMAGE_GENERATOR_FAQ_SELECTIONS.map(
    ([categoryIndex, itemIndex]) => {
      return sourceCategories[categoryIndex]?.items?.[itemIndex];
    }
  ).filter(
    (item): item is NonNullable<LandingFAQ['items']>[number] =>
      item !== undefined
  );

  return {
    ...sourceFaq,
    categories: undefined,
    items,
  } satisfies LandingFAQ;
}

export function getImageGeneratorRootSeoCopy(locale?: string) {
  const normalizedLocale = normalizeImageGeneratorCopyLocale(locale);
  const localeCopy = imageCopyByLocale[normalizedLocale];

  return replaceBrandTokensDeep({
    metadataTitle: localeCopy.metadata.title,
    heading: localeCopy.page.title,
    description: localeCopy.metadata.description,
    keywords: localeCopy.metadata.keywords,
    featureList: ROOT_IMAGE_GENERATOR_FEATURES[normalizedLocale],
  } satisfies GeneratorSeoCopy);
}

export function getImageGeneratorModeSeoCopy(
  locale: string,
  mode: ImageGeneratorMode
) {
  return replaceBrandTokensDeep(
    MODE_IMAGE_GENERATOR_SEO_COPY[normalizeImageGeneratorCopyLocale(locale)][
      mode
    ]
  );
}

export function getImageGeneratorRootFaqCopy(locale?: string) {
  return replaceBrandTokensDeep(
    getSelectedRootImageFaqCopy(normalizeImageGeneratorCopyLocale(locale))
  );
}

export function getImageGeneratorModeFaqCopy(
  locale: string,
  mode: ImageGeneratorMode
) {
  return replaceBrandTokensDeep(
    MODE_IMAGE_GENERATOR_FAQ_COPY[normalizeImageGeneratorCopyLocale(locale)][
      mode
    ]
  );
}
