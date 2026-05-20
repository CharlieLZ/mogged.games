import {
  getLocaleBcp47,
  getLocaleDirection,
  resolveAppLocale,
  type AppLocale,
} from '@/config/locale';
import { getLocalizedPath } from '@/core/i18n/localized-path';
import {
  DEFAULT_VIDEO_GENERATOR_MODE,
  VIDEO_GENERATOR_MODES,
  parseVideoGeneratorMode,
  type VideoGeneratorMode,
} from '@/shared/blocks/generator/video-generator-mode';
import { getAiVideoGeneratorModeStateHref } from '@/shared/lib/ai-video-generator-route';
import {
  getAppName,
  getAppUrl,
  getInitialCreditsAmount,
  getSupportEmail,
} from '@/shared/lib/brand';

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;

export type WelcomeEmailOptions = {
  initialCreditsAmount?: number;
  locale?: string | null;
  recommendedWorkflow?: VideoGeneratorMode | null;
};

type WorkflowCopy = Record<
  VideoGeneratorMode,
  {
    description: string;
    cta: string;
  }
>;

type WelcomeEmailCopy = {
  locale: AppLocale;
  localeTag: string;
  dir: 'ltr' | 'rtl';
  subject: (
    appName: string,
    firstName: string,
    initialCreditsAmount: number
  ) => string;
  title: (appName: string) => string;
  subtitle: string;
  greeting: (firstName: string) => string;
  intro: (initialCreditsAmount: number) => string;
  credits: (initialCreditsAmount: number) => string;
  workflowTitle: string;
  workflowIntro: string;
  recommendedBadge: string;
  workflowCopy: WorkflowCopy;
  keepMovingTitle: string;
  workspaceNote: string;
  pricingTitle: string;
  pricingDescription: string;
  activityTitle: string;
  activityDescription: string;
  help: (supportEmail: string) => string;
  footer: (appName: string, domain: string) => string;
};

const WELCOME_COPY: Record<
  AppLocale,
  Omit<WelcomeEmailCopy, 'locale' | 'localeTag' | 'dir'>
