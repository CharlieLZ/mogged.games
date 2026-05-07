import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  adminWorkbenchLocaleMessagesPaths,
  adminWorkbenchLocales,
  backlogAdminWorkbenchLocales,
  backlogPublicSiteLocales,
  defaultLocale,
  backlogUserWorkbenchLocales,
  localeCatalog,
  locales,
  plannedAdminWorkbenchLocales,
  plannedPublicSiteLocales,
  plannedUserWorkbenchLocales,
  publicLocaleMessagesPaths,
  publicSiteLocales,
  userWorkbenchLocaleMessagesPaths,
  userWorkbenchLocales,
} from '../src/config/locale';

type AuditIssue = {
  locale: string;
  message: string;
};

const STRICT_LIVE = process.argv.includes('--strict-live');
const ROOT_DIR = process.cwd();
const LOCALE_MESSAGES_DIR = path.join(ROOT_DIR, 'src/config/locale/messages');
const CONTENT_PAGES_DIR = path.join(ROOT_DIR, 'content/pages');

function countLeaves(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countLeaves(item), 0);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).reduce(
      (sum, item) => sum + countLeaves(item),
      0
    );
  }

  return 1;
}

function readJsonFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function getMessageFilePath(locale: string, namespace: string) {
  return path.join(LOCALE_MESSAGES_DIR, locale, `${namespace}.json`);
}

