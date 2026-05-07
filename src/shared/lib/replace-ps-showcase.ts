import {
  locales,
  resolveAppLocale,
  type AppLocale,
} from '@/config/locale';

const R2_BASE_URL = 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev';
const R2_REPLACE_PS_IMAGE_PATTERN = new RegExp(
  `^${R2_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(?:background|lighting|color|item)-(?:before|after)-[a-z0-9-]+\\.webp$`
);

type LocalizedText = Record<AppLocale, string>;

type ReplacePsShowcaseImageSource = {
  alt: LocalizedText;
  src: string;
};

type ReplacePsShowcaseSlideSource = {
  afterImage: ReplacePsShowcaseImageSource;
  id: string;
  prompt: LocalizedText;
};

type ReplacePsShowcaseCategorySource = {
  beforeImage: ReplacePsShowcaseImageSource;
  id: string;
  slides: readonly ReplacePsShowcaseSlideSource[];
  tabLabel: LocalizedText;
};

export type ReplacePsShowcaseImage = {
  alt: string;
  src: string;
};

export type ReplacePsShowcaseSlide = {
  afterImage: ReplacePsShowcaseImage;
  id: string;
  prompt: string;
};

export type ReplacePsShowcaseCategory = {
  beforeImage: ReplacePsShowcaseImage;
  id: string;
  slides: ReplacePsShowcaseSlide[];
  tabLabel: string;
};

export type ReplacePsShowcaseCopy = {
  aiBadge: string;
  beforeLabel: string;
  copied: string;
  copyFailed: string;
  copyPrompt: string;
  description: string;
  imagePreview: string;
  next: string;
  openPreview: string;
  pauseAutoRotate: string;
  playAutoRotate: string;
  previous: string;
  promptLabel: string;
  tabListLabel: string;
  title: string;
  unavailable: string;
};

function r2Image(fileName: string) {
  return `${R2_BASE_URL}/${fileName}`;
}

function text(values: LocalizedText) {
  return values;
}

function localizeText(value: LocalizedText, locale?: string) {
  return value[resolveAppLocale(locale)];
}