> = {
  en: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `Welcome to ${appName}, ${firstName} - your account credits are ready`,
    title: (appName) => `Welcome to ${appName}`,
    subtitle: 'Your hosted video workspace and account credits are ready',
    greeting: (firstName) => `Hi ${firstName},`,
    intro: (initialCreditsAmount) =>
      `Thanks for signing up. Your account credit balance already includes ${initialCreditsAmount} credits, so you can start with the workflow that best matches your first goal right away.`,
    credits: (initialCreditsAmount) =>
      `${initialCreditsAmount} credits are ready now. Pick the clearest starting point for your first successful run.`,
    workflowTitle: 'Pick your first workflow',
    workflowIntro:
      'Choose the entry that matches how you want to start your first run.',
    recommendedBadge: 'Recommended for you',
    workflowCopy: {
      'text-to-video': {
        description:
          'Start from a prompt only when you want to explore concepts fast without preparing assets first.',
        cta: 'Open text-to-video',
      },
      'image-to-video': {
        description:
          'Start from a still image when you already have a key frame, product shot, or visual reference to animate.',
        cta: 'Open image-to-video',
      },
      'reference-to-video': {
        description:
          'Start with multiple reference assets when you need tighter control over motion, look, and direction.',
        cta: 'Open reference-to-video',
      },
    },
    keepMovingTitle: 'Keep moving after your first run',
    workspaceNote:
      'mogged runs, browser tools, and task history live in the same flow.',
    pricingTitle: 'Review plans and credits',
    pricingDescription:
      'Check credits, pricing, and runtime limits before you scale up.',
    activityTitle: 'Track your runs',
    activityDescription:
      'Review task history, progress, and outputs without hunting through old tabs.',
    help: (supportEmail) =>
      `Questions? Reply to this email or contact ${supportEmail}.`,
    footer: (appName, domain) =>
      `This welcome email was sent because you created a ${appName} account at ${domain}.`,
  },
  zh: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `欢迎来到 ${appName}，${firstName}，你的账户积分已就绪`,
    title: (appName) => `欢迎来到 ${appName}`,
    subtitle: '你的托管视频工作台和账户积分已经准备好了',
    greeting: (firstName) => `${firstName}，你好：`,
    intro: (initialCreditsAmount) =>
      `感谢注册。你的账户积分余额已经包含 ${initialCreditsAmount} 个积分，可以先从最适合当前目标的工作流开始，尽快拿到第一次成功生成。`,
    credits: (initialCreditsAmount) =>
      `${initialCreditsAmount} 个积分已经到账。先选一个最适合起步的工作流，马上开始。`,
    workflowTitle: '选择你的第一个工作流',
    workflowIntro: '按你手头的素材和目标，选最适合的入口。',
    recommendedBadge: '推荐给你',
    workflowCopy: {
      'text-to-video': {
        description:
          '如果你想先用 prompt 快速探索创意、不准备素材就开跑，先从这里开始。',
        cta: '打开 text-to-video',
      },
      'image-to-video': {
        description:
          '如果你已经有静帧、产品图或关键视觉，想把它动起来，先从这里开始。',
        cta: '打开 image-to-video',
      },
      'reference-to-video': {
        description:
          '如果你要更强的风格、运动和多素材控制，直接从这个入口开始。',
        cta: '打开 reference-to-video',
      },
    },
    keepMovingTitle: '第一次生成后，继续往下走',
    workspaceNote:
      'mogged 的生成、浏览器工具和任务记录都在同一条工作流里。',
    pricingTitle: '查看套餐和积分',
    pricingDescription: '放量之前先看清积分、价格和时长限制。',
    activityTitle: '查看任务记录',
    activityDescription: '随时回看历史任务、进度和输出结果，不用翻旧标签页。',
    help: (supportEmail) =>
      `有问题直接回复这封邮件，或联系 ${supportEmail}。`,
    footer: (appName, domain) =>
      `这封欢迎邮件发送给你，是因为你刚刚在 ${domain} 创建了 ${appName} 账户。`,
  },
  de: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `Willkommen bei ${appName}, ${firstName} - deine Kontocredits sind bereit`,
    title: (appName) => `Willkommen bei ${appName}`,
    subtitle:
      'Dein gehosteter Video-Workspace und deine Kontocredits sind bereit',
    greeting: (firstName) => `Hallo ${firstName},`,
    intro: (initialCreditsAmount) =>
      `Danke fuer deine Anmeldung. Dein Kontocredit-Saldo enthaelt bereits ${initialCreditsAmount} Credits, damit du direkt mit dem Workflow starten kannst, der am besten zu deinem ersten Ziel passt.`,
    credits: (initialCreditsAmount) =>
      `${initialCreditsAmount} Credits sind bereit. Waehle den klarsten Einstieg fuer deinen ersten erfolgreichen Run.`,
    workflowTitle: 'Waehle deinen ersten Workflow',
    workflowIntro:
      'Nimm den Einstieg, der am besten zu deinem Material und Ziel passt.',
    recommendedBadge: 'Fuer dich empfohlen',
    workflowCopy: {
      'text-to-video': {
        description:
          'Starte nur mit einem Prompt, wenn du Ideen schnell ausprobieren willst, ohne zuerst Assets vorzubereiten.',
        cta: 'text-to-video oeffnen',
      },
      'image-to-video': {
        description:
          'Starte mit einem Standbild, wenn du bereits ein Keyframe, Produktbild oder visuelles Motiv animieren willst.',
        cta: 'image-to-video oeffnen',
      },
      'reference-to-video': {
        description:
          'Starte mit Referenzmaterial, wenn du mehr Kontrolle ueber Bewegung, Look und Richtung brauchst.',
        cta: 'reference-to-video oeffnen',
      },
    },
    keepMovingTitle: 'Nach dem ersten Run direkt weitermachen',
    workspaceNote:
      'mogged Runs, Browser-Tools und Aufgabenverlauf bleiben im selben Flow.',
    pricingTitle: 'Plaene und Credits pruefen',
    pricingDescription:
      'Sieh dir Credits, Preise und Laufzeitgrenzen an, bevor du hochskalierst.',
    activityTitle: 'Runs nachverfolgen',
    activityDescription:
      'Pruefe Aufgabenverlauf, Fortschritt und Outputs ohne alte Tabs zu durchsuchen.',
    help: (supportEmail) =>
      `Fragen? Antworte auf diese E-Mail oder schreibe an ${supportEmail}.`,
    footer: (appName, domain) =>
      `Diese Willkommens-E-Mail wurde gesendet, weil du bei ${domain} ein ${appName}-Konto erstellt hast.`,
  },
  fr: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `Bienvenue sur ${appName}, ${firstName} - vos credits de compte sont prets`,
    title: (appName) => `Bienvenue sur ${appName}`,
    subtitle:
      'Votre espace video heberge et vos credits de compte sont prets',
    greeting: (firstName) => `Bonjour ${firstName},`,
    intro: (initialCreditsAmount) =>
      `Merci pour votre inscription. Le solde de votre compte inclut deja ${initialCreditsAmount} credits pour demarrer tout de suite avec le workflow le plus adapte a votre premier objectif.`,
    credits: (initialCreditsAmount) =>
      `${initialCreditsAmount} credits sont deja disponibles. Choisissez le point d'entree le plus clair pour votre premiere generation reussie.`,
    workflowTitle: 'Choisissez votre premier workflow',
    workflowIntro:
      `Prenez l'entree qui correspond le mieux a vos assets et a votre objectif.`,
    recommendedBadge: 'Recommande pour vous',
    workflowCopy: {
      'text-to-video': {
        description:
          `Commencez avec un simple prompt si vous voulez explorer des idees vite, sans preparer d'assets au depart.`,
        cta: 'Ouvrir text-to-video',
      },
      'image-to-video': {
        description:
          `Commencez avec une image fixe si vous avez deja un plan, un visuel produit ou une reference a animer.`,
        cta: 'Ouvrir image-to-video',
      },
      'reference-to-video': {
        description:
          'Commencez avec des references si vous avez besoin de plus de controle sur le mouvement, le style et la direction.',
        cta: 'Ouvrir reference-to-video',
      },
    },
    keepMovingTitle: 'Continuez apres votre premiere generation',
    workspaceNote:
      `Les generations mogged, les outils navigateur et l'historique des taches restent dans le meme flux.`,
    pricingTitle: 'Voir les offres et les credits',
    pricingDescription:
      'Verifiez credits, tarifs et limites de duree avant de monter en charge.',
    activityTitle: 'Suivre vos generations',
    activityDescription:
      `Retrouvez l'historique, la progression et les sorties sans fouiller vos anciens onglets.`,
    help: (supportEmail) =>
      `Des questions ? Repondez a cet e-mail ou contactez ${supportEmail}.`,
    footer: (appName, domain) =>
      `Cet e-mail de bienvenue vous a ete envoye parce que vous avez cree un compte ${appName} sur ${domain}.`,
  },
  es: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `Bienvenido a ${appName}, ${firstName} - tus creditos de cuenta ya estan listos`,
    title: (appName) => `Bienvenido a ${appName}`,
    subtitle:
      'Tu espacio de video alojado y tus creditos de cuenta ya estan listos',
    greeting: (firstName) => `Hola ${firstName},`,
    intro: (initialCreditsAmount) =>
      `Gracias por registrarte. El saldo de tu cuenta ya incluye ${initialCreditsAmount} creditos para que empieces de inmediato con el workflow que mejor encaje con tu primer objetivo.`,
    credits: (initialCreditsAmount) =>
      `${initialCreditsAmount} creditos ya estan disponibles. Elige el punto de entrada mas claro para lograr tu primera generacion con exito.`,
    workflowTitle: 'Elige tu primer workflow',
    workflowIntro:
      'Escoge la entrada que mejor encaje con tus assets y tu objetivo.',
    recommendedBadge: 'Recomendado para ti',
    workflowCopy: {
      'text-to-video': {
        description:
          'Empieza solo con un prompt si quieres explorar ideas rapido sin preparar assets primero.',
        cta: 'Abrir text-to-video',
      },
      'image-to-video': {
        description:
          'Empieza desde una imagen fija si ya tienes un fotograma clave, una imagen de producto o una referencia visual para animar.',
        cta: 'Abrir image-to-video',
      },
      'reference-to-video': {
        description:
          'Empieza con referencias si necesitas mas control sobre movimiento, estilo y direccion.',
        cta: 'Abrir reference-to-video',
      },
    },
    keepMovingTitle: 'Sigue despues de tu primera generacion',
    workspaceNote:
      'Las ejecuciones de mogged, las herramientas del navegador y el historial de tareas viven en el mismo flujo.',
    pricingTitle: 'Revisar planes y creditos',
    pricingDescription:
      'Consulta creditos, precios y limites de duracion antes de escalar.',
    activityTitle: 'Seguir tus ejecuciones',
    activityDescription:
      'Revisa historial, progreso y resultados sin rebuscar en pestanas viejas.',
    help: (supportEmail) =>
      `¿Preguntas? Responde a este correo o escribe a ${supportEmail}.`,
    footer: (appName, domain) =>
      `Este correo de bienvenida se envio porque creaste una cuenta de ${appName} en ${domain}.`,
  },
  ja: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `${appName} へようこそ、${firstName}さん。アカウントクレジットの準備ができました`,
    title: (appName) => `${appName} へようこそ`,
    subtitle:
      'ホスト型の動画ワークスペースとアカウントクレジットの準備ができました',
    greeting: (firstName) => `${firstName}さん、こんにちは。`,
    intro: (initialCreditsAmount) =>
      `登録ありがとうございます。アカウント残高にはすでに ${initialCreditsAmount} 個のクレジットが入っているので、最初の目的に合う workflow からすぐ始められます。`,
    credits: (initialCreditsAmount) =>
      `${initialCreditsAmount} クレジットをすぐ使えます。最初の成功につながる workflow を選んで始めてください。`,
    workflowTitle: '最初の workflow を選んでください',
    workflowIntro:
      '手元の素材とやりたいことに合う入口を選びましょう。',
    recommendedBadge: 'おすすめ',
    workflowCopy: {
      'text-to-video': {
        description:
          'まずはプロンプトだけで素早くアイデアを試したいときに向いています。',
        cta: 'text-to-video を開く',
      },
      'image-to-video': {
        description:
          'すでに静止画やキーフレーム、商品画像があり、それを動かしたいときに向いています。',
        cta: 'image-to-video を開く',
      },
      'reference-to-video': {
        description:
          '動きや見た目、複数素材の指示をより細かくコントロールしたいときに向いています。',
        cta: 'reference-to-video を開く',
      },
    },
    keepMovingTitle: '最初の生成のあともすぐ進めます',
    workspaceNote:
      'mogged の生成、ブラウザツール、タスク履歴は同じ流れの中で使えます。',
    pricingTitle: 'プランとクレジットを見る',
    pricingDescription:
      '本格運用の前にクレジット、料金、実行時間の上限を確認できます。',
    activityTitle: '実行履歴を見る',
    activityDescription:
      '古いタブを探さなくても、履歴、進捗、出力をまとめて確認できます。',
    help: (supportEmail) =>
      `質問があれば、このメールに返信するか ${supportEmail} まで連絡してください。`,
    footer: (appName, domain) =>
      `このウェルカムメールは、${domain} で ${appName} のアカウントが作成されたため送信されています。`,
  },
  it: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `Benvenuto su ${appName}, ${firstName} - i crediti del tuo account sono pronti`,
    title: (appName) => `Benvenuto su ${appName}`,
    subtitle:
      'Il tuo workspace video ospitato e i crediti del tuo account sono pronti',
    greeting: (firstName) => `Ciao ${firstName},`,
    intro: (initialCreditsAmount) =>
      `Grazie per esserti registrato. Il saldo del tuo account include gia ${initialCreditsAmount} crediti, cosi puoi iniziare subito dal workflow piu adatto al tuo primo obiettivo.`,
    credits: (initialCreditsAmount) =>
      `${initialCreditsAmount} crediti sono gia disponibili. Scegli il punto di partenza piu chiaro per ottenere la tua prima generazione riuscita.`,
    workflowTitle: 'Scegli il tuo primo workflow',
    workflowIntro:
      `Seleziona l'ingresso che meglio si adatta ai tuoi asset e al tuo obiettivo.`,
    recommendedBadge: 'Consigliato per te',
    workflowCopy: {
      'text-to-video': {
        description:
          'Parti solo da un prompt se vuoi esplorare idee rapidamente senza preparare asset in anticipo.',
        cta: 'Apri text-to-video',
      },
      'image-to-video': {
        description:
          `Parti da un'immagine fissa se hai gia un key frame, uno scatto prodotto o un riferimento visivo da animare.`,
        cta: 'Apri image-to-video',
      },
      'reference-to-video': {
        description:
          'Parti con riferimenti se ti serve piu controllo su movimento, look e direzione.',
        cta: 'Apri reference-to-video',
      },
    },
    keepMovingTitle: 'Continua subito dopo la prima generazione',
    workspaceNote:
      'Run di mogged, strumenti browser e cronologia task restano nello stesso flusso.',
    pricingTitle: 'Controlla piani e crediti',
    pricingDescription:
      'Verifica crediti, prezzi e limiti di durata prima di scalare.',
    activityTitle: 'Segui i tuoi run',
    activityDescription:
      'Controlla cronologia, avanzamento e output senza cercare tra vecchie schede.',
    help: (supportEmail) =>
      `Domande? Rispondi a questa email o contatta ${supportEmail}.`,
    footer: (appName, domain) =>
      `Questa email di benvenuto e stata inviata perche hai creato un account ${appName} su ${domain}.`,
  },
  ko: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `${appName}에 오신 것을 환영합니다, ${firstName}님. 계정 크레딧이 준비되었습니다`,
    title: (appName) => `${appName}에 오신 것을 환영합니다`,
    subtitle:
      '호스팅형 비디오 워크스페이스와 계정 크레딧이 준비되었습니다',
    greeting: (firstName) => `${firstName}님, 안녕하세요.`,
    intro: (initialCreditsAmount) =>
      `가입해 주셔서 감사합니다. 계정 잔액에 이미 ${initialCreditsAmount}개 크레딧이 들어 있으니, 첫 목표에 가장 잘 맞는 workflow부터 바로 시작할 수 있습니다.`,
    credits: (initialCreditsAmount) =>
      `지금 바로 크레딧 ${initialCreditsAmount}개를 사용할 수 있습니다. 첫 성공으로 이어질 workflow를 골라 시작해 보세요.`,
    workflowTitle: '첫 workflow를 선택하세요',
    workflowIntro: '지금 가진 소재와 목표에 맞는 시작점을 고르세요.',
    recommendedBadge: '추천',
    workflowCopy: {
      'text-to-video': {
        description:
          '소재 준비 없이 프롬프트만으로 빠르게 아이디어를 시험해 보고 싶다면 여기서 시작하세요.',
        cta: 'text-to-video 열기',
      },
      'image-to-video': {
        description:
          '이미 키 프레임, 제품 이미지, 시각 레퍼런스가 있고 그것을 움직이고 싶다면 여기서 시작하세요.',
        cta: 'image-to-video 열기',
      },
      'reference-to-video': {
        description:
          '움직임, 룩, 여러 입력의 방향을 더 강하게 통제하고 싶다면 여기서 시작하세요.',
        cta: 'reference-to-video 열기',
      },
    },
    keepMovingTitle: '첫 생성 이후에도 바로 이어가세요',
    workspaceNote:
      'mogged 생성, 브라우저 도구, 작업 기록이 하나의 흐름 안에 있습니다.',
    pricingTitle: '요금제와 크레딧 보기',
    pricingDescription:
      '확장하기 전에 크레딧, 가격, 실행 시간 제한을 확인하세요.',
    activityTitle: '실행 기록 보기',
    activityDescription:
      '오래된 탭을 뒤지지 않아도 작업 기록, 진행 상태, 결과를 확인할 수 있습니다.',
    help: (supportEmail) =>
      `궁금한 점이 있으면 이 메일에 답장하거나 ${supportEmail}로 연락해 주세요.`,
    footer: (appName, domain) =>
      `이 환영 메일은 ${domain}에서 ${appName} 계정을 생성했기 때문에 발송되었습니다.`,
  },
  ar: {
    subject: (appName, firstName, initialCreditsAmount) =>
      `مرحباً بك في ${appName}، ${firstName} - رصيد حسابك جاهز`,
    title: (appName) => `مرحباً بك في ${appName}`,
    subtitle: 'مساحة العمل المستضافة للفيديو ورصيد حسابك جاهزان',
    greeting: (firstName) => `مرحباً ${firstName}،`,
    intro: (initialCreditsAmount) =>
      `شكراً على التسجيل. يحتوي حسابك بالفعل على ${initialCreditsAmount} رصيداً في حسابك، لذلك يمكنك البدء فوراً من workflow الأنسب لهدفك الأول.`,
    credits: (initialCreditsAmount) =>
      `${initialCreditsAmount} رصيداً جاهز الآن. اختر نقطة البداية الأوضح لأول نتيجة ناجحة لك.`,
    workflowTitle: 'اختر أول workflow لك',
    workflowIntro: 'اختر المدخل الأنسب لما لديك من مواد وما تريد تحقيقه.',
    recommendedBadge: 'موصى به لك',
    workflowCopy: {
      'text-to-video': {
        description:
          'ابدأ من prompt فقط إذا كنت تريد تجربة الأفكار بسرعة من دون تجهيز مواد مسبقاً.',
        cta: 'افتح text-to-video',
      },
      'image-to-video': {
        description:
          'ابدأ من صورة ثابتة إذا كان لديك إطار رئيسي أو صورة منتج أو مرجع بصري تريد تحريكه.',
        cta: 'افتح image-to-video',
      },
      'reference-to-video': {
        description:
          'ابدأ من مراجع متعددة إذا كنت تحتاج إلى تحكم أدق في الحركة والمظهر والاتجاه.',
        cta: 'افتح reference-to-video',
      },
    },
    keepMovingTitle: 'واصل بعد أول تشغيل',
    workspaceNote:
      'عمليات mogged وأدوات المتصفح وسجل المهام كلها ضمن نفس التدفق.',
    pricingTitle: 'راجع الخطط والأرصدة',
    pricingDescription:
      'تحقق من الأرصدة والأسعار وحدود مدة التشغيل قبل التوسع.',
    activityTitle: 'تابع عملياتك',
    activityDescription:
      'راجع السجل والتقدم والمخرجات من دون البحث في علامات تبويب قديمة.',
    help: (supportEmail) =>
      `هل لديك سؤال؟ يمكنك الرد على هذا البريد أو التواصل مع ${supportEmail}.`,
    footer: (appName, domain) =>
      `تم إرسال رسالة الترحيب هذه لأنك أنشأت حساب ${appName} على ${domain}.`,
  },
};

