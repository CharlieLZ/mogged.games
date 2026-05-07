import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const localeRoot = path.join(process.cwd(), 'src/config/locale/messages');
const adminLocales = ['en', 'zh', 'de', 'fr', 'es', 'ja', 'it', 'ko', 'ar'];

function readAdminSettings(locale: string) {
  return JSON.parse(
    fs.readFileSync(
      path.join(localeRoot, locale, 'admin', 'settings.json'),
      'utf8'
    )
  );
}

describe('admin Seedance branding', () => {
  it('keeps Seedance as a brand token in every localized admin settings group', () => {
    for (const locale of adminLocales) {
      const groups = readAdminSettings(locale).groups as Record<string, string>;

      expect(groups.seedance).toContain('Seedance');
      expect(groups.kie).toBe('KIE');
    }
  });
});