const replacePsCategories = [
  {
    id: 'background-replacement',
    tabLabel: text({
      en: 'Background Replacement',
      zh: '替换背景',
      de: 'Hintergrund austauschen',
      fr: "Remplacer l'arrière-plan",
      es: 'Reemplazar fondo',
      ja: '背景を差し替え',
      it: 'Sostituire sfondo',
      ko: '배경 바꾸기',
      ar: 'استبدال الخلفية',
    }),
    beforeImage: {
      src: r2Image('background-before-desert-jeep.webp'),
      alt: text({
        en: 'Background Replacement before image showing a red Jeep in a dry desert landscape',
        zh: '替换背景前的红色越野车沙漠照片',
        de: 'Vorher-Bild zum Hintergrundaustausch mit rotem Jeep in trockener Wüste',
        fr: "Image avant du remplacement d'arrière-plan avec une jeep rouge dans un désert sec",
        es: 'Imagen previa de reemplazo de fondo con un Jeep rojo en un desierto seco',
        ja: '乾いた砂漠にいる赤いジープの背景差し替え前画像',
        it: 'Immagine prima della sostituzione dello sfondo con jeep rossa nel deserto arido',
        ko: '메마른 사막의 빨간 지프를 보여 주는 배경 교체 전 이미지',
        ar: 'صورة قبل استبدال الخلفية لجيب أحمر في صحراء جافة',
      }),
    },
    slides: [
      {
        id: 'background-green-field',
        prompt: text({
          en: 'Change the background to a vast grassland.',
          zh: '把背景换成一片广阔草地。',
          de: 'Ändere den Hintergrund in eine weite Graslandschaft.',
          fr: 'Remplace le fond par une vaste prairie.',
          es: 'Cambia el fondo por una gran pradera.',
          ja: '背景を広い草原に変更する。',
          it: 'Sostituisci lo sfondo con una vasta prateria.',
          ko: '배경을 넓은 초원으로 바꾼다.',
          ar: 'غيّر الخلفية إلى مرج عشبي واسع.',
        }),
        afterImage: {
          src: r2Image('background-after-green-field-jeep.webp'),
          alt: text({
            en: 'Background Replacement after image showing the red Jeep in a green grassland',
            zh: '替换背景后的红色越野车草地照片',
            de: 'Nachher-Bild zum Hintergrundaustausch mit rotem Jeep auf grüner Wiese',
            fr: "Image après du remplacement d'arrière-plan avec une jeep rouge dans une prairie verte",
            es: 'Imagen posterior de reemplazo de fondo con el Jeep rojo en una pradera verde',
            ja: '草原の中にいる赤いジープの背景差し替え後画像',
            it: 'Immagine dopo la sostituzione dello sfondo con jeep rossa in un prato verde',
            ko: '푸른 초원 속 빨간 지프를 보여 주는 배경 교체 후 이미지',
            ar: 'صورة بعد استبدال الخلفية لجيب أحمر في مرج أخضر',
          }),
        },
      },
      {
        id: 'background-snowy-winter',
        prompt: text({
          en: 'Change the background to a snowy winter landscape.',
          zh: '把背景换成雪地冬季场景。',
          de: 'Ändere den Hintergrund in eine verschneite Winterlandschaft.',
          fr: 'Remplace le fond par un paysage hivernal enneigé.',
          es: 'Cambia el fondo por un paisaje invernal nevado.',
          ja: '背景を雪のある冬景色に変更する。',
          it: 'Sostituisci lo sfondo con un paesaggio invernale innevato.',
          ko: '배경을 눈 덮인 겨울 풍경으로 바꾼다.',
          ar: 'غيّر الخلفية إلى مشهد شتوي مغطى بالثلج.',
        }),
        afterImage: {
          src: r2Image('background-after-snowy-winter-jeep.webp'),
          alt: text({
            en: 'Background Replacement after image showing the red Jeep in a snowy winter scene',
            zh: '替换背景后的红色越野车雪地照片',
            de: 'Nachher-Bild zum Hintergrundaustausch mit rotem Jeep in verschneiter Winterkulisse',
            fr: "Image après du remplacement d'arrière-plan avec une jeep rouge dans un décor hivernal enneigé",
            es: 'Imagen posterior de reemplazo de fondo con el Jeep rojo en un paisaje nevado',
            ja: '雪景色の中にいる赤いジープの背景差し替え後画像',
            it: 'Immagine dopo la sostituzione dello sfondo con jeep rossa in una scena invernale innevata',
            ko: '눈 덮인 겨울 장면의 빨간 지프를 보여 주는 배경 교체 후 이미지',
            ar: 'صورة بعد استبدال الخلفية لجيب أحمر في مشهد شتوي ثلجي',
          }),
        },
      },
      {
        id: 'background-urban-street',
        prompt: text({
          en: 'Change the background to a clean urban street.',
          zh: '把背景换成干净的城市街道。',
          de: 'Ändere den Hintergrund in eine saubere Stadtstraße.',
          fr: 'Remplace le fond par une rue urbaine propre.',
          es: 'Cambia el fondo por una calle urbana limpia.',
          ja: '背景を整った都市の通りに変更する。',
          it: 'Sostituisci lo sfondo con una strada urbana pulita.',
          ko: '배경을 깔끔한 도심 거리로 바꾼다.',
          ar: 'غيّر الخلفية إلى شارع حضري نظيف.',
        }),
        afterImage: {
          src: r2Image('background-after-urban-street-jeep.webp'),
          alt: text({
            en: 'Background Replacement after image showing the red Jeep on an urban street',
            zh: '替换背景后的红色越野车城市街道照片',
            de: 'Nachher-Bild zum Hintergrundaustausch mit rotem Jeep auf Stadtstraße',
            fr: "Image après du remplacement d'arrière-plan avec une jeep rouge dans une rue urbaine",
            es: 'Imagen posterior de reemplazo de fondo con el Jeep rojo en una calle urbana',
            ja: '都市の通りにいる赤いジープの背景差し替え後画像',
            it: 'Immagine dopo la sostituzione dello sfondo con jeep rossa in una strada urbana',
            ko: '도심 거리의 빨간 지프를 보여 주는 배경 교체 후 이미지',
            ar: 'صورة بعد استبدال الخلفية لجيب أحمر في شارع حضري',
          }),
        },
      },
    ],
  },
  {
    id: 'lighting-adjustment',
    tabLabel: text({
      en: 'Lighting Adjustment',
      zh: '调整光线',
      de: 'Licht anpassen',
      fr: 'Ajuster la lumière',
      es: 'Ajustar luz',
      ja: '光を調整',
      it: 'Regolare luce',
      ko: '조명 조정',
      ar: 'ضبط الإضاءة',
    }),
    beforeImage: {
      src: r2Image('lighting-before-coastal-day.webp'),
      alt: text({
        en: 'Lighting Adjustment before image showing a coastal city in flat daylight',
        zh: '调整光线前的海岸城市日光照片',
        de: 'Vorher-Bild zur Lichtanpassung mit Küstenstadt bei flachem Tageslicht',
        fr: 'Image avant de réglage de lumière montrant une ville côtière en lumière plate',
        es: 'Imagen previa de ajuste de luz con una ciudad costera bajo luz plana',
        ja: 'フラットな昼光の海岸都市を写した光調整前画像',
        it: 'Immagine prima della regolazione luce con città costiera in luce piatta',
        ko: '평평한 낮빛의 해안 도시를 보여 주는 조명 조정 전 이미지',
        ar: 'صورة قبل ضبط الإضاءة لمدينة ساحلية في ضوء نهاري مسطح',
      }),
    },
    slides: [
      {
        id: 'lighting-golden-hour',
        prompt: text({
          en: 'Add warm sunlight effect.',
          zh: '添加温暖的阳光效果。',
          de: 'Füge einen warmen Sonnenlichteffekt hinzu.',
          fr: 'Ajoute un effet de lumière solaire chaleureuse.',
          es: 'Añade un efecto de luz solar cálida.',
          ja: '暖かな夕日効果を加える。',
          it: 'Aggiungi un effetto di luce solare calda.',
          ko: '따뜻한 햇빛 효과를 더한다.',
          ar: 'أضف تأثير ضوء شمس دافئ.',
        }),
        afterImage: {
          src: r2Image('lighting-after-golden-hour-coast.webp'),
          alt: text({
            en: 'Lighting Adjustment after image with warm golden hour sunlight',
            zh: '调整光线后的暖色夕阳海岸照片',
            de: 'Nachher-Bild zur Lichtanpassung mit warmem Abendlicht',
            fr: 'Image après de réglage de lumière avec une lumière dorée chaude',
            es: 'Imagen posterior de ajuste de luz con luz cálida de golden hour',
            ja: '暖かなゴールデンアワーの光になった後の画像',
            it: 'Immagine dopo la regolazione luce con calda luce dorata',
            ko: '따뜻한 골든아워 빛으로 바뀐 조명 조정 후 이미지',
            ar: 'صورة بعد ضبط الإضاءة مع ضوء ذهبي دافئ',
          }),
        },
      },
      {
        id: 'lighting-blue-hour',
        prompt: text({
          en: 'Shift the scene to blue hour with cooler light.',
          zh: '把场景调整成冷色蓝调时刻。',
          de: 'Verschiebe die Szene in die blaue Stunde mit kühlerem Licht.',
          fr: "Fais passer la scène à l'heure bleue avec une lumière plus froide.",
          es: 'Lleva la escena a la hora azul con una luz más fría.',
          ja: 'シーンを寒色のブルーアワーに変える。',
          it: 'Sposta la scena verso l’ora blu con una luce più fredda.',
          ko: '장면을 더 차가운 블루아워 조명으로 바꾼다.',
          ar: 'انقل المشهد إلى الساعة الزرقاء بإضاءة أبرد.',
        }),
        afterImage: {
          src: r2Image('lighting-after-blue-hour-coast.webp'),
          alt: text({
            en: 'Lighting Adjustment after image with cooler blue hour lighting',
            zh: '调整光线后的冷色蓝调海岸照片',
            de: 'Nachher-Bild zur Lichtanpassung mit kühlem Blau-Stunden-Licht',
            fr: "Image après de réglage de lumière avec une lumière d'heure bleue plus froide",
            es: 'Imagen posterior de ajuste de luz con iluminación azulada y fría',
            ja: '涼しいブルーアワーの光になった後の画像',
            it: 'Immagine dopo la regolazione luce con illuminazione fredda da ora blu',
            ko: '차가운 블루아워 조명으로 바뀐 조명 조정 후 이미지',
            ar: 'صورة بعد ضبط الإضاءة مع إنارة زرقاء باردة',
          }),
        },
      },
      {
        id: 'lighting-night-city',
        prompt: text({
          en: 'Add nighttime city lights and dramatic contrast.',
          zh: '加入夜景城市灯光和更强对比。',
          de: 'Füge nächtliche Stadtlichter und stärkeren Kontrast hinzu.',
          fr: 'Ajoute des lumières de ville nocturnes et un contraste plus dramatique.',
          es: 'Añade luces urbanas nocturnas y un contraste más dramático.',
          ja: '夜景の街灯と強いコントラストを加える。',
          it: 'Aggiungi luci notturne cittadine e un contrasto più deciso.',
          ko: '야간 도시 조명과 더 강한 대비를 더한다.',
          ar: 'أضف أضواء مدينة ليلية وتباينًا دراميًا أقوى.',
        }),
        afterImage: {
          src: r2Image('lighting-after-night-city-lights.webp'),
          alt: text({
            en: 'Lighting Adjustment after image with nighttime city lights',
            zh: '调整光线后的夜景城市灯光照片',
            de: 'Nachher-Bild zur Lichtanpassung mit nächtlichen Stadtlichtern',
            fr: 'Image après de réglage de lumière avec lumières urbaines nocturnes',
            es: 'Imagen posterior de ajuste de luz con luces urbanas nocturnas',
            ja: '夜の街灯が加わった後の光調整画像',
            it: 'Immagine dopo la regolazione luce con luci cittadine notturne',
            ko: '야간 도시 조명이 더해진 조명 조정 후 이미지',
            ar: 'صورة بعد ضبط الإضاءة مع أضواء مدينة ليلية',
          }),
        },
      },
    ],
  },
  {
    id: 'color-change',
    tabLabel: text({
      en: 'Color Change',
      zh: '更换颜色',
      de: 'Farbe ändern',
      fr: 'Changer la couleur',
      es: 'Cambiar color',
      ja: '色を変更',
      it: 'Cambiare colore',
      ko: '색상 변경',
      ar: 'تغيير اللون',
    }),
    beforeImage: {
      src: r2Image('color-before-red-rose.webp'),
      alt: text({
        en: 'Color Change before image showing a red rose',
        zh: '更换颜色前的红玫瑰照片',
        de: 'Vorher-Bild zur Farbänderung mit roter Rose',
        fr: 'Image avant de changement de couleur montrant une rose rouge',
        es: 'Imagen previa de cambio de color con una rosa roja',
        ja: '赤いバラの色変更前画像',
        it: 'Immagine prima del cambio colore con una rosa rossa',
        ko: '빨간 장미를 보여 주는 색상 변경 전 이미지',
        ar: 'صورة قبل تغيير اللون لوردة حمراء',
      }),
    },
    slides: [
      {
        id: 'color-blue-rose',
        prompt: text({
          en: 'Change the rose to blue.',
          zh: '把玫瑰改成蓝色。',
          de: 'Ändere die Rose in Blau.',
          fr: 'Change la rose en bleu.',
          es: 'Cambia la rosa a azul.',
          ja: 'バラを青に変える。',
          it: 'Trasforma la rosa in blu.',
          ko: '장미를 파란색으로 바꾼다.',
          ar: 'حوّل الوردة إلى اللون الأزرق.',
        }),
        afterImage: {
          src: r2Image('color-after-blue-rose.webp'),
          alt: text({
            en: 'Color Change after image showing the rose changed to blue',
            zh: '更换颜色后的蓝玫瑰照片',
            de: 'Nachher-Bild zur Farbänderung mit blau gewordener Rose',
            fr: 'Image après de changement de couleur montrant la rose devenue bleue',
            es: 'Imagen posterior de cambio de color con la rosa azul',
            ja: '青いバラになった後の画像',
            it: 'Immagine dopo il cambio colore con la rosa diventata blu',
            ko: '파란 장미로 바뀐 색상 변경 후 이미지',
            ar: 'صورة بعد تغيير اللون لوردة أصبحت زرقاء',
          }),
        },
      },
      {
        id: 'color-yellow-rose',
        prompt: text({
          en: 'Change the rose to yellow.',
          zh: '把玫瑰改成黄色。',
          de: 'Ändere die Rose in Gelb.',
          fr: 'Change la rose en jaune.',
          es: 'Cambia la rosa a amarillo.',
          ja: 'バラを黄色に変える。',
          it: 'Trasforma la rosa in giallo.',
          ko: '장미를 노란색으로 바꾼다.',
          ar: 'حوّل الوردة إلى اللون الأصفر.',
        }),
        afterImage: {
          src: r2Image('color-after-yellow-rose.webp'),
          alt: text({
            en: 'Color Change after image showing the rose changed to yellow',
            zh: '更换颜色后的黄玫瑰照片',
            de: 'Nachher-Bild zur Farbänderung mit gelb gewordener Rose',
            fr: 'Image après de changement de couleur montrant la rose devenue jaune',
            es: 'Imagen posterior de cambio de color con la rosa amarilla',
            ja: '黄色いバラになった後の画像',
            it: 'Immagine dopo il cambio colore con la rosa diventata gialla',
            ko: '노란 장미로 바뀐 색상 변경 후 이미지',
            ar: 'صورة بعد تغيير اللون لوردة أصبحت صفراء',
          }),
        },
      },
      {
        id: 'color-green-rose',
        prompt: text({
          en: 'Change the rose to green.',
          zh: '把玫瑰改成绿色。',
          de: 'Ändere die Rose in Grün.',
          fr: 'Change la rose en vert.',
          es: 'Cambia la rosa a verde.',
          ja: 'バラを緑に変える。',
          it: 'Trasforma la rosa in verde.',
          ko: '장미를 초록색으로 바꾼다.',
          ar: 'حوّل الوردة إلى اللون الأخضر.',
        }),
        afterImage: {
          src: r2Image('color-after-green-rose.webp'),
          alt: text({
            en: 'Color Change after image showing the rose changed to green',
            zh: '更换颜色后的绿玫瑰照片',
            de: 'Nachher-Bild zur Farbänderung mit grün gewordener Rose',
            fr: 'Image après de changement de couleur montrant la rose devenue verte',
            es: 'Imagen posterior de cambio de color con la rosa verde',
            ja: '緑のバラになった後の画像',
            it: 'Immagine dopo il cambio colore con la rosa diventata verde',
            ko: '초록 장미로 바뀐 색상 변경 후 이미지',
            ar: 'صورة بعد تغيير اللون لوردة أصبحت خضراء',
          }),
        },
      },
    ],
  },
  {
    id: 'item-replacement',
    tabLabel: text({
      en: 'Item Replacement',
      zh: '替换物品',
      de: 'Objekt ersetzen',
      fr: "Remplacer l'objet",
      es: 'Reemplazar objeto',
      ja: '物を差し替え',
      it: 'Sostituire oggetto',
      ko: '사물 교체',
      ar: 'استبدال العنصر',
    }),
    beforeImage: {
      src: r2Image('item-before-latte-on-table.webp'),
      alt: text({
        en: 'Item Replacement before image showing a latte on a wooden table',
        zh: '替换物品前的木桌拿铁照片',
        de: 'Vorher-Bild zum Objektwechsel mit Latte auf Holztisch',
        fr: "Image avant du remplacement d'objet montrant un latte sur une table en bois",
        es: 'Imagen previa de reemplazo de objeto con un latte sobre una mesa de madera',
        ja: '木のテーブルに置かれたラテの物差し替え前画像',
        it: 'Immagine prima della sostituzione oggetto con latte su tavolo di legno',
        ko: '나무 테이블 위 라테를 보여 주는 사물 교체 전 이미지',
        ar: 'صورة قبل استبدال العنصر لفنجان لاتيه على طاولة خشبية',
      }),
    },
    slides: [
      {
        id: 'item-cola-bottle',
        prompt: text({
          en: 'Turn coffee into cola.',
          zh: '把咖啡换成可乐。',
          de: 'Verwandle den Kaffee in Cola.',
          fr: 'Transforme le café en cola.',
          es: 'Convierte el café en cola.',
          ja: 'コーヒーをコーラに変える。',
          it: 'Trasforma il caffè in cola.',
          ko: '커피를 콜라로 바꾼다.',
          ar: 'حوّل القهوة إلى زجاجة كولا.',
        }),
        afterImage: {
          src: r2Image('item-after-cola-bottle.webp'),
          alt: text({
            en: 'Item Replacement after image showing a cola bottle on the wooden table',
            zh: '替换物品后的木桌可乐瓶照片',
            de: 'Nachher-Bild zum Objektwechsel mit Colaflasche auf Holztisch',
            fr: "Image après du remplacement d'objet montrant une bouteille de cola sur la table en bois",
            es: 'Imagen posterior de reemplazo de objeto con una botella de cola sobre la mesa',
            ja: '木のテーブルにコーラ瓶が置かれた差し替え後画像',
            it: 'Immagine dopo la sostituzione oggetto con bottiglia di cola sul tavolo',
            ko: '나무 테이블 위 콜라병으로 바뀐 사물 교체 후 이미지',
            ar: 'صورة بعد استبدال العنصر لزجاجة كولا على الطاولة الخشبية',
          }),
        },
      },
      {
        id: 'item-banana-plate',
        prompt: text({
          en: 'Replace the coffee with a banana on a plate.',
          zh: '把咖啡换成盘子里的香蕉。',
          de: 'Ersetze den Kaffee durch eine Banane auf einem Teller.',
          fr: 'Remplace le café par une banane sur une assiette.',
          es: 'Sustituye el café por un plátano en un plato.',
          ja: 'コーヒーを皿の上のバナナに置き換える。',
          it: 'Sostituisci il caffè con una banana su un piatto.',
          ko: '커피를 접시 위 바나나로 바꾼다.',
          ar: 'استبدل القهوة بموزة موضوعة على طبق.',
        }),
        afterImage: {
          src: r2Image('item-after-banana-on-plate.webp'),
          alt: text({
            en: 'Item Replacement after image showing a banana on a plate on the wooden table',
            zh: '替换物品后的木桌香蕉盘照片',
            de: 'Nachher-Bild zum Objektwechsel mit Banane auf Teller auf Holztisch',
            fr: "Image après du remplacement d'objet montrant une banane sur une assiette en bois",
            es: 'Imagen posterior de reemplazo de objeto con un plátano en un plato sobre la mesa',
            ja: '木のテーブルで皿に載ったバナナへ置き換えた後の画像',
            it: 'Immagine dopo la sostituzione oggetto con banana su piatto sul tavolo',
            ko: '접시 위 바나나로 바뀐 사물 교체 후 이미지',
            ar: 'صورة بعد استبدال العنصر لموزة على طبق فوق الطاولة الخشبية',
          }),
        },
      },
      {
        id: 'item-white-cup',
        prompt: text({
          en: 'Replace the latte with a clean white cup.',
          zh: '把拿铁换成干净的白色杯子。',
          de: 'Ersetze den Latte durch eine saubere weiße Tasse.',
          fr: 'Remplace le latte par une tasse blanche propre.',
          es: 'Sustituye el latte por una taza blanca limpia.',
          ja: 'ラテを清潔な白いカップに置き換える。',
          it: 'Sostituisci il latte con una tazza bianca pulita.',
          ko: '라테를 깔끔한 흰 컵으로 바꾼다.',
          ar: 'استبدل اللاتيه بكوب أبيض نظيف.',
        }),
        afterImage: {
          src: r2Image('item-after-white-cup-on-table.webp'),
          alt: text({
            en: 'Item Replacement after image showing a clean white cup on the wooden table',
            zh: '替换物品后的木桌白色杯子照片',
            de: 'Nachher-Bild zum Objektwechsel mit sauberer weißer Tasse auf Holztisch',
            fr: "Image après du remplacement d'objet montrant une tasse blanche propre sur la table",
            es: 'Imagen posterior de reemplazo de objeto con una taza blanca limpia sobre la mesa',
            ja: '木のテーブルで白いカップに置き換えた後の画像',
            it: 'Immagine dopo la sostituzione oggetto con tazza bianca pulita sul tavolo',
            ko: '흰 컵으로 바뀐 사물 교체 후 이미지',
            ar: 'صورة بعد استبدال العنصر لكوب أبيض نظيف على الطاولة الخشبية',
          }),
        },
      },
    ],
  },
] as const satisfies readonly ReplacePsShowcaseCategorySource[];