function getFirstName(name: string) {
  return name?.split(/[\s@]/)[0] || 'there';
}

function resolveInitialCreditsAmount(options?: WelcomeEmailOptions) {
  return options?.initialCreditsAmount ?? getInitialCreditsAmount();
}

function getWelcomeCopy(locale?: string | null): WelcomeEmailCopy {
  const resolvedLocale = resolveAppLocale(locale);

  return {
    locale: resolvedLocale,
    localeTag: getLocaleBcp47(resolvedLocale),
    dir: getLocaleDirection(resolvedLocale),
    ...WELCOME_COPY[resolvedLocale],
  };
}

function resolveRecommendedWorkflow(options?: WelcomeEmailOptions) {
  return parseVideoGeneratorMode(
    options?.recommendedWorkflow,
    DEFAULT_VIDEO_GENERATOR_MODE
  );
}

function getAbsoluteLocalizedUrl(path: string, locale?: string | null) {
  const resolvedLocale = resolveAppLocale(locale);
  return `${getAppUrl()}${getLocalizedPath(path, resolvedLocale)}`;
}

function getWorkflowOrder(recommendedWorkflow: VideoGeneratorMode) {
  return [
    recommendedWorkflow,
    ...VIDEO_GENERATOR_MODES.filter((mode) => mode !== recommendedWorkflow),
  ];
}

