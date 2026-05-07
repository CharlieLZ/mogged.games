import { AppLocale, resolveAppLocale } from '@/config/locale';
import { SectionItem } from '@/shared/types/blocks/landing';

import {
  getImageEditorAiHomeVideoSampleUrl,
  getImageEditorAiMediaUrl,
  getImageEditorAiShowcaseLibraryVideoUrl,
  IMAGEEDITORAI_REMOTE_HERO_IMAGE,
  IMAGEEDITORAI_REMOTE_SAMPLE_VIDEO,
  IMAGEEDITORAI_REMOTE_VIDEO_POSTER,
} from './imageeditorai-media';

type LocalizedCopy = Record<AppLocale, string>;

type HomeGalleryEntry = {
  badge: LocalizedCopy;
  title: LocalizedCopy;
  description: LocalizedCopy;
  media: {
    type: 'video';
    src: string;
    posterSrc: string;
  };
};

function copy(value: LocalizedCopy) {
  return value;
}

const VIDEO_SAMPLE_BADGE = copy({
  en: 'Video sample',
  zh: '视频样片',
  de: 'Videobeispiel',
  fr: 'Exemple video',
  es: 'Ejemplo de video',
  ja: '動画サンプル',
  it: 'Esempio video',
  ko: '비디오 샘플',
  ar: 'نموذج فيديو',
});