const showcaseCopyByLocale = {
  en: {
    title: 'Skip the traditional Photoshop workflow',
    description:
      'mogged can edit pictures without any professional photo editing expertise.',
    tabListLabel: 'Image editing examples',
    beforeLabel: 'Before',
    aiBadge: 'AI',
    promptLabel: 'Prompt',
    copyPrompt: 'Copy prompt',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    previous: 'Previous after image',
    next: 'Next after image',
    imagePreview: 'Image preview',
    openPreview: 'Open larger preview',
    pauseAutoRotate: 'Pause automatic showcase',
    playAutoRotate: 'Play automatic showcase',
    unavailable: 'Preview unavailable',
  },
  zh: {
    title: '跳过传统 PS 流程',
    description: 'mogged 不需要专业修图经验，也能完成常见图片编辑。',
    tabListLabel: '图片编辑示例',
    beforeLabel: '编辑前',
    aiBadge: 'AI',
    promptLabel: '提示词',
    copyPrompt: '复制提示词',
    copied: '已复制',
    copyFailed: '复制失败',
    previous: '上一张效果图',
    next: '下一张效果图',
    imagePreview: '图片预览',
    openPreview: '打开大图预览',
    pauseAutoRotate: '暂停自动展示',
    playAutoRotate: '播放自动展示',
    unavailable: '预览暂不可用',
  },
  de: {
    title: 'Traditionelles Photoshop ersetzen',
    description:
      'mogged bearbeitet Bilder auch ohne professionelle Retuschekenntnisse.',
    tabListLabel: 'Beispiele für Bildbearbeitung',
    beforeLabel: 'Vorher',
    aiBadge: 'AI',
    promptLabel: 'Prompt',
    copyPrompt: 'Prompt kopieren',
    copied: 'Kopiert',
    copyFailed: 'Kopieren fehlgeschlagen',
    previous: 'Vorheriges Ergebnis',
    next: 'Nächstes Ergebnis',
    imagePreview: 'Bildvorschau',
    openPreview: 'Große Vorschau öffnen',
    pauseAutoRotate: 'Automatische Vorschau pausieren',
    playAutoRotate: 'Automatische Vorschau starten',
    unavailable: 'Vorschau nicht verfügbar',
  },
  fr: {
    title: 'Remplacer le Photoshop traditionnel',
    description:
      "mogged permet d'éditer des images sans compétence professionnelle en retouche.",
    tabListLabel: "Exemples d'édition d'image",
    beforeLabel: 'Avant',
    aiBadge: 'AI',
    promptLabel: 'Prompt',
    copyPrompt: 'Copier le prompt',
    copied: 'Copié',
    copyFailed: 'Copie impossible',
    previous: 'Résultat précédent',
    next: 'Résultat suivant',
    imagePreview: "Aperçu de l'image",
    openPreview: "Ouvrir l'aperçu en grand",
    pauseAutoRotate: 'Mettre la rotation automatique en pause',
    playAutoRotate: 'Relancer la rotation automatique',
    unavailable: 'Aperçu indisponible',
  },
  es: {
    title: 'Sustituir el Photoshop tradicional',
    description:
      'mogged permite editar imágenes sin experiencia profesional en retoque.',
    tabListLabel: 'Ejemplos de edición de imagen',
    beforeLabel: 'Antes',
    aiBadge: 'AI',
    promptLabel: 'Prompt',
    copyPrompt: 'Copiar prompt',
    copied: 'Copiado',
    copyFailed: 'No se pudo copiar',
    previous: 'Resultado anterior',
    next: 'Resultado siguiente',
    imagePreview: 'Vista previa de imagen',
    openPreview: 'Abrir vista ampliada',
    pauseAutoRotate: 'Pausar muestra automática',
    playAutoRotate: 'Reanudar muestra automática',
    unavailable: 'Vista previa no disponible',
  },
  ja: {
    title: '従来の Photoshop を置き換える',
    description:
      'mogged なら、専門的なレタッチ経験がなくても日常的な画像編集を進められます。',
    tabListLabel: '画像編集の作例',
    beforeLabel: '編集前',
    aiBadge: 'AI',
    promptLabel: 'プロンプト',
    copyPrompt: 'プロンプトをコピー',
    copied: 'コピーしました',
    copyFailed: 'コピーに失敗しました',
    previous: '前の結果',
    next: '次の結果',
    imagePreview: '画像プレビュー',
    openPreview: '拡大プレビューを開く',
    pauseAutoRotate: '自動切り替えを停止',
    playAutoRotate: '自動切り替えを再開',
    unavailable: 'プレビューを表示できません',
  },
  it: {
    title: 'Sostituire il Photoshop tradizionale',
    description:
      'mogged consente di modificare immagini senza esperienza professionale di ritocco.',
    tabListLabel: 'Esempi di modifica immagine',
    beforeLabel: 'Prima',
    aiBadge: 'AI',
    promptLabel: 'Prompt',
    copyPrompt: 'Copia prompt',
    copied: 'Copiato',
    copyFailed: 'Copia non riuscita',
    previous: 'Risultato precedente',
    next: 'Risultato successivo',
    imagePreview: 'Anteprima immagine',
    openPreview: 'Apri anteprima grande',
    pauseAutoRotate: 'Metti in pausa la rotazione automatica',
    playAutoRotate: 'Riavvia la rotazione automatica',
    unavailable: 'Anteprima non disponibile',
  },
  ko: {
    title: '기존 Photoshop 작업을 대체',
    description:
      'mogged 는 전문 보정 경험이 없어도 일상적인 이미지 편집을 진행할 수 있게 해 줍니다.',
    tabListLabel: '이미지 편집 예시',
    beforeLabel: '편집 전',
    aiBadge: 'AI',
    promptLabel: '프롬프트',
    copyPrompt: '프롬프트 복사',
    copied: '복사됨',
    copyFailed: '복사 실패',
    previous: '이전 결과',
    next: '다음 결과',
    imagePreview: '이미지 미리보기',
    openPreview: '큰 미리보기 열기',
    pauseAutoRotate: '자동 전환 일시정지',
    playAutoRotate: '자동 전환 재생',
    unavailable: '미리보기를 불러올 수 없음',
  },
  ar: {
    title: 'بديل عن الفوتوشوب التقليدي',
    description:
      'يتيح لك mogged تعديل الصور من دون خبرة احترافية في التنقيح.',
    tabListLabel: 'أمثلة على تعديل الصور',
    beforeLabel: 'قبل',
    aiBadge: 'AI',
    promptLabel: 'الوصف',
    copyPrompt: 'نسخ الوصف',
    copied: 'تم النسخ',
    copyFailed: 'فشل النسخ',
    previous: 'النتيجة السابقة',
    next: 'النتيجة التالية',
    imagePreview: 'معاينة الصورة',
    openPreview: 'فتح معاينة أكبر',
    pauseAutoRotate: 'إيقاف العرض التلقائي مؤقتًا',
    playAutoRotate: 'تشغيل العرض التلقائي',
    unavailable: 'المعاينة غير متاحة',
  },
} as const satisfies Record<AppLocale, ReplacePsShowcaseCopy>;

