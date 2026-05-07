import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  publicPageLocaleMessagesPaths,
  publicSiteLocales,
} from '@/config/locale';

const PUBLIC_MESSAGE_FILES = [
  'common.json',
  'landing.json',
  'pricing.json',
  'certificate.json',
  'ai/video.json',
  'ai/image.json',
] as const;

const LEGAL_PAGE_SLUGS = [
  'acceptable-use-policy',
  'ai-wrapper-disclaimer',
  'content-moderation-policy',
  'mission',
  'privacy-policy',
  'refund-policy',
  'terms-of-service',
] as const;

function flattenKeys(
  value: unknown,
  prefix = '',
  acc: string[] = []
): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenKeys(item, prefix ? `${prefix}.${index}` : String(index), acc);
    });
    return acc;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      flattenKeys(child, prefix ? `${prefix}.${key}` : key, acc);
    });
    return acc;
  }

  acc.push(prefix);
  return acc;
}

describe('public locale parity', () => {
  const projectRoot = process.cwd();

  it('ships the same public message files for every live public locale', () => {
    for (const locale of publicSiteLocales) {
      for (const relativeFile of PUBLIC_MESSAGE_FILES) {
        const filePath = path.join(
          projectRoot,
          'src/config/locale/messages',
          locale,
          relativeFile
        );
        expect(fs.existsSync(filePath), `${locale}:${relativeFile}`).toBe(true);
      }
    }
  });

  it('ships every runtime-loaded message file for each live public locale', () => {
    for (const locale of publicSiteLocales) {
      for (const relativePath of publicPageLocaleMessagesPaths) {
        const relativeFile = `${relativePath}.json`;
        const filePath = path.join(
          projectRoot,
          'src/config/locale/messages',
          locale,
          relativeFile
        );
        expect(fs.existsSync(filePath), `${locale}:${relativeFile}`).toBe(true);
      }
    }
  });

  it('keeps live public message key sets aligned with english', () => {
    const englishRoot = path.join(
      projectRoot,
      'src/config/locale/messages',
      'en'
    );

    for (const relativeFile of PUBLIC_MESSAGE_FILES) {
      const englishKeys = flattenKeys(
        JSON.parse(
          fs.readFileSync(path.join(englishRoot, relativeFile), 'utf8')
        )
      ).sort();

      for (const locale of publicSiteLocales) {
        const localizedKeys = flattenKeys(
          JSON.parse(
            fs.readFileSync(
              path.join(
                projectRoot,
                'src/config/locale/messages',
                locale,
                relativeFile
              ),
              'utf8'
            )
          )
        ).sort();

        expect(localizedKeys, `${locale}:${relativeFile}`).toEqual(englishKeys);
      }
    }
  });

  it('keeps shared common action labels available for live public locales', () => {
    for (const locale of publicSiteLocales) {
      const commonMessages = JSON.parse(
        fs.readFileSync(
          path.join(
            projectRoot,
            'src/config/locale/messages',
            locale,
            'common.json'
          ),
          'utf8'
        )
      ) as {
        actions?: {
          more?: string;
        };
      };

      expect(
        commonMessages.actions?.more,
        `${locale}:common.actions.more`
      ).toBeTruthy();
    }
  });

  it('keeps all public trust pages available as localized MDX files for live locales', () => {
    for (const locale of publicSiteLocales) {
      for (const slug of LEGAL_PAGE_SLUGS) {
        const filename =
          locale === 'en' ? `${slug}.mdx` : `${slug}.${locale}.mdx`;
        const filePath = path.join(projectRoot, 'content/pages', filename);
        expect(fs.existsSync(filePath), `${locale}:${slug}`).toBe(true);
      }
    }
  });
});
