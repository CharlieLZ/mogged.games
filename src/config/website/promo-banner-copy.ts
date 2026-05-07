export interface PromoBannerCopy {
  quotaLabel: string;
  quotaSuffix: string;
  popoverTitle: string;
  popoverBody: string;
  popoverFooter: string;
}

const PROMO_BANNER_COPY: Record<string, PromoBannerCopy> = {
  en: {
    quotaLabel: 'Free Quota',
    quotaSuffix: '',
    popoverTitle: 'Early access gift',
    popoverBody:
      'Try mogged with {{guest_daily_quota_limit}} free guest credits before signing in.',
    popoverFooter: 'Your feedback helps shape what comes next.',
  },
  zh: {
    quotaLabel: '免费额度',
    quotaSuffix: '',
    popoverTitle: '早期体验赠额',
    popoverBody:
      '登录前也可用 {{guest_daily_quota_limit}} 点免费访客积分试用 mogged。',
    popoverFooter: '你的反馈会帮助我们继续改进。',
  },
  de: {
    quotaLabel: 'Freies Kontingent',
    quotaSuffix: '',
    popoverTitle: 'Geschenk zum Vorabzugang',
    popoverBody:
      'Teste mogged mit {{guest_daily_quota_limit}} kostenlosen Gast-Credits vor der Anmeldung.',
    popoverFooter: 'Dein Feedback hilft bei den nachsten Schritten.',
  },
  fr: {
    quotaLabel: 'Quota gratuit',
    quotaSuffix: '',
    popoverTitle: 'Cadeau acces anticipe',
    popoverBody:
      'Essayez mogged avec {{guest_daily_quota_limit}} credits invites gratuits avant connexion.',
    popoverFooter: 'Vos retours nous aident a ameliorer la suite.',
  },
  es: {
    quotaLabel: 'Cuota gratis',
    quotaSuffix: '',
    popoverTitle: 'Regalo de acceso anticipado',
    popoverBody:
      'Prueba mogged con {{guest_daily_quota_limit}} creditos gratis antes de iniciar sesion.',
    popoverFooter: 'Tus comentarios ayudan a mejorar lo proximo.',
  },
  ja: {
    quotaLabel: '無料枠',
    quotaSuffix: '',
    popoverTitle: '早期アクセス特典',
    popoverBody:
      'ログイン前に mogged を {{guest_daily_quota_limit}} 件の無料ゲストクレジットで試せます。',
    popoverFooter: 'フィードバックが次の改善につながります。',
  },
  it: {
    quotaLabel: 'Quota gratuita',
    quotaSuffix: '',
    popoverTitle: 'Regalo accesso anticipato',
    popoverBody:
      "Prova mogged con {{guest_daily_quota_limit}} crediti ospite gratis prima dell'accesso.",
    popoverFooter: 'Il tuo feedback guida i prossimi miglioramenti.',
  },
  ko: {
    quotaLabel: '무료 한도',
    quotaSuffix: '',
    popoverTitle: '얼리 액세스 선물',
    popoverBody:
      '로그인 전에도 {{guest_daily_quota_limit}}개의 무료 게스트 크레딧으로 mogged를 체험할 수 있습니다.',
    popoverFooter: '여러분의 피드백이 다음 개선을 이끕니다.',
  },
  ar: {
    quotaLabel: 'حصة مجانية',
    quotaSuffix: '',
    popoverTitle: 'هدية الوصول المبكر',
    popoverBody:
      'جرب mogged مع {{guest_daily_quota_limit}} رصيد ضيف مجاني قبل تسجيل الدخول.',
    popoverFooter: 'ملاحظاتك تساعدنا على تحسين القادم.',
  },
};

export function getPromoBannerCopy(locale: string): PromoBannerCopy {
  return PROMO_BANNER_COPY[locale] ?? PROMO_BANNER_COPY.en;
}
