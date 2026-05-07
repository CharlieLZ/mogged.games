import { getLocaleDirection, resolveAppLocale } from '@/config/locale';
import { getAppName, getSupportEmail } from '@/shared/lib/brand';

type MagicLinkEmailCopy = {
  subject: (appName: string) => string;
  preview: string;
  heading: string;
  intro: string;
  cta: string;
  expiresSoon: string;
  ignore: string;
  help: (supportEmail: string) => string;
  footer: (appName: string) => string;
};

const COPY: Record<
  'en' | 'zh' | 'de' | 'fr' | 'es' | 'ja' | 'it' | 'ko' | 'ar',
  MagicLinkEmailCopy
> = {
  en: {
    subject: (appName) => `Your ${appName} magic link`,
    preview: 'Use the secure link below to sign in or finish creating your account.',
    heading: 'Your secure sign-in link',
    intro:
      'Use the button below to sign in or finish creating your account. This link is single-use and expires soon.',
    cta: 'Open secure link',
    expiresSoon: 'For security, request a new link if this one expires.',
    ignore: "If you didn't request this email, you can safely ignore it.",
    help: (supportEmail) =>
      `Need help? Reply to this email or contact ${supportEmail}.`,
    footer: (appName) => `This magic link email was sent by ${appName}.`,
  },
  zh: {
    subject: (appName) => `你的 ${appName} 登录链接`,
    preview: '点击下面的安全链接即可登录，或完成账户创建。',
    heading: '你的安全登录链接',
    intro:
      '点击下面的按钮即可登录，或完成账户创建。这个链接只能使用一次，而且很快会失效。',
    cta: '打开安全链接',
    expiresSoon: '为了安全起见，如果链接过期，请重新申请一封。',
    ignore: '如果这封邮件不是你本人发起的，可以直接忽略。',
    help: (supportEmail) =>
      `需要帮助？直接回复这封邮件，或联系 ${supportEmail}。`,
    footer: (appName) => `这封 Magic Link 邮件由 ${appName} 发出。`,
  },
  de: {
    subject: (appName) => `Dein ${appName} Magic Link`,
    preview:
      'Nutze den sicheren Link unten, um dich anzumelden oder dein Konto fertig zu erstellen.',
    heading: 'Dein sicherer Anmeldelink',
    intro:
      'Nutze die Schaltflaeche unten, um dich anzumelden oder dein Konto fertig zu erstellen. Dieser Link ist nur einmal gueltig und laeuft bald ab.',
    cta: 'Sicheren Link oeffnen',
    expiresSoon:
      'Fordere aus Sicherheitsgruenden einen neuen Link an, wenn dieser abgelaufen ist.',
    ignore:
      'Wenn du diese E-Mail nicht angefordert hast, kannst du sie sicher ignorieren.',
    help: (supportEmail) =>
      `Brauchst du Hilfe? Antworte auf diese E-Mail oder schreibe an ${supportEmail}.`,
    footer: (appName) =>
      `Diese Magic-Link-E-Mail wurde von ${appName} gesendet.`,
  },
  fr: {
    subject: (appName) => `Votre lien magique ${appName}`,
    preview:
      'Utilisez le lien securise ci-dessous pour vous connecter ou terminer la creation de votre compte.',
    heading: 'Votre lien de connexion securise',
    intro:
      "Utilisez le bouton ci-dessous pour vous connecter ou terminer la creation de votre compte. Ce lien ne fonctionne qu'une seule fois et expire bientot.",
    cta: 'Ouvrir le lien securise',
    expiresSoon:
      'Pour des raisons de securite, demandez un nouveau lien si celui-ci expire.',
    ignore:
      "Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet e-mail.",
    help: (supportEmail) =>
      `Besoin d'aide ? Repondez a cet e-mail ou contactez ${supportEmail}.`,
    footer: (appName) =>
      `Cet e-mail de lien magique a ete envoye par ${appName}.`,
  },
  es: {
    subject: (appName) => `Tu magic link de ${appName}`,
    preview:
      'Usa el enlace seguro de abajo para iniciar sesion o terminar de crear tu cuenta.',
    heading: 'Tu enlace seguro de acceso',
    intro:
      'Usa el boton de abajo para iniciar sesion o terminar de crear tu cuenta. Este enlace es de un solo uso y caduca pronto.',
    cta: 'Abrir enlace seguro',
    expiresSoon:
      'Por seguridad, solicita un nuevo enlace si este ya expiro.',
    ignore:
      'Si no solicitaste este correo, puedes ignorarlo con tranquilidad.',
    help: (supportEmail) =>
      `Necesitas ayuda? Responde a este correo o contacta con ${supportEmail}.`,
    footer: (appName) =>
      `Este correo de magic link fue enviado por ${appName}.`,
  },
  ja: {
    subject: (appName) => `${appName} のマジックリンク`,
    preview:
      '下の安全なリンクからサインイン、またはアカウント作成を完了してください。',
    heading: '安全なサインインリンク',
    intro:
      '下のボタンからサインイン、またはアカウント作成を完了してください。このリンクは1回だけ使え、まもなく期限切れになります。',
    cta: '安全なリンクを開く',
    expiresSoon:
      'セキュリティのため、期限切れになった場合は新しいリンクを再リクエストしてください。',
    ignore:
      'このメールに心当たりがない場合は、そのまま無視して問題ありません。',
    help: (supportEmail) =>
      `お困りの場合は、このメールに返信するか ${supportEmail} までご連絡ください。`,
    footer: (appName) =>
      `このマジックリンクメールは ${appName} から送信されました。`,
  },
  it: {
    subject: (appName) => `Il tuo magic link di ${appName}`,
    preview:
      'Usa il link sicuro qui sotto per accedere o completare la creazione del tuo account.',
    heading: 'Il tuo link di accesso sicuro',
    intro:
      'Usa il pulsante qui sotto per accedere o completare la creazione del tuo account. Questo link e monouso e scadra presto.',
    cta: 'Apri il link sicuro',
    expiresSoon:
      'Per sicurezza, richiedi un nuovo link se questo scade.',
    ignore:
      'Se non hai richiesto questa email, puoi ignorarla in tutta tranquillita.',
    help: (supportEmail) =>
      `Hai bisogno di aiuto? Rispondi a questa email o contatta ${supportEmail}.`,
    footer: (appName) =>
      `Questa email con magic link e stata inviata da ${appName}.`,
  },
  ko: {
    subject: (appName) => `${appName} 매직 링크`,
    preview:
      '아래의 안전한 링크를 사용해 로그인하거나 계정 생성을 마무리하세요.',
    heading: '안전한 로그인 링크',
    intro:
      '아래 버튼을 눌러 로그인하거나 계정 생성을 마무리하세요. 이 링크는 1회용이며 곧 만료됩니다.',
    cta: '안전한 링크 열기',
    expiresSoon:
      '보안을 위해 링크가 만료되면 새 링크를 다시 요청하세요.',
    ignore:
      '직접 요청한 메일이 아니라면 이 이메일을 무시하셔도 됩니다.',
    help: (supportEmail) =>
      `도움이 필요하면 이 이메일에 답장하거나 ${supportEmail}로 문의하세요.`,
    footer: (appName) =>
      `이 매직 링크 이메일은 ${appName}에서 발송되었습니다.`,
  },
  ar: {
    subject: (appName) => `رابطك السحري من ${appName}`,
    preview:
      'استخدم الرابط الآمن أدناه لتسجيل الدخول أو لإكمال إنشاء حسابك.',
    heading: 'رابط تسجيل الدخول الآمن',
    intro:
      'استخدم الزر أدناه لتسجيل الدخول أو لإكمال إنشاء حسابك. هذا الرابط يستخدم مرة واحدة فقط وسينتهي قريبًا.',
    cta: 'افتح الرابط الآمن',
    expiresSoon:
      'لأسباب أمنية، اطلب رابطًا جديدًا إذا انتهت صلاحية هذا الرابط.',
    ignore:
      'إذا لم تطلب هذه الرسالة، يمكنك تجاهلها بأمان.',
    help: (supportEmail) =>
      `هل تحتاج إلى مساعدة؟ رد على هذه الرسالة أو تواصل مع ${supportEmail}.`,
    footer: (appName) =>
      `تم إرسال رسالة الرابط السحري هذه من ${appName}.`,
  },
};

