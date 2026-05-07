import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  adminWorkbenchLocaleMessagesPaths,
  adminWorkbenchLocales,
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

describe('admin live locale parity', () => {
  const projectRoot = process.cwd();
  const englishRoot = path.join(projectRoot, 'src/config/locale/messages', 'en');

  it('keeps live admin workbench message key sets aligned with english', () => {
    for (const relativePath of adminWorkbenchLocaleMessagesPaths) {
      const relativeFile = `${relativePath}.json`;
      const englishKeys = flattenKeys(
        JSON.parse(
          fs.readFileSync(path.join(englishRoot, relativeFile), 'utf8')
        )
      ).sort();

      for (const locale of adminWorkbenchLocales) {
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
