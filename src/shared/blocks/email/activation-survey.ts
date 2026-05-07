import {
  getLocaleBcp47,
  getLocaleDirection,
  resolveAppLocale,
  type AppLocale,
} from '@/config/locale';
import { getLocalizedPath } from '@/core/i18n/localized-path';
import {
  getAppName,
  getAppUrl,
  getSupportEmail,
} from '@/shared/lib/brand';
import { AI_VIDEO_GENERATOR_ROOT_PATH } from '@/config/website/public-page-metadata';

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;

export const DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS = 100;

export type ActivationSurveyEmailOptions = {
  locale?: string | null;
  rewardCredits?: number;
};

type SurveyQuestion = {
  prompt: string;
  options: string[];
};

type ActivationSurveyEmailCopy = {
  locale: AppLocale;
  localeTag: string;
  dir: 'ltr' | 'rtl';
  subject: (appName: string, firstName: string) => string;
  preview: (rewardCredits: number) => string;
  title: string;
  greeting: (firstName: string) => string;
  intro: string;
  ask: string;
  replyHint: string;
  questionIntro: string;
  questions: SurveyQuestion[];
  rewardLine: (rewardCredits: number) => string;
  replyButton: (rewardCredits: number) => string;
  replyButtonHint: string;
  workspaceTitle: string;
  workspaceDescription: string;
  workspaceCta: string;
  closing: string;
  signoff: (appName: string) => string;
  footer: (appName: string, domain: string) => string;
  replySubject: (appName: string) => string;
  replyDraftIntro: (firstName: string) => string;
  optionsLabel: string;
  answerLabel: string;
};

const ACTIVATION_SURVEY_COPY: Record<
  AppLocale,
  Omit<ActivationSurveyEmailCopy, 'locale' | 'localeTag' | 'dir'>