function getCopy(locale?: string | null) {
  const resolvedLocale = resolveAppLocale(locale);
  return {
    locale: resolvedLocale,
    dir: getLocaleDirection(resolvedLocale),
    copy: COPY[resolvedLocale],
  } as const;
}

export function getMagicLinkEmailSubject(locale?: string | null) {
  const { copy } = getCopy(locale);
  return copy.subject(getAppName());
}

export function getMagicLinkEmailHtml(params: {
  magicLinkUrl: string;
  locale?: string | null;
}) {
  const { magicLinkUrl, locale } = params;
  const { copy, dir } = getCopy(locale);
  const supportEmail = getSupportEmail();
  const appName = getAppName();

  return `<!DOCTYPE html>
<html lang="${resolveAppLocale(locale)}" dir="${dir}">
  <body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="margin:0 auto;max-width:560px;padding:32px 20px;">
      <div style="border-radius:20px;background:#111827;padding:32px;border:1px solid rgba(148,163,184,0.18);">
        <p style="margin:0 0 12px;color:#94a3b8;font-size:14px;">${copy.preview}</p>
        <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;color:#f8fafc;">${copy.heading}</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#cbd5e1;">${copy.intro}</p>
        <a href="${magicLinkUrl}" style="display:inline-block;border-radius:12px;background:#f97316;color:#0f172a;text-decoration:none;font-weight:700;padding:14px 20px;">${copy.cta}</a>
        <p style="margin:24px 0 12px;font-size:14px;line-height:1.7;color:#94a3b8;">${copy.expiresSoon}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#94a3b8;">${copy.ignore}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#94a3b8;">${copy.help(supportEmail)}</p>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;">${copy.footer(appName)}</p>
      </div>
    </div>
  </body>
</html>`;
}

export function getMagicLinkEmailText(params: {
  magicLinkUrl: string;
  locale?: string | null;
}) {
  const { magicLinkUrl, locale } = params;
  const { copy } = getCopy(locale);
  const supportEmail = getSupportEmail();

  return [
    copy.heading,
    '',
    copy.intro,
    '',
    `${copy.cta}: ${magicLinkUrl}`,
    '',
    copy.expiresSoon,
    copy.ignore,
    copy.help(supportEmail),
  ].join('\n');
}