function assertLocalizedText(
  value: LocalizedText,
  field: string,
  itemId: string
) {
  for (const locale of locales) {
    if (!value[locale]?.trim()) {
      throw new Error(
        `[replace-ps-showcase] missing ${field} for ${itemId} (${locale})`
      );
    }
  }
}

function assertReplacePsImage(
  image: ReplacePsShowcaseImageSource,
  field: string,
  itemId: string
) {
  assertLocalizedText(image.alt, `${field}.alt`, itemId);

  if (!image.src.trim()) {
    throw new Error(`[replace-ps-showcase] missing ${field}.src for ${itemId}`);
  }

  if (!R2_REPLACE_PS_IMAGE_PATTERN.test(image.src)) {
    throw new Error(
      `[replace-ps-showcase] invalid R2 image URL for ${itemId}.${field}`
    );
  }
}

function assertReplacePsSlide(
  slide: ReplacePsShowcaseSlideSource,
  categoryId: string
) {
  if (!slide.id.trim()) {
    throw new Error(`[replace-ps-showcase] missing slide id for ${categoryId}`);
  }

  assertLocalizedText(slide.prompt, 'prompt', slide.id);
  assertReplacePsImage(slide.afterImage, 'afterImage', slide.id);
}

function assertReplacePsCategory(category: ReplacePsShowcaseCategorySource) {
  if (!category.id.trim()) {
    throw new Error('[replace-ps-showcase] missing category id');
  }

  assertLocalizedText(category.tabLabel, 'tabLabel', category.id);
  assertReplacePsImage(category.beforeImage, 'beforeImage', category.id);

  if (category.slides.length < 1) {
    throw new Error(`[replace-ps-showcase] missing slides for ${category.id}`);
  }

  category.slides.forEach((slide) => assertReplacePsSlide(slide, category.id));
}

export function getReplacePsShowcaseCategories(
  locale?: string
): ReplacePsShowcaseCategory[] {
  replacePsCategories.forEach(assertReplacePsCategory);

  return replacePsCategories.map((category) => ({
    id: category.id,
    tabLabel: localizeText(category.tabLabel, locale),
    beforeImage: {
      alt: localizeText(category.beforeImage.alt, locale),
      src: category.beforeImage.src,
    },
    slides: category.slides.map((slide) => ({
      id: slide.id,
      prompt: localizeText(slide.prompt, locale),
      afterImage: {
        alt: localizeText(slide.afterImage.alt, locale),
        src: slide.afterImage.src,
      },
    })),
  }));
}

export function getReplacePsShowcaseCopy(
  locale?: string
): ReplacePsShowcaseCopy {
  return showcaseCopyByLocale[resolveAppLocale(locale)];
}