function getPublicContentSlugs() {
  return readdirSync(CONTENT_PAGES_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .filter((file) => !/\.[a-z]{2}\.mdx$/.test(file))
    .map((file) => file.replace(/\.mdx$/, ''))
    .sort();
}

function getLocalizedContentFilePath(locale: string, slug: string) {
  return locale === defaultLocale
    ? path.join(CONTENT_PAGES_DIR, `${slug}.mdx`)
    : path.join(CONTENT_PAGES_DIR, `${slug}.${locale}.mdx`);
}

function formatLocaleSummary(locale: string) {
  const definition = localeCatalog[locale as keyof typeof localeCatalog];
  return `${locale} (${definition.englishName} / ${definition.nativeName})`;
}

function loadLeafCounts(
  locale: string,
  namespaces: readonly string[]
): {
  missingNamespaces: string[];
  mismatchedNamespaces: string[];
  namespaceLeafCount: number;
} {
  const missingNamespaces: string[] = [];
  const mismatchedNamespaces: string[] = [];
  let namespaceLeafCount = 0;

  for (const namespace of namespaces) {
    const filePath = getMessageFilePath(locale, namespace);

    if (!existsSync(filePath)) {
      missingNamespaces.push(namespace);
      continue;
    }

    const leafCount = countLeaves(readJsonFile(filePath));
    namespaceLeafCount += leafCount;

    const defaultLeafCount = countLeaves(
      readJsonFile(getMessageFilePath(defaultLocale, namespace))
    );

    if (leafCount !== defaultLeafCount) {
      mismatchedNamespaces.push(`${namespace} (${leafCount}/${defaultLeafCount})`);
    }
  }

  return {
    missingNamespaces,
    mismatchedNamespaces,
    namespaceLeafCount,
  };
}

function main() {
  const publicContentSlugs = getPublicContentSlugs();
  const issues: AuditIssue[] = [];

  console.log('[i18n-report] locale rollout');
  console.log(`- public live: ${publicSiteLocales.join(', ')}`);
  console.log(`- public planned: ${plannedPublicSiteLocales.join(', ')}`);
  console.log(`- public backlog: ${backlogPublicSiteLocales.join(', ')}`);
  console.log(`- user workbench live: ${userWorkbenchLocales.join(', ')}`);
  console.log(
    `- user workbench planned: ${plannedUserWorkbenchLocales.join(', ')}`
  );
  console.log(
    `- user workbench backlog: ${backlogUserWorkbenchLocales.join(', ')}`
  );
  console.log(`- admin workbench live: ${adminWorkbenchLocales.join(', ')}`);
  console.log(
    `- admin workbench planned: ${plannedAdminWorkbenchLocales.join(', ')}`
  );
  console.log(
    `- admin workbench backlog: ${backlogAdminWorkbenchLocales.join(', ')}`
  );
  console.log('');

  for (const locale of locales) {
    const definition = localeCatalog[locale];
    const publicMessages = loadLeafCounts(locale, publicLocaleMessagesPaths);
    const userWorkbenchMessages = loadLeafCounts(
      locale,
      userWorkbenchLocaleMessagesPaths
    );
    const adminWorkbenchMessages = loadLeafCounts(
      locale,
      adminWorkbenchLocaleMessagesPaths
    );

    const missingContentPages = publicContentSlugs.filter(
      (slug) => !existsSync(getLocalizedContentFilePath(locale, slug))
    );

    console.log(`- ${formatLocaleSummary(locale)}`);
    console.log(
      `  public=${definition.publicSite} user_workbench=${definition.userWorkbench} admin_workbench=${definition.adminWorkbench} rtl=${definition.rtl ? 'yes' : 'no'}`
    );
    console.log(
      `  public_messages=${publicMessages.namespaceLeafCount} user_workbench_messages=${userWorkbenchMessages.namespaceLeafCount} admin_workbench_messages=${adminWorkbenchMessages.namespaceLeafCount} content_pages=${publicContentSlugs.length - missingContentPages.length}/${publicContentSlugs.length}`
    );

    if (publicMessages.missingNamespaces.length > 0) {
      console.log(
        `  missing_public_messages=${publicMessages.missingNamespaces.join(', ')}`
      );
    }

    if (publicMessages.mismatchedNamespaces.length > 0) {
      console.log(
        `  mismatched_public_message_keys=${publicMessages.mismatchedNamespaces.join(', ')}`
      );
    }

    if (userWorkbenchMessages.missingNamespaces.length > 0) {
      console.log(
        `  missing_user_workbench_messages=${userWorkbenchMessages.missingNamespaces.join(', ')}`
      );
    }

    if (userWorkbenchMessages.mismatchedNamespaces.length > 0) {
      console.log(
        `  mismatched_user_workbench_message_keys=${userWorkbenchMessages.mismatchedNamespaces.join(', ')}`
      );
    }

    if (adminWorkbenchMessages.missingNamespaces.length > 0) {
      console.log(
        `  missing_admin_workbench_messages=${adminWorkbenchMessages.missingNamespaces.join(', ')}`
      );
    }

    if (adminWorkbenchMessages.mismatchedNamespaces.length > 0) {
      console.log(
        `  mismatched_admin_workbench_message_keys=${adminWorkbenchMessages.mismatchedNamespaces.join(', ')}`
      );
    }

    if (missingContentPages.length > 0) {
      console.log(`  missing_content_pages=${missingContentPages.join(', ')}`);
    }

    if (definition.publicSite === 'live') {
      if (publicMessages.missingNamespaces.length > 0) {
        issues.push({
          locale,
          message: `missing live public message files: ${publicMessages.missingNamespaces.join(', ')}`,
        });
      }

      if (publicMessages.mismatchedNamespaces.length > 0) {
        issues.push({
          locale,
          message: `live public message key counts drifted: ${publicMessages.mismatchedNamespaces.join(', ')}`,
        });
      }

      if (missingContentPages.length > 0) {
        issues.push({
          locale,
          message: `missing live public content pages: ${missingContentPages.join(', ')}`,
        });
      }
    }

    if (definition.userWorkbench === 'live') {
      if (userWorkbenchMessages.missingNamespaces.length > 0) {
        issues.push({
          locale,
          message: `missing live user workbench message files: ${userWorkbenchMessages.missingNamespaces.join(', ')}`,
        });
      }

      if (userWorkbenchMessages.mismatchedNamespaces.length > 0) {
        issues.push({
          locale,
          message: `live user workbench message key counts drifted: ${userWorkbenchMessages.mismatchedNamespaces.join(', ')}`,
        });
      }
    }

    if (definition.adminWorkbench === 'live') {
      if (adminWorkbenchMessages.missingNamespaces.length > 0) {
        issues.push({
          locale,
          message: `missing live admin workbench message files: ${adminWorkbenchMessages.missingNamespaces.join(', ')}`,
        });
      }

      if (adminWorkbenchMessages.mismatchedNamespaces.length > 0) {
        issues.push({
          locale,
          message: `live admin workbench message key counts drifted: ${adminWorkbenchMessages.mismatchedNamespaces.join(', ')}`,
        });
      }
    }

    console.log('');
  }

  if (issues.length === 0) {
    console.log('[i18n-report] live locale verification passed');
    return;
  }

  console.log('[i18n-report] live locale verification found issues');
  for (const issue of issues) {
    console.log(`- ${issue.locale}: ${issue.message}`);
  }

  if (STRICT_LIVE) {
    process.exitCode = 1;
  }
}

main();
