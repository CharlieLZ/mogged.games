import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { LocaleDetector } from '@/shared/blocks/common/locale-detector';
import {
  getRepositoryUrl,
  getSupportMailto,
  replaceBrandTokensDeep,
} from '@/shared/lib/brand';
import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';
import Layout from '@/themes/default/layouts/landing';

export default async function LandingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // load page data
  const t = await getTranslations('landing');

  // header and footer to display
  const header = replaceBrandTokensDeep(t.raw('header')) as HeaderType;
  const footer = replaceBrandTokensDeep(t.raw('footer')) as FooterType;

  if (footer.social?.items) {
    footer.social.items = footer.social.items.map((item) => {
      if (item.icon === 'Github') {
        return { ...item, url: getRepositoryUrl() };
      }

      if (item.icon === 'Mail') {
        return { ...item, url: getSupportMailto() };
      }

      return {
        ...item,
        url: item.url,
      };
    });
  }

  const { locale } = await params;

  return (
    <Layout key={locale} header={header} footer={footer}>
      <LocaleDetector />
      {children}
    </Layout>
  );
}