function getTextRecommendationLine(
  locale: AppLocale,
  badge: string,
  workflow: VideoGeneratorMode
) {
  const separator = ['zh', 'ja', 'ko', 'ar'].includes(locale) ? '：' : ': ';
  return `${badge}${separator}${workflow}`;
}

function getWorkflowCards(
  locale: string | null | undefined,
  recommendedWorkflow: VideoGeneratorMode
) {
  const copy = getWelcomeCopy(locale);

  return getWorkflowOrder(recommendedWorkflow).map((mode) => ({
    ...copy.workflowCopy[mode],
    mode,
    isRecommended: mode === recommendedWorkflow,
    url: getAbsoluteLocalizedUrl(
      getAiVideoGeneratorModeStateHref({
        locale: copy.locale,
        mode,
      }),
      locale
    ),
  }));
}

function getSupportLinks(locale?: string | null) {
  const copy = getWelcomeCopy(locale);

  return [
    {
      title: copy.pricingTitle,
      description: copy.pricingDescription,
      url: getAbsoluteLocalizedUrl('/pricing', locale),
    },
    {
      title: copy.activityTitle,
      description: copy.activityDescription,
      url: getAbsoluteLocalizedUrl('/activity/ai-tasks', locale),
    },
  ];
}

export function getWelcomeEmailSubject(
  name: string,
  options?: WelcomeEmailOptions
): string {
  const firstName = getFirstName(name);
  const initialCreditsAmount = resolveInitialCreditsAmount(options);
  const copy = getWelcomeCopy(options?.locale);

  return copy.subject(getAppName(), firstName, initialCreditsAmount);
}

