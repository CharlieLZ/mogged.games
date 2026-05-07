import type { AppLocale } from '@/config/locale';
import { normalizeLocale } from '@/config/locale';

import arCertificateMessages from '@/config/locale/messages/ar/certificate.json';
import deCertificateMessages from '@/config/locale/messages/de/certificate.json';
import enCertificateMessages from '@/config/locale/messages/en/certificate.json';
import esCertificateMessages from '@/config/locale/messages/es/certificate.json';
import frCertificateMessages from '@/config/locale/messages/fr/certificate.json';
import itCertificateMessages from '@/config/locale/messages/it/certificate.json';
import jaCertificateMessages from '@/config/locale/messages/ja/certificate.json';
import koCertificateMessages from '@/config/locale/messages/ko/certificate.json';
import zhCertificateMessages from '@/config/locale/messages/zh/certificate.json';

const certificateMessagesByLocale = {
  en: enCertificateMessages,
  zh: zhCertificateMessages,
  de: deCertificateMessages,
  it: itCertificateMessages,
  fr: frCertificateMessages,
  es: esCertificateMessages,
  ja: jaCertificateMessages,
  ko: koCertificateMessages,
  ar: arCertificateMessages,
} as const satisfies Record<AppLocale, typeof enCertificateMessages>;

const certificateExtraCopy = {
  en: {
    notProvided: 'Not provided',
    websiteLabel: 'Website',
    usageNoteLabel: 'Usage Note',
    signInRequired:
      'Please sign in before downloading your business certificate.',
    automatedPdfLanguageNote:
      'Automatic certificate downloads are issued as English PDF files.',
    automatedLatinNameNote:
      'Self-serve certificate downloads currently support Latin or English legal names only.',
    manualReviewBadge: 'Manual Review Required',
    manualReviewDescription:
      'Your yearly plan is active, but this certificate needs manual preparation because the legal name is not in Latin characters.',
    manualReviewAction: 'Contact Support for Manual Certificate',
    manualReviewApiMessage:
      'Automatic certificate downloads currently support Latin or English legal names only. Please contact support for manual certificate preparation.',
  },
  zh: {
    notProvided: '未提供',
    websiteLabel: '站点',
    usageNoteLabel: '用途说明',
    signInRequired: '请先登录后再下载商业资质证明。',
    automatedPdfLanguageNote: '自动下载的证书 PDF 统一使用英文模板。',
    automatedLatinNameNote:
      '自助下载目前仅支持使用拉丁字母或英文法定姓名的证书。',
    manualReviewBadge: '需要人工处理',
    manualReviewDescription:
      '你的年费资格已生效，但当前法定姓名不是拉丁字符，证书需要由我们人工制作。',
    manualReviewAction: '联系支持人工开具证书',
    manualReviewApiMessage:
      '自动证书下载目前仅支持拉丁字母或英文法定姓名。请联系支持进行人工制作。',
  },
  de: {
    notProvided: 'Nicht angegeben',
    websiteLabel: 'Website',
    usageNoteLabel: 'Nutzungshinweis',
    signInRequired:
      'Bitte melden Sie sich an, bevor Sie Ihr Geschäftszertifikat herunterladen.',
    automatedPdfLanguageNote:
      'Automatische Zertifikat-Downloads werden als englische PDF-Dateien ausgestellt.',
    automatedLatinNameNote:
      'Self-Service-Zertifikate unterstützen derzeit nur rechtliche Namen in lateinischer Schrift oder auf Englisch.',
    manualReviewBadge: 'Manuelle Prüfung erforderlich',
    manualReviewDescription:
      'Ihr Jahresplan ist aktiv, aber dieses Zertifikat muss manuell erstellt werden, weil der rechtliche Name keine lateinischen Zeichen verwendet.',
    manualReviewAction: 'Support für manuelles Zertifikat kontaktieren',
    manualReviewApiMessage:
      'Automatische Zertifikat-Downloads unterstützen derzeit nur rechtliche Namen in lateinischer Schrift oder auf Englisch. Bitte kontaktieren Sie den Support für eine manuelle Ausstellung.',
  },
  it: {
    notProvided: 'Non specificato',
    websiteLabel: 'Sito web',
    usageNoteLabel: 'Nota d’uso',
    signInRequired:
      'Accedi prima di scaricare il certificato aziendale.',
    automatedPdfLanguageNote:
      'I download automatici dei certificati vengono emessi come PDF in inglese.',
    automatedLatinNameNote:
      'Il download self-service del certificato supporta attualmente solo nomi legali in alfabeto latino o inglese.',
    manualReviewBadge: 'Revisione manuale richiesta',
    manualReviewDescription:
      'Il tuo piano annuale è attivo, ma questo certificato richiede una preparazione manuale perché il nome legale non usa caratteri latini.',
    manualReviewAction: 'Contatta il supporto per il certificato manuale',
    manualReviewApiMessage:
      'Il download automatico del certificato supporta attualmente solo nomi legali in alfabeto latino o inglese. Contatta il supporto per la preparazione manuale.',
  },
  fr: {
    notProvided: 'Non renseigné',
    websiteLabel: 'Site web',
    usageNoteLabel: "Note d'utilisation",
    signInRequired:
      "Veuillez vous connecter avant de télécharger votre certificat d'entreprise.",
    automatedPdfLanguageNote:
      'Les téléchargements automatiques de certificats sont émis au format PDF en anglais.',
    automatedLatinNameNote:
      'Le téléchargement en libre-service prend actuellement en charge uniquement les noms légaux en alphabet latin ou en anglais.',
    manualReviewBadge: 'Préparation manuelle requise',
    manualReviewDescription:
      'Votre abonnement annuel est actif, mais ce certificat doit être préparé manuellement car le nom légal n’utilise pas de caractères latins.',
    manualReviewAction: 'Contacter le support pour un certificat manuel',
    manualReviewApiMessage:
      'Le téléchargement automatique du certificat prend actuellement en charge uniquement les noms légaux en alphabet latin ou en anglais. Contactez le support pour une préparation manuelle.',
  },
  es: {
    notProvided: 'No especificado',
    websiteLabel: 'Sitio web',
    usageNoteLabel: 'Nota de uso',
    signInRequired:
      'Inicia sesión antes de descargar tu certificado empresarial.',
    automatedPdfLanguageNote:
      'Las descargas automáticas del certificado se emiten como PDF en inglés.',
    automatedLatinNameNote:
      'La descarga autoservicio del certificado solo admite actualmente nombres legales en alfabeto latino o en inglés.',
    manualReviewBadge: 'Se requiere revisión manual',
    manualReviewDescription:
      'Tu plan anual está activo, pero este certificado necesita preparación manual porque el nombre legal no usa caracteres latinos.',
    manualReviewAction: 'Contactar soporte para certificado manual',
    manualReviewApiMessage:
      'La descarga automática del certificado solo admite actualmente nombres legales en alfabeto latino o en inglés. Ponte en contacto con soporte para la preparación manual.',
  },
  ja: {
    notProvided: '未提供',
    websiteLabel: 'ウェブサイト',
    usageNoteLabel: '利用上の注記',
    signInRequired:
      '事業証明書をダウンロードする前にサインインしてください。',
    automatedPdfLanguageNote:
      '自動発行される証明書 PDF は英語テンプレートで発行されます。',
    automatedLatinNameNote:
      'セルフサービスの証明書ダウンロードは現在、ラテン文字または英語の法的氏名のみ対応しています。',
    manualReviewBadge: '手動対応が必要です',
    manualReviewDescription:
      '年額プランの条件は満たしていますが、法的氏名がラテン文字ではないため、この証明書は手動での作成が必要です。',
    manualReviewAction: '手動証明書のためにサポートへ連絡',
    manualReviewApiMessage:
      '自動証明書ダウンロードは現在、ラテン文字または英語の法的氏名のみ対応しています。手動作成のためサポートへご連絡ください。',
  },
  ko: {
    notProvided: '제공되지 않음',
    websiteLabel: '웹사이트',
    usageNoteLabel: '이용 안내',
    signInRequired:
      '비즈니스 인증서를 다운로드하기 전에 먼저 로그인해 주세요.',
    automatedPdfLanguageNote:
      '자동 발급되는 인증서 PDF는 영문 템플릿으로 제공됩니다.',
    automatedLatinNameNote:
      '셀프서비스 인증서 다운로드는 현재 라틴 문자 또는 영문 법적 이름만 지원합니다.',
    manualReviewBadge: '수동 검토 필요',
    manualReviewDescription:
      '연간 플랜은 활성 상태이지만 법적 이름이 라틴 문자가 아니므로 이 인증서는 수동으로 준비해야 합니다.',
    manualReviewAction: '수동 인증서를 위해 지원팀에 문의',
    manualReviewApiMessage:
      '자동 인증서 다운로드는 현재 라틴 문자 또는 영문 법적 이름만 지원합니다. 수동 발급을 위해 지원팀에 문의해 주세요.',
  },
  ar: {
    notProvided: 'غير متوفر',
    websiteLabel: 'الموقع الإلكتروني',
    usageNoteLabel: 'ملاحظة الاستخدام',
    signInRequired: 'يرجى تسجيل الدخول قبل تنزيل شهادة الأعمال الخاصة بك.',
    automatedPdfLanguageNote:
      'يتم إصدار ملفات PDF الخاصة بالشهادات التلقائية باستخدام قالب إنجليزي.',
    automatedLatinNameNote:
      'يدعم التنزيل الذاتي للشهادة حالياً الأسماء القانونية المكتوبة بالأحرف اللاتينية أو الإنجليزية فقط.',
    manualReviewBadge: 'مطلوب إعداد يدوي',
    manualReviewDescription:
      'اشتراكك السنوي نشط، لكن هذه الشهادة تحتاج إلى إعداد يدوي لأن الاسم القانوني لا يستخدم أحرفاً لاتينية.',
    manualReviewAction: 'تواصل مع الدعم للحصول على شهادة يدوية',
    manualReviewApiMessage:
      'يدعم التنزيل التلقائي للشهادة حالياً الأسماء القانونية المكتوبة بالأحرف اللاتينية أو الإنجليزية فقط. يرجى التواصل مع الدعم لإعدادها يدوياً.',
  },
} as const satisfies Record<
  AppLocale,
  {
    notProvided: string;
    websiteLabel: string;
    usageNoteLabel: string;
    signInRequired: string;
    automatedPdfLanguageNote: string;
    automatedLatinNameNote: string;
    manualReviewBadge: string;
    manualReviewDescription: string;
    manualReviewAction: string;
    manualReviewApiMessage: string;
  }