const HOME_GALLERY: readonly HomeGalleryEntry[] = [
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Food close-up with cinematic motion and texture',
      zh: '食物特写的电影感运动与质感展示',
      de: 'Food-Nahaufnahme mit filmischer Bewegung und Textur',
      fr: 'Gros plan culinaire avec mouvement et texture cinematographiques',
      es: 'Primer plano gastronomico con movimiento y textura cinematograficos',
      ja: '料理の質感を映すシネマティックなクローズアップ',
      it: 'Primo piano food con movimento e texture cinematografiche',
      ko: '시네마틱한 움직임과 질감이 살아 있는 푸드 클로즈업',
      ar: 'لقطة مقرّبة للطعام بحركة وملمس سينمائيين',
    }),
    description: copy({
      en: 'Pulled from the mogged homepage video set to open the gallery with a motion-first signal.',
      zh: '直接沿用 mogged 首页视频样片，让画廊一上来就是更有运动感的开场。',
      de: 'Direkt aus dem mogged-Homepage-Set, damit die Galerie sofort mit einem klaren Motion-Signal startet.',
      fr: 'Repris de la selection video de la page d’accueil mogged pour ouvrir la galerie avec un vrai signal de mouvement.',
      es: 'Tomado del set de videos de la homepage de mogged para abrir la galeria con una senal clara de movimiento.',
      ja: 'mogged のホームページ動画セットから使い、ギャラリーの入り口でまず動きの強さを伝えます。',
      it: 'Ripreso dal set video della homepage di mogged per aprire la galleria con un segnale subito orientato al movimento.',
      ko: 'mogged 홈페이지 영상 세트에서 가져와 갤러리의 첫인상을 확실한 모션 중심으로 열어 줍니다.',
      ar: 'مأخوذة من مجموعة فيديوهات الصفحة الرئيسية في mogged لافتتاح المعرض بإشارة واضحة تركّز على الحركة.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiHomeVideoSampleUrl(1),
      posterSrc: getImageEditorAiMediaUrl('hero4k'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Formation shot for sci-fi squad pacing',
      zh: '科幻小队编队镜头节奏样片',
      de: 'Formationsshot fur das Tempo einer Sci-Fi-Einheit',
      fr: 'Plan de formation pour le rythme d’une escouade sci-fi',
      es: 'Plano de formacion para el ritmo de un escuadron de ciencia ficcion',
      ja: 'SF分隊のテンポを見せるフォーメーションショット',
      it: 'Inquadratura in formazione per il ritmo di una squadra sci-fi',
      ko: 'SF 스쿼드의 템포를 보여 주는 포메이션 샷',
      ar: 'لقطة تشكيل تبرز إيقاع فريق الخيال العلمي',
    }),
    description: copy({
      en: 'A tighter action-oriented sample that feels closer to homepage promo media than a static image tile.',
      zh: '更贴近首页宣传视频的动作样片，不再只是静态封面卡。',
      de: 'Ein kompakteres, actionorientiertes Beispiel, das sich viel eher wie echtes Promo-Material anfuhlt als wie eine statische Kachel.',
      fr: 'Un extrait plus resserre et plus oriente action, bien plus proche d’une vraie video promo que d’une simple vignette statique.',
      es: 'Una muestra mas cerrada y orientada a la accion, mucho mas cercana a una promo real que a una tarjeta estatica.',
      ja: '静止画タイルではなく、ホームのプロモ動画に近いテンポ感を出せるアクション寄りのサンプルです。',
      it: 'Un esempio piu serrato e orientato all’azione, molto piu vicino a una promo reale che a una tile statica.',
      ko: '정적인 썸네일보다는 실제 프로모 영상에 가까운 액션 중심 샘플입니다.',
      ar: 'نموذج أكثر إحكاماً وتركيزاً على الحركة، أقرب إلى فيديو ترويجي حقيقي منه إلى بطاقة ثابتة.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiHomeVideoSampleUrl(2),
      posterSrc: getImageEditorAiMediaUrl('multiShot'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Humorous character selfie motion preview',
      zh: '角色自拍式运动预览',
      de: 'Humorvolle Selfie-Bewegungsvorschau mit Figur',
      fr: 'Apercu selfie d’un personnage avec un ton plus leger',
      es: 'Vista previa tipo selfie de personaje con movimiento y humor',
      ja: 'ユーモアのあるキャラクター自撮りモーション',
      it: 'Anteprima selfie di personaggio con movimento e tono leggero',
      ko: '유머 있는 캐릭터 셀피 모션 프리뷰',
      ar: 'معاينة حركة سيلفي لشخصية بطابع مرح',
    }),
    description: copy({
      en: 'Useful for showing personality, camera angle changes, and lighter short-form use cases.',
      zh: '适合展示人物性格、自拍机位和更偏轻量短视频的使用场景。',
      de: 'Ideal, um Charakter, Kamerawinkelwechsel und leichtere Kurzvideo-Szenarien zu zeigen.',
      fr: 'Utile pour montrer la personnalite, les changements d’angle de camera et des cas d’usage plus legers en format court.',
      es: 'Sirve para mostrar personalidad, cambios de angulo de camara y casos de uso mas ligeros para video corto.',
      ja: 'キャラクター性やカメラ角度の変化、軽めのショート動画用途を見せるのに向いています。',
      it: 'Utile per mostrare personalita, cambi di angolazione e casi d’uso short-form piu leggeri.',
      ko: '캐릭터의 개성과 카메라 각도 변화, 가벼운 숏폼 활용 장면을 보여 주기에 좋습니다.',
      ar: 'مفيد لإظهار الشخصية وتغيّر زوايا الكاميرا وسيناريوهات الفيديو القصير الأخف.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiHomeVideoSampleUrl(3),
      posterSrc: getImageEditorAiMediaUrl('characterConsistency'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Ancient city fly-through with stronger atmosphere',
      zh: '古城穿行镜头的氛围展示',
      de: 'Flug durch eine alte Stadt mit starkerer Atmosphare',
      fr: 'Survol d’une cite ancienne avec une ambiance plus forte',
      es: 'Recorrido por una ciudad antigua con una atmosfera mas marcada',
      ja: '古代都市を抜ける没入感のあるフライスルー',
      it: 'Volo attraverso una citta antica con piu atmosfera',
      ko: '분위기가 더 살아 있는 고대 도시 플라이스루',
      ar: 'تحليق داخل مدينة قديمة بأجواء أقوى',
    }),
    description: copy({
      en: 'A stronger environmental sequence for teams that care about tracking shots and mood.',
      zh: '更适合承接追踪镜头和氛围感需求的环境型片段。',
      de: 'Eine starkere Umgebungssequenz fur Teams, denen Tracking-Shots und Stimmung wichtig sind.',
      fr: 'Une sequence environnementale plus marquee pour les equipes qui accordent de l’importance au tracking et a l’ambiance.',
      es: 'Una secuencia ambiental mas potente para equipos que valoran el tracking y la atmosfera.',
      ja: 'トラッキングショットや空気感を重視するチーム向けの、環境表現が強いシーケンスです。',
      it: 'Una sequenza ambientale piu forte per i team che tengono a tracking shot e atmosfera.',
      ko: '트래킹 샷과 무드를 중시하는 팀에 어울리는 환경 중심 시퀀스입니다.',
      ar: 'مشهد بيئي أقوى للفرق التي تهتم بلقطات التتبّع وبناء المزاج.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiHomeVideoSampleUrl(4),
      posterSrc: getImageEditorAiMediaUrl('motionControl'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Cockpit-to-cosmos transition sequence',
      zh: '驾驶舱到宇宙穿越的转场序列',
      de: 'Ubergangssequenz vom Cockpit in den Kosmos',
      fr: 'Sequence de transition du cockpit vers le cosmos',
      es: 'Secuencia de transicion de cabina hacia el cosmos',
      ja: 'コックピットから宇宙へ抜ける転換シーケンス',
      it: 'Sequenza di transizione dalla cabina al cosmo',
      ko: '콕핏에서 우주로 이어지는 전환 시퀀스',
      ar: 'تسلسل انتقال من قمرة القيادة إلى الفضاء',
    }),
    description: copy({
      en: 'Pulled from the same homepage sample family and better suited for motion-led landing storytelling.',
      zh: '同样来自首页视频样片体系，更适合首页用动态叙事讲能力。',
      de: 'Stammt aus derselben Homepage-Sample-Familie und eignet sich besser fur bewegungsgetriebenes Landing-Storytelling.',
      fr: 'Issu de la meme famille de samples que la homepage, il convient mieux a un storytelling de landing porte par le mouvement.',
      es: 'Viene de la misma familia de samples de la homepage y funciona mejor para un storytelling de landing guiado por movimiento.',
      ja: '同じホームページ用サンプル群から取り、動きで見せるランディングの物語により合います。',
      it: 'Arriva dalla stessa famiglia di sample della homepage ed e piu adatto a uno storytelling di landing guidato dal movimento.',
      ko: '같은 홈페이지 샘플 계열에서 가져와 모션 중심의 랜딩 스토리텔링에 더 잘 맞습니다.',
      ar: 'مأخوذ من نفس عائلة عينات الصفحة الرئيسية، وهو أنسب لسرد الصفحة المبني على الحركة.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiHomeVideoSampleUrl(5),
      posterSrc: getImageEditorAiMediaUrl('nativeAudio'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Portal chase through a ruined alien landscape',
      zh: '穿越异星遗迹的追逐场景',
      de: 'Portaljagd durch eine zerfallene Alien-Landschaft',
      fr: 'Course-poursuite via un portail dans un decor alien en ruine',
      es: 'Persecucion por portal en un paisaje alienigena en ruinas',
      ja: '荒廃した異星の地形を抜けるポータルチェイス',
      it: 'Inseguimento attraverso un portale in un paesaggio alieno in rovina',
      ko: '폐허가 된 외계 풍경을 가로지르는 포털 추격 장면',
      ar: 'مطاردة عبر بوابة داخل مشهد فضائي مدمّر',
    }),
    description: copy({
      en: 'This keeps the gallery anchored in actual moving footage instead of relying on still-only storytelling.',
      zh: '让首页画廊继续停留在真实动态素材，而不是退回只靠静图讲故事。',
      de: 'So bleibt die Galerie bei echtem Bewegtbild verankert, statt nur noch uber statische Bilder zu erzahlen.',
      fr: 'Cela maintient la galerie ancree dans une vraie matiere animee au lieu de retomber dans un storytelling base sur des images fixes.',
      es: 'Asi la galeria sigue apoyandose en metraje en movimiento real en lugar de depender solo de imagenes estaticas.',
      ja: '静止画だけに頼らず、ギャラリー全体を実際の動きのある素材に留めておけます。',
      it: 'Mantiene la galleria ancorata a filmati in movimento reali invece di affidarsi solo a immagini statiche.',
      ko: '정적인 이미지 설명으로 돌아가지 않고, 갤러리를 실제 움직이는 장면 중심으로 유지해 줍니다.',
      ar: 'يبقي المعرض مرتكزاً على لقطات متحركة فعلية بدلاً من الاكتفاء بسرد يعتمد على الصور الثابتة.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiHomeVideoSampleUrl(6),
      posterSrc: getImageEditorAiMediaUrl('socialMedia'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Icebreaker aerial with large-scale cinematic motion',
      zh: '破冰船航拍的大场景动态样片',
      de: 'Luftaufnahme eines Eisbrechers mit grossformatiger Filmbewegung',
      fr: 'Vue aerienne de brise-glace avec grand mouvement cinematographique',
      es: 'Toma aerea de rompehielos con movimiento cinematografico a gran escala',
      ja: 'スケール感のある砕氷船のシネマティック空撮',
      it: 'Ripresa aerea di rompighiaccio con movimento cinematografico su larga scala',
      ko: '대규모 시네마틱 무브가 살아 있는 쇄빙선 항공 샷',
      ar: 'لقطة جوية لكاسحة جليد بحركة سينمائية واسعة النطاق',
    }),
    description: copy({
      en: 'Useful for scale, camera travel, and cleaner cinematic pacing on the homepage.',
      zh: '适合承接大场景、远景运动和更干净的电影化节奏。',
      de: 'Stark fur Massstab, Kamerafahrten und ein saubereres cineastisches Tempo auf der Homepage.',
      fr: 'Utile pour montrer l’echelle, les deplacements de camera et un rythme cinematographique plus propre sur la homepage.',
      es: 'Funciona muy bien para mostrar escala, recorrido de camara y un ritmo cinematografico mas limpio en la homepage.',
      ja: 'スケール感、カメラ移動、そしてホーム全体のすっきりした映画的テンポを見せるのに役立ちます。',
      it: 'Utile per mostrare scala, movimento di camera e un ritmo cinematografico piu pulito sulla homepage.',
      ko: '스케일과 카메라 이동, 그리고 홈페이지에서 더 정돈된 시네마틱 리듬을 보여 주기에 좋습니다.',
      ar: 'مفيد لإظهار الحجم وحركة الكاميرا وإيقاع سينمائي أنظف على الصفحة الرئيسية.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiHomeVideoSampleUrl(7),
      posterSrc: getImageEditorAiMediaUrl('storytelling'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Dropship hover sequence with smoke and thrusters',
      zh: '悬停运输舰与烟尘推进器样片',
      de: 'Schwebesequenz eines Landungsschiffs mit Rauch und Triebwerken',
      fr: 'Sequence de vol stationnaire d’un dropship avec fumee et reacteurs',
      es: 'Secuencia de nave en suspension con humo y propulsores',
      ja: '煙とスラスターを伴うドロップシップのホバリング',
      it: 'Sequenza di hover di un dropship con fumo e propulsori',
      ko: '연기와 스러스터가 살아 있는 드롭십 호버 시퀀스',
      ar: 'تسلسل تحويم لمركبة إنزال مع الدخان والدوافع',
    }),
    description: copy({
      en: 'A stronger final video card for sci-fi spectacle, motion continuity, and launch-page energy.',
      zh: '更适合收尾成一张“科幻感、连续运动、发布页气势”都到位的视频卡。',
      de: 'Eine starke Schlusskarte fur Sci-Fi-Spektakel, Bewegungs-Kontinuitat und echte Launch-Page-Energie.',
      fr: 'Une carte finale plus forte pour le spectaculaire sci-fi, la continuite du mouvement et l’energie de la page de lancement.',
      es: 'Una carta final mas potente para rematar con espectaculo sci-fi, continuidad de movimiento y energia de lanzamiento.',
      ja: 'SFらしい派手さ、動きの連続性、そしてローンチページの勢いを締めで支える強いカードです。',
      it: 'Una carta finale piu forte per spettacolo sci-fi, continuita del movimento ed energia da launch page.',
      ko: 'SF 스펙터클과 모션의 연속성, 랜딩 페이지의 에너지를 마무리로 끌어올리는 카드입니다.',
      ar: 'بطاقة ختامية أقوى تجمع بين الاستعراض العلمي واستمرارية الحركة وطاقة صفحة الإطلاق.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiHomeVideoSampleUrl(8),
      posterSrc: getImageEditorAiMediaUrl('imageToVideo'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Autumn forest chase with stronger camera travel',
      zh: '秋林追逐镜头的强运动样片',
      de: 'Herbstliche Waldjagd mit starkerer Kamerafahrt',
      fr: 'Poursuite en foret d’automne avec camera plus engagee',
      es: 'Persecucion en bosque de otono con mas desplazamiento de camara',
      ja: 'カメラ移動が強い秋の森のチェイス',
      it: 'Inseguimento nel bosco autunnale con maggiore movimento di camera',
      ko: '카메라 이동이 더 강한 가을 숲 추격 장면',
      ar: 'مطاردة في غابة خريفية مع حركة كاميرا أقوى',
    }),
    description: copy({
      en: 'A faster action-led sample with stronger forward motion, cleaner tracking, and a more dramatic environmental sweep.',
      zh: '更强调高速追逐、镜头前进和环境扫动感，适合补足这组画廊的动作密度。',
      de: 'Ein schnelleres, actiongetriebenes Beispiel mit klarerer Vorwartsbewegung, sauberem Tracking und dramatischerem Umgebungszug.',
      fr: 'Un extrait plus rapide, guide par l’action, avec une avancee de camera plus nette, un tracking plus propre et un balayage de decor plus dramatique.',
      es: 'Una muestra mas rapida y guiada por la accion, con avance de camara mas claro, tracking mas limpio y un barrido ambiental mas dramatico.',
      ja: '前進感の強いカメラ、きれいなトラッキング、より劇的な環境スイープで、ギャラリー後半の運動量を補えます。',
      it: 'Un esempio piu rapido e guidato dall’azione, con avanzamento piu marcato, tracking piu pulito e sweep ambientale piu drammatico.',
      ko: '전진감과 트래킹, 환경 스윕이 더 또렷한 액션형 샘플로 갤러리 후반의 밀도를 채워 줍니다.',
      ar: 'نموذج أسرع تقوده الحركة، مع اندفاع أمامي أوضح وتتبع أنظف ومسح بصري أكثر درامية للمشهد.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiShowcaseLibraryVideoUrl(9),
      posterSrc: getImageEditorAiMediaUrl('hero4k'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Lifestyle product demo with softer commercial pacing',
      zh: '生活方式产品演示的轻商业节奏样片',
      de: 'Lifestyle-Produktdemo mit weicherem Werberhythmus',
      fr: 'Demo produit lifestyle avec un rythme commercial plus doux',
      es: 'Demo de producto lifestyle con un ritmo comercial mas suave',
      ja: 'やわらかな商用テンポのライフスタイル商品デモ',
      it: 'Demo prodotto lifestyle con un ritmo commerciale piu morbido',
      ko: '부드러운 상업 리듬의 라이프스타일 제품 데모',
      ar: 'عرض منتج لايف ستايل بإيقاع تجاري أكثر هدوءاً',
    }),
    description: copy({
      en: 'A calmer product-and-lifestyle clip that helps the gallery show cleaner ad pacing instead of only spectacle.',
      zh: '这条更偏产品和生活方式，适合让画廊里不只有大场面，也能看到更实用的商业节奏。',
      de: 'Ein ruhigerer Produkt-und-Lifestyle-Clip, damit die Galerie nicht nur Spektakel, sondern auch saubereres Werbetempo zeigt.',
      fr: 'Un clip plus calme, oriente produit et lifestyle, pour montrer dans la galerie un rythme publicitaire plus propre et pas seulement du spectaculaire.',
      es: 'Un clip mas calmado, centrado en producto y lifestyle, para que la galeria muestre tambien un ritmo publicitario mas limpio.',
      ja: '派手さだけでなく、商品やライフスタイル寄りの落ち着いた広告テンポも見せられるクリップです。',
      it: 'Un clip piu calmo, orientato a prodotto e lifestyle, che aiuta la galleria a mostrare un ritmo adv piu pulito e non solo spettacolo.',
      ko: '스펙터클만이 아니라 더 실용적인 광고 리듬도 보여 줄 수 있는 차분한 제품·라이프스타일 클립입니다.',
      ar: 'مقطع أهدأ يركّز على المنتج ونمط الحياة، ليُظهر المعرض إيقاعاً إعلانياً أنظف لا يعتمد فقط على الاستعراض.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiShowcaseLibraryVideoUrl(10),
      posterSrc: getImageEditorAiMediaUrl('marketing'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Urban pursuit sequence with tighter action beats',
      zh: '城市追逐动作节奏样片',
      de: 'Stadtjagd mit strafferen Action-Beats',
      fr: 'Poursuite urbaine avec des temps d’action plus serres',
      es: 'Secuencia de persecucion urbana con beats de accion mas tensos',
      ja: 'アクションの刻みが締まった都市追走シーケンス',
      it: 'Sequenza di inseguimento urbano con beat d’azione piu serrati',
      ko: '액션 비트가 더 타이트한 도심 추격 시퀀스',
      ar: 'تسلسل مطاردة حضرية بإيقاع حركة أكثر إحكاماً',
    }),
    description: copy({
      en: 'This adds a punchier street-level chase sample so the later cards stay kinetic instead of flattening out.',
      zh: '用更紧张的街头追逐片段补上后半段，让后几张卡继续保持动态而不是把节奏放平。',
      de: 'Bringt eine druckvollere Strassenjagd hinein, damit die spateren Karten dynamisch bleiben statt abzubauen.',
      fr: 'Ajoute une poursuite de rue plus nerveuse afin que les dernieres cartes restent dynamiques au lieu de retomber.',
      es: 'Suma una persecucion callejera mas contundente para que las ultimas tarjetas sigan con energia en lugar de aplanarse.',
      ja: '後半のカードが失速しないよう、路上チェイスの勢いを足して全体の運動感を保ちます。',
      it: 'Aggiunge un inseguimento urbano piu incisivo cosi le card finali restano dinamiche invece di appiattirsi.',
      ko: '후반 카드가 힘을 잃지 않도록 더 타이트한 스트리트 체이스를 넣어 전체의 운동감을 유지합니다.',
      ar: 'يضيف مطاردة شارع أكثر حدّة حتى تبقى البطاقات الأخيرة حيوية بدل أن يهبط الإيقاع.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiShowcaseLibraryVideoUrl(11),
      posterSrc: getImageEditorAiMediaUrl('ecommerce'),
    },
  },
  {
    badge: VIDEO_SAMPLE_BADGE,
    title: copy({
      en: 'Character-led close-up with nostalgic motion detail',
      zh: '人物近景与怀旧动作细节样片',
      de: 'Figurgefuhrte Nahaufnahme mit nostalgischen Bewegungsdetails',
      fr: 'Gros plan centre personnage avec un detail de mouvement nostalgique',
      es: 'Primer plano guiado por personaje con detalle de movimiento nostalgico',
      ja: 'ノスタルジックな動きの表情を持つ人物寄りクローズアップ',
      it: 'Primo piano guidato dal personaggio con dettagli di movimento nostalgici',
      ko: '향수 어린 움직임 디테일이 살아 있는 인물 중심 클로즈업',
      ar: 'لقطة مقرّبة تقودها الشخصية مع تفاصيل حركة حنينية',
    }),
    description: copy({
      en: 'A softer character-focused clip gives the gallery one more human-scale beat without breaking the motion-first rhythm.',
      zh: '最后用一条更有人物温度的片段收尾，让整组样片保持动态，同时多一点情绪和生活感。',
      de: 'Ein weicherer, figurfokussierter Clip gibt der Galerie zum Schluss noch einen menschlicheren Beat, ohne den Motion-Rhythmus zu brechen.',
      fr: 'Un clip plus doux et centre sur le personnage apporte une derniere respiration plus humaine sans casser le rythme oriente mouvement.',
      es: 'Un clip mas suave y centrado en personaje aporta un ultimo pulso mas humano sin romper el ritmo basado en movimiento.',
      ja: 'モーション重視の流れを崩さずに、最後にもう一段人間味と感情を足せる柔らかなクリップです。',
      it: 'Un clip piu morbido e centrato sul personaggio aggiunge un ultimo battito piu umano senza spezzare il ritmo motion-first.',
      ko: '모션 중심 리듬을 깨지 않으면서 마지막에 사람 냄새와 감정을 한 번 더 보태는 부드러운 클립입니다.',
      ar: 'مقطع أكثر هدوءاً يركّز على الشخصية ويضيف نبضة إنسانية أخيرة من دون كسر إيقاع الحركة الأساسي.',
    }),
    media: {
      type: 'video',
      src: getImageEditorAiShowcaseLibraryVideoUrl(12),
      posterSrc: getImageEditorAiMediaUrl('styleControl'),
    },
  },
] as const;

export {
  IMAGEEDITORAI_REMOTE_HERO_IMAGE,
  IMAGEEDITORAI_REMOTE_SAMPLE_VIDEO,
  IMAGEEDITORAI_REMOTE_VIDEO_POSTER,
};

export function getHomeGalleryItems(locale: string): SectionItem[] {
  const resolvedLocale = resolveAppLocale(locale);

  return HOME_GALLERY.map((entry) => ({
    badge: entry.badge[resolvedLocale],
    title: entry.title[resolvedLocale],
    description: entry.description[resolvedLocale],
    type: entry.media.type,
    url: entry.media.src,
    image: {
      src: entry.media.posterSrc,
      alt: entry.title[resolvedLocale],
    },
  }));
}
