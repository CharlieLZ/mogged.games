import {
  getLocaleDirection,
  resolveAppLocale,
} from '@/config/locale';
import { getAppName, getSupportEmail } from '@/shared/lib/brand';

type PasswordResetEmailCopy = {
  subject: (appName: string) => string;
  preview: string;
  heading: string;
  fallbackName: string;
  greeting: (name: string) => string;
  intro: string;
  cta: string;
  ignore: string;
  help: (supportEmail: string) => string;
  footer: (appName: string) => string;
};

const COPY: Record<
  'en' | 'zh' | 'de' | 'fr' | 'es' | 'ja' | 'it' | 'ko' | 'ar',
  PasswordResetEmailCopy
> = {
  en: {
    subject: (appName) => `Reset your ${appName} password`,
    preview: 'Use the secure link below to choose a new password.',
    heading: 'Reset your password',
    fallbackName: 'there',
    greeting: (name) => `Hi ${name},`,
    intro:
      'We received a request to reset your password. Use the secure button below to choose a new one.',
    cta: 'Reset password',
    ignore:
      "If you didn't request this, you can ignore this email and your current password will keep working.",
    help: (supportEmail) =>
      `Need help? Reply to this email or contact ${supportEmail}.`,
    footer: (appName) =>
      `This password reset email was sent by ${appName}.`,
  },
  zh: {
    subject: (appName) => `重置你的 ${appName} 密码`,
    preview: '请使用下面的安全链接设置新密码。',
    heading: '重置密码',
    fallbackName: '你好',
    greeting: (name) => `${name}，你好：`,
    intro: '我们收到了一次重置密码请求。请点击下面的安全按钮设置新密码。',
    cta: '重置密码',
    ignore: '如果这不是你本人发起的请求，可以直接忽略这封邮件，你当前的密码仍然有效。',
    help: (supportEmail) =>
      `需要帮助？直接回复这封邮件，或联系 ${supportEmail}。`,
    footer: (appName) => `这封密码重置邮件由 ${appName} 发出。`,
  },
  de: {
    subject: (appName) => `Setze dein ${appName} Passwort zurück`,
    preview: 'Verwende den sicheren Link unten, um ein neues Passwort zu wählen.',
    heading: 'Passwort zurücksetzen',
    fallbackName: 'da',
    greeting: (name) => `Hallo ${name},`,
    intro:
      'Wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Nutze die sichere Schaltfläche unten, um ein neues Passwort festzulegen.',
    cta: 'Passwort zurücksetzen',
    ignore:
      'Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein aktuelles Passwort bleibt weiterhin gültig.',
    help: (supportEmail) =>
      `Brauchst du Hilfe? Antworte auf diese E-Mail oder kontaktiere ${supportEmail}.`,
    footer: (appName) =>
      `Diese E-Mail zum Zurücksetzen des Passworts wurde von ${appName} gesendet.`,
  },
  fr: {
    subject: (appName) => `Réinitialisez votre mot de passe ${appName}`,
    preview:
      'Utilisez le lien sécurisé ci-dessous pour choisir un nouveau mot de passe.',
    heading: 'Réinitialiser le mot de passe',
    fallbackName: 'bonjour',
    greeting: (name) => `Bonjour ${name},`,
    intro:
      'Nous avons reçu une demande de réinitialisation de votre mot de passe. Utilisez le bouton sécurisé ci-dessous pour en choisir un nouveau.',
    cta: 'Réinitialiser le mot de passe',
    ignore:
      "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail et votre mot de passe actuel continuera de fonctionner.",
    help: (supportEmail) =>
      `Besoin d'aide ? Répondez à cet e-mail ou contactez ${supportEmail}.`,
    footer: (appName) =>
      `Cet e-mail de réinitialisation du mot de passe a été envoyé par ${appName}.`,
  },
  es: {
    subject: (appName) => `Restablece tu contraseña de ${appName}`,
    preview:
      'Usa el enlace seguro de abajo para elegir una nueva contraseña.',
    heading: 'Restablecer contraseña',
    fallbackName: 'hola',
    greeting: (name) => `Hola ${name}:`,
    intro:
      'Hemos recibido una solicitud para restablecer tu contraseña. Usa el botón seguro de abajo para elegir una nueva.',
    cta: 'Restablecer contraseña',
    ignore:
      'Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña actual seguirá funcionando.',
    help: (supportEmail) =>
      `¿Necesitas ayuda? Responde a este correo o contacta con ${supportEmail}.`,
    footer: (appName) =>
      `Este correo de restablecimiento de contraseña fue enviado por ${appName}.`,
  },
  ja: {
    subject: (appName) => `${appName} のパスワードを再設定`,
    preview: '下の安全なリンクから新しいパスワードを設定してください。',
    heading: 'パスワードを再設定',
    fallbackName: 'こんにちは',
    greeting: (name) => `${name} さん`,
    intro:
      'パスワード再設定のリクエストを受け付けました。下の安全なボタンから新しいパスワードを設定してください。',
    cta: 'パスワードを再設定',
    ignore:
      'この操作に心当たりがない場合は、このメールを無視してください。現在のパスワードはそのまま利用できます。',
    help: (supportEmail) =>
      `サポートが必要な場合は、このメールに返信するか ${supportEmail} までご連絡ください。`,
    footer: (appName) =>
      `このパスワード再設定メールは ${appName} から送信されました。`,
  },
  it: {
    subject: (appName) => `Reimposta la password di ${appName}`,
    preview:
      'Usa il link sicuro qui sotto per scegliere una nuova password.',
    heading: 'Reimposta la password',
    fallbackName: 'ciao',
    greeting: (name) => `Ciao ${name},`,
    intro:
      'Abbiamo ricevuto una richiesta di reimpostazione della password. Usa il pulsante sicuro qui sotto per sceglierne una nuova.',
    cta: 'Reimposta password',
    ignore:
      'Se non hai richiesto questa operazione, puoi ignorare questa email e la tua password attuale continuerà a funzionare.',
    help: (supportEmail) =>
      `Hai bisogno di aiuto? Rispondi a questa email o contatta ${supportEmail}.`,
    footer: (appName) =>
      `Questa email di reimpostazione della password è stata inviata da ${appName}.`,
  },
  ko: {
    subject: (appName) => `${appName} 비밀번호 재설정`,
    preview: '아래의 안전한 링크를 사용해 새 비밀번호를 설정하세요.',
    heading: '비밀번호 재설정',
    fallbackName: '안녕하세요',
    greeting: (name) => `${name}님, 안녕하세요.`,
    intro:
      '비밀번호 재설정 요청이 접수되었습니다. 아래의 안전한 버튼을 사용해 새 비밀번호를 설정하세요.',
    cta: '비밀번호 재설정',
    ignore:
      '직접 요청한 것이 아니라면 이 이메일을 무시해도 됩니다. 현재 비밀번호는 계속 사용할 수 있습니다.',
    help: (supportEmail) =>
      `도움이 필요하면 이 이메일에 답장하거나 ${supportEmail}로 문의하세요.`,
    footer: (appName) =>
      `이 비밀번호 재설정 이메일은 ${appName}에서 발송되었습니다.`,
  },
  ar: {
    subject: (appName) => `أعد تعيين كلمة مرور ${appName}`,
    preview: 'استخدم الرابط الآمن أدناه لاختيار كلمة مرور جديدة.',
    heading: 'إعادة تعيين كلمة المرور',
    fallbackName: 'مرحبًا',
    greeting: (name) => `مرحبًا ${name}،`,
    intro:
      'تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بك. استخدم الزر الآمن أدناه لاختيار كلمة مرور جديدة.',
    cta: 'إعادة تعيين كلمة المرور',
    ignore:
      'إذا لم تطلب هذا الإجراء، يمكنك تجاهل هذه الرسالة وسيظل بإمكانك استخدام كلمة المرور الحالية.',
    help: (supportEmail) =>
      `هل تحتاج إلى مساعدة؟ رد على هذه الرسالة أو تواصل مع ${supportEmail}.`,
    footer: (appName) =>
      `تم إرسال رسالة إعادة تعيين كلمة المرور هذه من ${appName}.`,
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

export function getPasswordResetEmailSubject(locale?: string | null) {
  const { copy } = getCopy(locale);
  return copy.subject(getAppName());
}

export function getPasswordResetEmailHtml(params: {
  name?: string | null;
  resetUrl: string;
  locale?: string | null;
}) {
  const { name, resetUrl, locale } = params;
  const { copy, dir } = getCopy(locale);
  const supportEmail = getSupportEmail();
  const appName = getAppName();
  const recipientName = name?.trim() || copy.fallbackName;

  return `<!DOCTYPE html>
<html lang="${resolveAppLocale(locale)}" dir="${dir}">
  <body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="margin:0 auto;max-width:560px;padding:32px 20px;">
      <div style="border-radius:20px;background:#111827;padding:32px;border:1px solid rgba(148,163,184,0.18);">
        <p style="margin:0 0 12px;color:#94a3b8;font-size:14px;">${copy.preview}</p>
        <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;color:#f8fafc;">${copy.heading}</h1>
        <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#e2e8f0;">${copy.greeting(recipientName)}</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#cbd5e1;">${copy.intro}</p>
        <a href="${resetUrl}" style="display:inline-block;border-radius:12px;background:#f97316;color:#0f172a;text-decoration:none;font-weight:700;padding:14px 20px;">${copy.cta}</a>
        <p style="margin:24px 0 12px;font-size:14px;line-height:1.7;color:#94a3b8;">${copy.ignore}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#94a3b8;">${copy.help(supportEmail)}</p>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;">${copy.footer(appName)}</p>
      </div>
    </div>
  </body>
</html>`;
}

export function getPasswordResetEmailText(params: {
  name?: string | null;
  resetUrl: string;
  locale?: string | null;
}) {
  const { name, resetUrl, locale } = params;
  const { copy } = getCopy(locale);
  const supportEmail = getSupportEmail();
  const recipientName = name?.trim() || copy.fallbackName;

  return [
    copy.heading,
    '',
    copy.greeting(recipientName),
    copy.intro,
    '',
    `${copy.cta}: ${resetUrl}`,
    '',
    copy.ignore,
    copy.help(supportEmail),
  ].join('\n');
}