> = {
  en: {
    subject: (_appName, firstName) =>
      `Quick question, ${firstName} - what are you trying to make?`,
    preview: (rewardCredits) =>
      `Reply with a few quick answers and we will add ${rewardCredits} credits to your account.`,
    title: 'What are you actually trying to make?',
    greeting: (firstName) => `Hi ${firstName},`,
    intro:
      'You signed up for mogged, but it looks like you have not had a first win yet. Totally normal.',
    ask:
      `Instead of sending another generic "here is how to use the product" email, we figured we should ask something more useful first.`,
    replyHint:
      'Reply with anything short, messy, or half-formed. A few words is plenty.',
    questionIntro: 'These four are the big ones:',
    questions: [
      {
        prompt: 'What do you want to create?',
        options: [
          'AI influencer content',
          'Motion control videos',
          'Product ads and commercials',
          'Social media content',
          'Artistic or creative videos',
          'Memes and fun content',
          'Other',
        ],
      },
      {
        prompt: 'How experienced are you with AI tools?',
        options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      },
      {
        prompt: 'What is your primary use case?',
        options: [
          'Personal or hobby',
          'Content creator or influencer',
          'Small business or freelancer',
          'Agency or studio',
          'Enterprise or corporate',
          'Student or education',
        ],
      },
      {
        prompt: 'What matters most right now?',
        options: [
          'Video quality',
          'Fast generation speed',
          'Easy to use',
          'Affordable pricing',
          'Creative control',
          'Unique AI models',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `Reply with a few quick answers and we will add ${rewardCredits} credits to your account as a thank-you.`,
    replyButton: (rewardCredits) => `Reply and get ${rewardCredits} credits`,
    replyButtonHint:
      'Replying normally works too, if the button feels a little dramatic.',
    workspaceTitle: 'Would rather just jump back in?',
    workspaceDescription:
      'That works too. Your workspace is still waiting for you.',
    workspaceCta: 'Open the workspace',
    closing: 'Messy answers count. We are not grading homework.',
    signoff: (appName) => `- The ${appName} team`,
    footer: (appName, domain) =>
      `This email was sent because you created a ${appName} account at ${domain}.`,
    replySubject: (appName) => `Quick answers for ${appName}`,
    replyDraftIntro: (firstName) =>
      `Hi ${firstName} - here are my quick answers:`,
    optionsLabel: 'Options',
    answerLabel: 'My answer:',
  },
  zh: {
    subject: (_appName, firstName) =>
      `${firstName}，先别让我们瞎猜：你最想做什么视频？`,
    preview: (rewardCredits) =>
      `回几句就行，我们会送你 ${rewardCredits} 积分表示感谢。`,
    title: '我们先别瞎猜你要做什么',
    greeting: (firstName) => `${firstName}，你好：`,
    intro:
      '你注册了 mogged，不过看起来还没拿到第一次成功生成。这很正常，不用有压力。',
    ask:
      '比起再发一封泛泛的使用说明，我们更想先搞清楚一件事：你到底想做什么视频？',
    replyHint:
      '直接回复这封邮件就行，随便写几个关键词也可以，不用写作文。',
    questionIntro: '下面这 4 个问题，对我们最有帮助：',
    questions: [
      {
        prompt: '你最想做什么内容？',
        options: [
          'AI 网红内容',
          '运镜控制视频',
          '产品广告 / 商业片',
          '社媒短内容',
          '艺术 / 创意视频',
          '梗图 / 搞笑内容',
          '其他',
        ],
      },
      {
        prompt: '你现在对 AI 工具熟悉到什么程度？',
        options: ['新手', '有一些经验', '比较熟', '专业用户'],
      },
      {
        prompt: '你的主要使用场景是什么？',
        options: [
          '个人 / 兴趣',
          '内容创作者 / 博主',
          '小团队 / 自由职业',
          'Agency / 工作室',
          '企业 / 公司',
          '学生 / 教育',
        ],
      },
      {
        prompt: '你现在最看重什么？',
        options: [
          '视频质量',
          '生成速度',
          '容易上手',
          '价格友好',
          '创作控制力',
          '模型独特性',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `回我们几句，我们会送你 ${rewardCredits} 积分表示感谢。`,
    replyButton: (rewardCredits) => `回信领 ${rewardCredits} 积分`,
    replyButtonHint: '当然，直接回复这封邮件也行，不用被按钮拿捏。',
    workspaceTitle: '如果你想先回去再试一把',
    workspaceDescription: '也完全可以，工作台还在等你。',
    workspaceCta: '打开工作台',
    closing: '答案写得乱一点完全没关系，我们不是来批作业的。',
    signoff: (appName) => `- ${appName} 团队`,
    footer: (appName, domain) =>
      `这封邮件发给你，是因为你在 ${domain} 创建了 ${appName} 账户。`,
    replySubject: (appName) => `${appName} 快速反馈`,
    replyDraftIntro: (firstName) => `${firstName} 在这里，简单回答一下：`,
    optionsLabel: '可参考',
    answerLabel: '我的回答：',
  },
  de: {
    subject: (_appName, firstName) =>
      `Kurze Frage, ${firstName} - was willst du eigentlich machen?`,
    preview: (rewardCredits) =>
      `Antworte kurz und wir legen dir ${rewardCredits} Credits aufs Konto.`,
    title: 'Bevor wir weiter raten',
    greeting: (firstName) => `Hallo ${firstName},`,
    intro:
      'Du hast dich bei mogged angemeldet, aber dein erster Erfolg ist wohl noch nicht da. Ganz normal.',
    ask:
      'Statt noch eine generische Produktmail zu schicken, fragen wir lieber direkt: Was willst du eigentlich erstellen?',
    replyHint:
      'Kurze, chaotische oder halbfertige Antworten sind voellig okay. Ein paar Worte reichen.',
    questionIntro: 'Diese vier helfen uns am meisten:',
    questions: [
      {
        prompt: 'Was willst du erstellen?',
        options: [
          'KI-Influencer-Content',
          'Motion-Control-Videos',
          'Produktwerbung und Commercials',
          'Social-Media-Content',
          'Kreative oder kuenstlerische Videos',
          'Memes und Fun-Content',
          'Etwas anderes',
        ],
      },
      {
        prompt: 'Wie erfahren bist du mit KI-Tools?',
        options: ['Anfaenger', 'Fortgeschritten', 'Sehr erfahren', 'Profi'],
      },
      {
        prompt: 'Was ist dein Haupt-Use-Case?',
        options: [
          'Privat oder Hobby',
          'Creator oder Influencer',
          'Kleines Business oder Freelancer',
          'Agentur oder Studio',
          'Unternehmen',
          'Student oder Ausbildung',
        ],
      },
      {
        prompt: 'Was ist dir gerade am wichtigsten?',
        options: [
          'Videoqualitaet',
          'Schnelle Generierung',
          'Einfach zu bedienen',
          'Faire Preise',
          'Kreative Kontrolle',
          'Besondere KI-Modelle',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `Wenn du kurz antwortest, legen wir dir ${rewardCredits} Credits als Danke aufs Konto.`,
    replyButton: (rewardCredits) =>
      `Antworten und ${rewardCredits} Credits bekommen`,
    replyButtonHint:
      'Normales Antworten funktioniert auch, falls der Button etwas zu theatralisch wirkt.',
    workspaceTitle: 'Lieber direkt nochmal ausprobieren?',
    workspaceDescription:
      'Geht auch. Dein Workspace wartet noch auf dich.',
    workspaceCta: 'Workspace oeffnen',
    closing: 'Unordentliche Antworten zaehlen auch. Niemand benotet hier Hausaufgaben.',
    signoff: (appName) => `- Das ${appName}-Team`,
    footer: (appName, domain) =>
      `Diese E-Mail wurde gesendet, weil du bei ${domain} ein ${appName}-Konto erstellt hast.`,
    replySubject: (appName) => `Kurze Antworten fuer ${appName}`,
    replyDraftIntro: (firstName) =>
      `Hallo ${firstName} - hier sind meine kurzen Antworten:`,
    optionsLabel: 'Optionen',
    answerLabel: 'Meine Antwort:',
  },
  fr: {
    subject: (_appName, firstName) =>
      `Petite question, ${firstName} - vous essayez de creer quoi exactement ?`,
    preview: (rewardCredits) =>
      `Repondez vite fait et on ajoute ${rewardCredits} credits a votre compte.`,
    title: 'Avant de continuer a deviner',
    greeting: (firstName) => `Bonjour ${firstName},`,
    intro:
      `Vous vous etes inscrit sur mogged, mais votre premiere vraie victoire n'est visiblement pas encore tombee. Rien d'anormal.`,
    ask:
      `Au lieu d'envoyer encore un e-mail generique "voici comment utiliser le produit", on prefere vous poser une vraie question utile.`,
    replyHint:
      `Une reponse courte, brouillonne ou incomplete nous va tres bien. Quelques mots suffisent.`,
    questionIntro: 'Ces quatre points nous aideront le plus :',
    questions: [
      {
        prompt: 'Qu essayez-vous de creer ?',
        options: [
          'Contenu influenceur IA',
          'Videos a controle de mouvement',
          'Publicites produit et commercials',
          'Contenu reseaux sociaux',
          'Videos artistiques ou creatives',
          'Memes et contenu fun',
          'Autre',
        ],
      },
      {
        prompt: 'Quel est votre niveau avec les outils IA ?',
        options: ['Debutant', 'Intermediaire', 'Avance', 'Expert'],
      },
      {
        prompt: 'Quel est votre cas d usage principal ?',
        options: [
          'Personnel ou loisir',
          'Createur ou influenceur',
          'Petite entreprise ou freelance',
          'Agence ou studio',
          'Entreprise',
          'Etudiant ou education',
        ],
      },
      {
        prompt: 'Qu est-ce qui compte le plus pour vous maintenant ?',
        options: [
          'Qualite video',
          'Vitesse de generation',
          'Facilite d usage',
          'Prix abordable',
          'Controle creatif',
          'Modeles IA differents',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `Repondez avec quelques infos et on ajoutera ${rewardCredits} credits a votre compte pour vous remercier.`,
    replyButton: (rewardCredits) =>
      `Repondre et recevoir ${rewardCredits} credits`,
    replyButtonHint:
      `Repondre normalement a cet e-mail marche aussi, si le bouton vous semble un peu dramatique.`,
    workspaceTitle: 'Vous preferez juste retenter ?',
    workspaceDescription:
      'Pas de souci. Votre espace de travail vous attend toujours.',
    workspaceCta: 'Ouvrir l espace de travail',
    closing: `Les reponses en vrac comptent aussi. On ne corrige pas des devoirs ici.`,
    signoff: (appName) => `- L equipe ${appName}`,
    footer: (appName, domain) =>
      `Cet e-mail vous a ete envoye parce que vous avez cree un compte ${appName} sur ${domain}.`,
    replySubject: (appName) => `Reponses rapides pour ${appName}`,
    replyDraftIntro: (firstName) =>
      `Bonjour ${firstName} - voici mes reponses rapides :`,
    optionsLabel: 'Options',
    answerLabel: 'Ma reponse :',
  },
  es: {
    subject: (_appName, firstName) =>
      `Pregunta rapida, ${firstName} - que intentas crear exactamente?`,
    preview: (rewardCredits) =>
      `Responde rapido y te sumamos ${rewardCredits} creditos a la cuenta.`,
    title: 'Antes de seguir adivinando',
    greeting: (firstName) => `Hola ${firstName},`,
    intro:
      'Te registraste en mogged, pero parece que todavia no has tenido tu primera buena generacion. Totalmente normal.',
    ask:
      'En lugar de mandarte otro correo generico de producto, preferimos hacerte una pregunta mas util primero.',
    replyHint:
      'Nos sirve una respuesta corta, desordenada o a medio pensar. Unas pocas palabras bastan.',
    questionIntro: 'Estas cuatro nos ayudan mas que cualquier otra cosa:',
    questions: [
      {
        prompt: 'Que quieres crear?',
        options: [
          'Contenido de influencer IA',
          'Videos con control de movimiento',
          'Anuncios y comerciales de producto',
          'Contenido para redes sociales',
          'Videos artisticos o creativos',
          'Memes y contenido divertido',
          'Otra cosa',
        ],
      },
      {
        prompt: 'Que tanta experiencia tienes con herramientas de IA?',
        options: ['Principiante', 'Intermedio', 'Avanzado', 'Experto'],
      },
      {
        prompt: 'Cual es tu caso de uso principal?',
        options: [
          'Personal o hobby',
          'Creador o influencer',
          'Pequeno negocio o freelance',
          'Agencia o estudio',
          'Empresa',
          'Estudiante o educacion',
        ],
      },
      {
        prompt: 'Que te importa mas ahora mismo?',
        options: [
          'Calidad de video',
          'Velocidad de generacion',
          'Facilidad de uso',
          'Precio accesible',
          'Control creativo',
          'Modelos de IA distintos',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `Si nos respondes rapido, te sumamos ${rewardCredits} creditos como agradecimiento.`,
    replyButton: (rewardCredits) =>
      `Responder y recibir ${rewardCredits} creditos`,
    replyButtonHint:
      'Responder normalmente a este correo tambien vale, por si el boton se siente muy intenso.',
    workspaceTitle: 'Si prefieres volver a probar ya mismo',
    workspaceDescription:
      'Tambien perfecto. Tu espacio de trabajo sigue ahi.',
    workspaceCta: 'Abrir el espacio de trabajo',
    closing: 'Las respuestas medio caoticas tambien cuentan. No estamos corrigiendo tareas.',
    signoff: (appName) => `- El equipo de ${appName}`,
    footer: (appName, domain) =>
      `Este correo se envio porque creaste una cuenta de ${appName} en ${domain}.`,
    replySubject: (appName) => `Respuestas rapidas para ${appName}`,
    replyDraftIntro: (firstName) =>
      `Hola ${firstName}: aqui van mis respuestas rapidas:`,
    optionsLabel: 'Opciones',
    answerLabel: 'Mi respuesta:',
  },
  ja: {
    subject: (_appName, firstName) =>
      `${firstName}さん、ひとつだけ聞かせてください。何を作りたいですか？`,
    preview: (rewardCredits) =>
      `気軽に返信していただければ、お礼に ${rewardCredits} クレジットを追加します。`,
    title: 'こちらで勝手に想像する前に',
    greeting: (firstName) => `${firstName}さん、こんにちは。`,
    intro:
      'mogged に登録していただきましたが、まだ最初のうまくいった生成には届いていないようでした。これは全然普通です。',
    ask:
      'なので、また普通の使い方メールを送るより、先に本当に作りたいものを聞いたほうがいいと思いました。',
    replyHint:
      '短くても、まとまっていなくても大丈夫です。キーワードだけでも十分です。',
    questionIntro: '特に知りたいのはこの 4 つです。',
    questions: [
      {
        prompt: '何を作りたいですか？',
        options: [
          'AI インフルエンサー系コンテンツ',
          'モーションコントロール動画',
          '商品広告 / CM',
          'SNS 向けコンテンツ',
          'アート / クリエイティブ動画',
          'ミーム / おもしろ系',
          'その他',
        ],
      },
      {
        prompt: 'AI ツールの経験はどのくらいありますか？',
        options: ['初心者', '中級', '上級', '専門レベル'],
      },
      {
        prompt: '主な用途は何ですか？',
        options: [
          '個人 / 趣味',
          'クリエイター / インフルエンサー',
          '小規模ビジネス / フリーランス',
          '代理店 / スタジオ',
          '企業',
          '学生 / 教育',
        ],
      },
      {
        prompt: '今いちばん大事なのは何ですか？',
        options: [
          '動画の品質',
          '生成スピード',
          '使いやすさ',
          '価格',
          '表現のコントロール',
          'モデルの個性',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `気軽に返信していただければ、お礼に ${rewardCredits} クレジットを追加します。`,
    replyButton: (rewardCredits) =>
      `返信して ${rewardCredits} クレジットを受け取る`,
    replyButtonHint:
      'もちろん普通にこのメールへ返信しても大丈夫です。ボタンはちょっと張り切っているだけです。',
    workspaceTitle: '先にもう一度試したい場合は',
    workspaceDescription:
      'それでも大丈夫です。ワークスペースはそのまま残っています。',
    workspaceCta: 'ワークスペースを開く',
    closing: 'まとまっていない回答でも大歓迎です。宿題の採点はしません。',
    signoff: (appName) => `- ${appName} チーム`,
    footer: (appName, domain) =>
      `${domain} で ${appName} のアカウントが作成されたため、このメールをお送りしています。`,
    replySubject: (appName) => `${appName} へのかんたんな回答`,
    replyDraftIntro: (firstName) =>
      `${firstName}です。かんたんに回答します。`,
    optionsLabel: '候補',
    answerLabel: '回答：',
  },
  it: {
    subject: (_appName, firstName) =>
      `Domanda veloce, ${firstName} - cosa stai cercando di creare?`,
    preview: (rewardCredits) =>
      `Rispondi al volo e ti aggiungiamo ${rewardCredits} crediti.`,
    title: 'Prima di continuare a indovinare',
    greeting: (firstName) => `Ciao ${firstName},`,
    intro:
      'Ti sei registrato su mogged, ma sembra che il primo risultato davvero riuscito non sia ancora arrivato. Succede spesso.',
    ask:
      'Invece di mandarti l ennesima mail generica sul prodotto, preferiamo chiederti una cosa piu utile.',
    replyHint:
      'Puoi rispondere in modo breve, disordinato o incompleto. Bastano poche parole.',
    questionIntro: 'Queste quattro ci aiutano tantissimo:',
    questions: [
      {
        prompt: 'Che cosa vuoi creare?',
        options: [
          'Contenuti da AI influencer',
          'Video con controllo del movimento',
          'Ads e commercial di prodotto',
          'Contenuti social',
          'Video artistici o creativi',
          'Meme e contenuti divertenti',
          'Altro',
        ],
      },
      {
        prompt: 'Quanto sei esperto con gli strumenti AI?',
        options: ['Principiante', 'Intermedio', 'Avanzato', 'Esperto'],
      },
      {
        prompt: 'Qual e il tuo caso d uso principale?',
        options: [
          'Personale o hobby',
          'Creator o influencer',
          'Piccola attivita o freelance',
          'Agenzia o studio',
          'Azienda',
          'Studente o formazione',
        ],
      },
      {
        prompt: 'Che cosa conta di piu in questo momento?',
        options: [
          'Qualita video',
          'Velocita di generazione',
          'Facilita d uso',
          'Prezzo accessibile',
          'Controllo creativo',
          'Modelli AI particolari',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `Se ci rispondi con due righe, ti aggiungiamo ${rewardCredits} crediti come grazie.`,
    replyButton: (rewardCredits) =>
      `Rispondi e ricevi ${rewardCredits} crediti`,
    replyButtonHint:
      'Va benissimo anche rispondere normalmente a questa email, se il pulsante ti sembra troppo teatrale.',
    workspaceTitle: 'Preferisci semplicemente riprovare?',
    workspaceDescription:
      'Va benissimo anche quello. Il tuo workspace e ancora li.',
    workspaceCta: 'Apri il workspace',
    closing: 'Anche le risposte un po caotiche valgono. Non stiamo correggendo compiti.',
    signoff: (appName) => `- Il team di ${appName}`,
    footer: (appName, domain) =>
      `Questa email e stata inviata perche hai creato un account ${appName} su ${domain}.`,
    replySubject: (appName) => `Risposte veloci per ${appName}`,
    replyDraftIntro: (firstName) =>
      `Ciao ${firstName}, ecco le mie risposte veloci:`,
    optionsLabel: 'Opzioni',
    answerLabel: 'La mia risposta:',
  },
  ko: {
    subject: (_appName, firstName) =>
      `${firstName}님, 하나만 여쭤봐도 될까요? 뭘 만들고 싶으세요?`,
    preview: (rewardCredits) =>
      `가볍게 답장해 주시면 감사 의미로 ${rewardCredits} 크레딧을 드릴게요.`,
    title: '저희가 혼자 추측하기 전에',
    greeting: (firstName) => `${firstName}님, 안녕하세요.`,
    intro:
      'mogged에 가입해 주셨는데, 아직 첫 성공 생성까지는 가지 않은 것 같았어요. 아주 자연스러운 일입니다.',
    ask:
      '그래서 또 하나의 뻔한 사용 가이드를 보내기보다, 먼저 정말 만들고 싶은 게 뭔지 여쭤보려 합니다.',
    replyHint:
      '짧아도 좋고, 정리가 안 되어 있어도 괜찮아요. 키워드 몇 개만 보내주셔도 됩니다.',
    questionIntro: '특히 이 네 가지가 가장 궁금합니다.',
    questions: [
      {
        prompt: '무엇을 만들고 싶으신가요?',
        options: [
          'AI 인플루언서 콘텐츠',
          '모션 컨트롤 영상',
          '제품 광고 / 커머셜',
          '소셜 미디어 콘텐츠',
          '아트 / 크리에이티브 영상',
          '밈 / 재미용 콘텐츠',
          '기타',
        ],
      },
      {
        prompt: 'AI 도구 경험은 어느 정도인가요?',
        options: ['입문', '중간', '고급', '전문가'],
      },
      {
        prompt: '주 사용 목적은 무엇인가요?',
        options: [
          '개인 / 취미',
          '크리에이터 / 인플루언서',
          '소규모 비즈니스 / 프리랜서',
          '에이전시 / 스튜디오',
          '기업',
          '학생 / 교육',
        ],
      },
      {
        prompt: '지금 가장 중요한 것은 무엇인가요?',
        options: [
          '영상 품질',
          '생성 속도',
          '쉬운 사용성',
          '합리적인 가격',
          '창작 제어력',
          '독특한 AI 모델',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `짧게라도 답장 주시면 감사 의미로 ${rewardCredits} 크레딧을 드릴게요.`,
    replyButton: (rewardCredits) =>
      `답장하고 ${rewardCredits} 크레딧 받기`,
    replyButtonHint:
      '물론 그냥 이 메일에 바로 답장하셔도 됩니다. 버튼이 조금 오버한 것뿐이에요.',
    workspaceTitle: '먼저 다시 한번 써보고 싶다면',
    workspaceDescription:
      '그것도 좋습니다. 작업 공간은 그대로 열려 있어요.',
    workspaceCta: '작업 공간 열기',
    closing: '조금 뒤죽박죽인 답변도 괜찮아요. 숙제 검사하는 건 아닙니다.',
    signoff: (appName) => `- ${appName} 팀`,
    footer: (appName, domain) =>
      `${domain}에서 ${appName} 계정을 만드셨기 때문에 이 메일을 보내드렸습니다.`,
    replySubject: (appName) => `${appName} 빠른 답변`,
    replyDraftIntro: (firstName) =>
      `${firstName}입니다. 간단히 답변 드릴게요.`,
    optionsLabel: '예시',
    answerLabel: '내 답변:',
  },
  ar: {
    subject: (_appName, firstName) =>
      `سؤال سريع يا ${firstName} - ما الذي تريد صنعه فعلا؟`,
    preview: (rewardCredits) =>
      `رد سريع منك وسنضيف ${rewardCredits} رصيداً إلى حسابك كهدية بسيطة.`,
    title: 'قبل أن نستمر في التخمين',
    greeting: (firstName) => `مرحباً ${firstName}،`,
    intro:
      'لقد سجلت في mogged، لكن يبدو أنك لم تصل بعد إلى أول نتيجة ناجحة. وهذا طبيعي جداً.',
    ask:
      'بدلاً من إرسال رسالة عامة أخرى عن طريقة استخدام المنتج، فضلنا أن نسألك شيئاً مفيداً فعلاً.',
    replyHint:
      'يمكنك الرد بكلمات قليلة فقط. حتى لو كانت الإجابة غير مرتبة فهذا ممتاز بالنسبة لنا.',
    questionIntro: 'هذه الأربع تساعدنا أكثر من أي شيء آخر:',
    questions: [
      {
        prompt: 'ما الذي تريد إنشاءه؟',
        options: [
          'محتوى مؤثرين بالذكاء الاصطناعي',
          'فيديوهات تحكم بالحركة',
          'إعلانات ومنتجات تجارية',
          'محتوى للسوشيال ميديا',
          'فيديوهات فنية أو إبداعية',
          'ميمز ومحتوى مرح',
          'شيء آخر',
        ],
      },
      {
        prompt: 'ما مدى خبرتك مع أدوات الذكاء الاصطناعي؟',
        options: ['مبتدئ', 'متوسط', 'متقدم', 'خبير'],
      },
      {
        prompt: 'ما هو استخدامك الأساسي؟',
        options: [
          'شخصي أو هواية',
          'صانع محتوى أو مؤثر',
          'عمل صغير أو مستقل',
          'وكالة أو استوديو',
          'شركة أو مؤسسة',
          'طالب أو تعليم',
        ],
      },
      {
        prompt: 'ما الذي يهمك أكثر الآن؟',
        options: [
          'جودة الفيديو',
          'سرعة التوليد',
          'سهولة الاستخدام',
          'سعر مناسب',
          'تحكم إبداعي',
          'نماذج ذكاء اصطناعي مميزة',
        ],
      },
    ],
    rewardLine: (rewardCredits) =>
      `إذا رددت علينا بإجابات سريعة فسنضيف ${rewardCredits} رصيداً إلى حسابك كشكر منا.`,
    replyButton: (rewardCredits) =>
      `رد الآن واحصل على ${rewardCredits} رصيداً`,
    replyButtonHint:
      'وبالطبع يمكنك الرد مباشرة على هذه الرسالة أيضاً، إذا كان الزر يبدو متحمساً أكثر من اللازم.',
    workspaceTitle: 'وإذا كنت تفضل العودة للتجربة مباشرة',
    workspaceDescription:
      'هذا ممتاز أيضاً. مساحة العمل ما زالت بانتظارك.',
    workspaceCta: 'افتح مساحة العمل',
    closing: 'حتى الإجابات غير المرتبة مرحب بها. نحن لا نصحح واجباً مدرسياً هنا.',
    signoff: (appName) => `- فريق ${appName}`,
    footer: (appName, domain) =>
      `تم إرسال هذه الرسالة لأنك أنشأت حساب ${appName} على ${domain}.`,
    replySubject: (appName) => `إجابات سريعة لـ ${appName}`,
    replyDraftIntro: (firstName) =>
      `مرحباً، أنا ${firstName} وهذه إجاباتي السريعة:`,
    optionsLabel: 'خيارات مقترحة',
    answerLabel: 'إجابتي:',
  },
};

function getFirstName(name: string) {
  return name?.split(/[\s@]/)[0] || 'there';
}

function resolveRewardCredits(options?: ActivationSurveyEmailOptions) {
  return (
    options?.rewardCredits ?? DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS
  );
}

function getActivationSurveyCopy(
  locale?: string | null
): ActivationSurveyEmailCopy {
  const resolvedLocale = resolveAppLocale(locale);

  return {
    locale: resolvedLocale,
    localeTag: getLocaleBcp47(resolvedLocale),
    dir: getLocaleDirection(resolvedLocale),
    ...ACTIVATION_SURVEY_COPY[resolvedLocale],
  };
}

function getAbsoluteLocalizedUrl(path: string, locale?: string | null) {
  const resolvedLocale = resolveAppLocale(locale);
  return `${getAppUrl()}${getLocalizedPath(path, resolvedLocale)}`;
}

function getReplyHref(
  firstName: string,
  copy: ActivationSurveyEmailCopy,
  supportEmail: string
) {
  const params = new URLSearchParams({
    subject: copy.replySubject(getAppName()),
    body: [
      copy.replyDraftIntro(firstName),
      '',
      ...copy.questions.flatMap((question, index) => [
        `${index + 1}. ${question.prompt}`,
        `${copy.optionsLabel}: ${question.options.join(' / ')}`,
        copy.answerLabel,
        '',
      ]),
    ].join('\n'),
  });

  return `mailto:${supportEmail}?${params.toString()}`;
}

export function getActivationSurveyEmailSubject(
  name: string,
  options?: ActivationSurveyEmailOptions
) {
  const copy = getActivationSurveyCopy(options?.locale);
  return copy.subject(getAppName(), getFirstName(name));
}

export function getActivationSurveyEmailHtml(
  name: string,
  options?: ActivationSurveyEmailOptions
) {
  const firstName = getFirstName(name);
  const appName = getAppName();
  const appUrl = getAppUrl();
  const supportEmail = getSupportEmail();
  const rewardCredits = resolveRewardCredits(options);
  const copy = getActivationSurveyCopy(options?.locale);
  const replyHref = getReplyHref(firstName, copy, supportEmail);
  const workspaceUrl = getAbsoluteLocalizedUrl(
    AI_VIDEO_GENERATOR_ROOT_PATH,
    options?.locale
  );
  const questionRows = copy.questions
    .map(
      (question, index) => `<tr><td style="padding:0 0 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;background-color:#ffffff;">
<tr><td style="padding:16px 18px;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:16px;font-weight:700;color:#111827;line-height:1.5;">${index + 1}. ${question.prompt}</p>
<p style="margin:0;font-family:${FONT};font-size:14px;color:#4b5563;line-height:1.7;"><strong>${copy.optionsLabel}:</strong> ${question.options.join(' / ')}</p>
</td></tr>
</table>
</td></tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${copy.localeTag}" dir="${copy.dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5f7fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preview(rewardCredits)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fb;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;border:1px solid #e5e7eb;">
<tr><td style="padding:36px 32px;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:28px;font-weight:700;color:#111827;line-height:1.25;">${copy.title}</p>
<p style="margin:0 0 18px;font-family:${FONT};font-size:15px;color:#111827;line-height:1.75;">${copy.greeting(firstName)}</p>
<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;color:#374151;line-height:1.75;">${copy.intro}</p>
<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;color:#374151;line-height:1.75;">${copy.ask}</p>
<p style="margin:0 0 22px;font-family:${FONT};font-size:14px;color:#6b7280;line-height:1.7;">${copy.replyHint}</p>
<p style="margin:0 0 12px;font-family:${FONT};font-size:17px;font-weight:700;color:#111827;line-height:1.5;">${copy.questionIntro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">${questionRows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #bfdbfe;border-radius:10px;background-color:#eff6ff;">
<tr><td style="padding:16px 18px;font-family:${FONT};font-size:14px;color:#1d4ed8;line-height:1.7;">${copy.rewardLine(rewardCredits)}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;"><tr><td>
<a href="${replyHref}" target="_blank" style="display:inline-block;padding:12px 20px;border-radius:9px;background-color:#111827;font-family:${FONT};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${copy.replyButton(rewardCredits)}</a>
</td></tr></table>
<p style="margin:0 0 24px;font-family:${FONT};font-size:13px;color:#6b7280;line-height:1.7;">${copy.replyButtonHint}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;">
<tr><td style="padding:18px 0;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:16px;font-weight:700;color:#111827;line-height:1.5;">${copy.workspaceTitle}</p>
<p style="margin:0 0 14px;font-family:${FONT};font-size:14px;color:#4b5563;line-height:1.7;">${copy.workspaceDescription}</p>
<a href="${workspaceUrl}" target="_blank" style="font-family:${FONT};font-size:14px;font-weight:700;color:#2563eb;text-decoration:none;">${copy.workspaceCta}</a>
</td></tr>
</table>
<p style="margin:0 0 12px;font-family:${FONT};font-size:14px;color:#4b5563;line-height:1.7;">${copy.closing}</p>
<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;color:#111827;line-height:1.7;">${copy.signoff(appName)}</p>
<p style="margin:0;font-family:${FONT};font-size:12px;color:#9ca3af;line-height:1.6;">${copy.footer(appName, appUrl.replace(/^https?:\/\//, ''))}<br><a href="mailto:${supportEmail}" style="color:#9ca3af;text-decoration:none;">${supportEmail}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function getActivationSurveyEmailText(
  name: string,
  options?: ActivationSurveyEmailOptions
) {
  const firstName = getFirstName(name);
  const appName = getAppName();
  const appUrl = getAppUrl();
  const supportEmail = getSupportEmail();
  const rewardCredits = resolveRewardCredits(options);
  const copy = getActivationSurveyCopy(options?.locale);
  const replyHref = getReplyHref(firstName, copy, supportEmail);
  const workspaceUrl = getAbsoluteLocalizedUrl(
    AI_VIDEO_GENERATOR_ROOT_PATH,
    options?.locale
  );
  const questionText = copy.questions
    .map(
      (question, index) =>
        `${index + 1}. ${question.prompt}\n${copy.optionsLabel}: ${question.options.join(
          ' / '
        )}`
    )
    .join('\n\n');

  return `${copy.title}

${copy.greeting(firstName)}

${copy.intro}

${copy.ask}

${copy.replyHint}

${copy.questionIntro}

${questionText}

${copy.rewardLine(rewardCredits)}

${copy.replyButton(rewardCredits)}
${replyHref}

${copy.replyButtonHint}

${copy.workspaceTitle}
${copy.workspaceDescription}
${workspaceUrl}

${copy.closing}
${copy.signoff(appName)}

---
${copy.footer(appName, appUrl.replace(/^https?:\/\//, ''))}
${supportEmail}`;
}