>;

function resolveCertificateLocale(locale?: string | null): AppLocale {
  return normalizeLocale(locale) ?? 'en';
}

export function getBusinessCertificateMessages(locale?: string | null) {
  return certificateMessagesByLocale[resolveCertificateLocale(locale)];
}

export function getBusinessCertificateExtraCopy(locale?: string | null) {
  return certificateExtraCopy[resolveCertificateLocale(locale)];
}

export function getBusinessCertificatePdfCopy(_locale?: string | null) {
  const messages = getBusinessCertificateMessages('en');

  return {
    title: messages.page.title,
    subtitle: messages.page.overview.title,
    holderLabel: messages.verify.fields.holder,
    planLabel: messages.page.overview.current_plan,
    emailLabel: messages.verify.fields.email,
    subscriptionLabel: messages.verify.fields.subscription_reference,
    issuedLabel: messages.verify.fields.issued_on,
    validFromLabel: messages.verify.fields.valid_from,
    validUntilLabel: messages.verify.fields.valid_until,
    verificationLabel: messages.page.overview.verification_url,
    badgeVerified:
      messages.page.statuses.active || messages.page.badges.active,
    badgeExpired:
      messages.page.statuses.expired || messages.page.badges.unavailable,
    rightsNote: messages.page.overview.description,
  };
}