export function getWelcomeEmailHtml(
  name: string,
  options?: WelcomeEmailOptions
): string {
  const firstName = getFirstName(name);
  const appName = getAppName();
  const siteUrl = getAppUrl();
  const supportEmail = getSupportEmail();
  const initialCreditsAmount = resolveInitialCreditsAmount(options);
  const recommendedWorkflow = resolveRecommendedWorkflow(options);
  const copy = getWelcomeCopy(options?.locale);
  const workflowRows = getWorkflowCards(options?.locale, recommendedWorkflow)
    .map(
      (item) => `<tr><td style="padding:0 0 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${item.isRecommended ? '#2563eb' : '#e5e7eb'};border-radius:10px;background-color:${item.isRecommended ? '#eff6ff' : '#ffffff'};">
<tr><td style="padding:18px 18px 16px;">
${item.isRecommended ? `<span style="display:inline-block;margin:0 0 10px;padding:4px 10px;border-radius:999px;background-color:#dbeafe;color:#1d4ed8;font-family:${FONT};font-size:12px;font-weight:700;line-height:1.4;">${copy.recommendedBadge}</span>` : ''}
<p style="margin:0 0 8px;font-family:${FONT};font-size:17px;font-weight:700;color:#111827;line-height:1.4;">${item.mode}</p>
<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;color:#4b5563;line-height:1.7;">${item.description}</p>
<a href="${item.url}" target="_blank" style="display:inline-block;padding:11px 18px;border-radius:8px;background-color:${item.isRecommended ? '#111827' : '#2563eb'};font-family:${FONT};font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">${item.cta}</a>
</td></tr>
</table>
</td></tr>`
    )
    .join('\n');
  const supportRows = getSupportLinks(options?.locale)
    .map(
      (item) => `<tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
<a href="${item.url}" target="_blank" style="font-family:${FONT};font-size:14px;color:#111827;font-weight:600;text-decoration:none;">${item.title}</a>
<br><span style="font-family:${FONT};font-size:13px;color:#6b7280;line-height:1.6;">${item.description}</span>
</td></tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${copy.localeTag}" dir="${copy.dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5f7fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.subtitle}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fb;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:14px;border:1px solid #e5e7eb;">
<tr><td style="padding:36px 32px;">

<p style="margin:0 0 6px;font-family:${FONT};font-size:26px;font-weight:700;color:#111827;line-height:1.25;">
${copy.title(appName)}
</p>
<p style="margin:0 0 24px;font-family:${FONT};font-size:13px;color:#6b7280;line-height:1.5;">
${copy.subtitle}
</p>

<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;color:#111827;line-height:1.7;">
${copy.greeting(firstName)}
</p>

<p style="margin:0 0 20px;font-family:${FONT};font-size:15px;color:#374151;line-height:1.75;">
${copy.intro(initialCreditsAmount)}
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #bfdbfe;border-radius:10px;background-color:#eff6ff;">
<tr><td style="padding:16px 18px;font-family:${FONT};font-size:14px;color:#1d4ed8;line-height:1.65;">
${copy.credits(initialCreditsAmount)}
</td></tr>
</table>

<p style="margin:0 0 8px;font-family:${FONT};font-size:18px;font-weight:700;color:#111827;line-height:1.5;">
${copy.workflowTitle}
</p>
<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;color:#6b7280;line-height:1.65;">
${copy.workflowIntro}
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
${workflowRows}
</table>

<p style="margin:0 0 8px;font-family:${FONT};font-size:17px;font-weight:700;color:#111827;line-height:1.5;">
${copy.keepMovingTitle}
</p>
<p style="margin:0 0 14px;font-family:${FONT};font-size:14px;color:#4b5563;line-height:1.7;">
${copy.workspaceNote}
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
${supportRows}
</table>

<p style="margin:0 0 14px;font-family:${FONT};font-size:14px;color:#4b5563;line-height:1.7;">
${copy.help(`<a href="mailto:${supportEmail}" style="color:#111827;text-decoration:none;">${supportEmail}</a>`)}
</p>

<p style="margin:0;font-family:${FONT};font-size:12px;color:#9ca3af;line-height:1.6;">
${copy.footer(appName, siteUrl.replace(/^https?:\/\//, ''))}
</p>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function getWelcomeEmailText(
  name: string,
  options?: WelcomeEmailOptions
): string {
  const firstName = getFirstName(name);
  const appName = getAppName();
  const siteUrl = getAppUrl();
  const supportEmail = getSupportEmail();
  const initialCreditsAmount = resolveInitialCreditsAmount(options);
  const recommendedWorkflow = resolveRecommendedWorkflow(options);
  const copy = getWelcomeCopy(options?.locale);
  const workflowLines = getWorkflowCards(options?.locale, recommendedWorkflow)
    .map((item) => `- ${item.mode}\n  ${item.url}\n  ${item.description}`)
    .join('\n\n');
  const supportLines = getSupportLinks(options?.locale)
    .map((item) => `- ${item.title}\n  ${item.url}\n  ${item.description}`)
    .join('\n\n');

  return `${copy.title(appName)}

${copy.greeting(firstName)}

${copy.intro(initialCreditsAmount)}

${copy.credits(initialCreditsAmount)}

${copy.workflowTitle}
${getTextRecommendationLine(copy.locale, copy.recommendedBadge, recommendedWorkflow)}

${workflowLines}

${copy.keepMovingTitle}
${copy.workspaceNote}

${supportLines}

${copy.help(supportEmail)}

---
${copy.footer(appName, siteUrl.replace(/^https?:\/\//, ''))}`;
}
