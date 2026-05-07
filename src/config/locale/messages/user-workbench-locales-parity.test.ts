import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  userWorkbenchLocaleMessagesPaths,
  userWorkbenchLocales,
} from '@/config/locale';

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

describe('user workbench locale parity', () => {
  const projectRoot = process.cwd();
  const englishRoot = path.join(projectRoot, 'src/config/locale/messages', 'en');

  it('ships every runtime-loaded user workbench message file for each live locale', () => {
    for (const locale of userWorkbenchLocales) {
      for (const relativePath of userWorkbenchLocaleMessagesPaths) {
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

  it('keeps live user workbench message key sets aligned with english', () => {
    for (const relativePath of userWorkbenchLocaleMessagesPaths) {
      const relativeFile = `${relativePath}.json`;
      const englishKeys = flattenKeys(
        JSON.parse(
          fs.readFileSync(path.join(englishRoot, relativeFile), 'utf8')
        )
      ).sort();

      for (const locale of userWorkbenchLocales) {
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
});
