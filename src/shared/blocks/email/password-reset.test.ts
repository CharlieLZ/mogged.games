import { describe, expect, it } from 'vitest';

import {
  getPasswordResetEmailHtml,
  getPasswordResetEmailSubject,
  getPasswordResetEmailText,
} from './password-reset';

const EXPECTATIONS = {
  en: {
    subject: 'Reset your mogged password',
    cta: 'Reset password',
    heading: 'Reset your password',
    dir: 'ltr',
  },
  zh: {
    subject: '重置你的 mogged 密码',
    cta: '重置密码',
    heading: '重置密码',
    dir: 'ltr',
  },
  de: {
    subject: 'Setze dein mogged Passwort zurück',
    cta: 'Passwort zurücksetzen',
    heading: 'Passwort zurücksetzen',
    dir: 'ltr',
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe mogged',
    cta: 'Réinitialiser le mot de passe',
    heading: 'Réinitialiser le mot de passe',
    dir: 'ltr',
  },
  es: {
    subject: 'Restablece tu contraseña de mogged',
    cta: 'Restablecer contraseña',
    heading: 'Restablecer contraseña',
    dir: 'ltr',
  },
  ja: {
    subject: 'mogged のパスワードを再設定',
    cta: 'パスワードを再設定',
    heading: 'パスワードを再設定',
    dir: 'ltr',
  },
  it: {
    subject: 'Reimposta la password di mogged',
    cta: 'Reimposta password',
    heading: 'Reimposta la password',
    dir: 'ltr',
  },
  ko: {
    subject: 'mogged 비밀번호 재설정',
    cta: '비밀번호 재설정',
    heading: '비밀번호 재설정',
    dir: 'ltr',
  },
  ar: {
    subject: 'أعد تعيين كلمة مرور mogged',
    cta: 'إعادة تعيين كلمة المرور',
    heading: 'إعادة تعيين كلمة المرور',
    dir: 'rtl',
  },
} as const;

describe('password reset email copy', () => {
  it('renders localized password reset email copy for every supported locale', () => {
    for (const [locale, expectation] of Object.entries(EXPECTATIONS)) {
      const html = getPasswordResetEmailHtml({
        name: 'Casey',
        resetUrl: 'https://mogged.games/reset-password?token=valid-token',
        locale,
      });
      const text = getPasswordResetEmailText({
        name: 'Casey',
        resetUrl: 'https://mogged.games/reset-password?token=valid-token',
        locale,
      });

      expect(getPasswordResetEmailSubject(locale)).toBe(expectation.subject);
      expect(html).toContain(`<html lang="${locale}" dir="${expectation.dir}">`);
      expect(html).toContain(expectation.heading);
      expect(html).toContain(expectation.cta);
      expect(text).toContain(expectation.heading);
      expect(text).toContain(expectation.cta);
    }
  });
});
