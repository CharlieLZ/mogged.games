import { CSSProperties, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { SkipLink } from '@/shared/components/ui/skip-link';
import { replaceBrandTokens } from '@/shared/lib/brand';
import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';
import { Footer } from '@/themes/default/blocks/footer';
import { Header } from '@/themes/default/blocks/header';

export default async function LandingLayout({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: HeaderType;
  footer: FooterType;
}) {
  const t = await getTranslations('landing');
  const skipToContentLabel = replaceBrandTokens(
    (t.raw('skip_to_content') as string) ?? 'Skip to main content'
  );

  return (
    <div
      data-slot="landing-shell"
      className="min-h-screen w-full"
      style={
        {
          '--landing-header-height': '4.5rem',
          '--landing-header-height-mobile': '3.5rem',
          '--landing-page-top-space': '2.5rem',
          '--landing-page-top-space-mobile': '1.5rem',
        } as CSSProperties
      }
    >
      <SkipLink href="#main-content">{skipToContentLabel}</SkipLink>
      <Header header={header} />
      <main
        id="main-content"
        tabIndex={-1}
        className="scroll-mt-[calc(var(--landing-header-height-mobile)+1rem)] pt-[var(--landing-header-height-mobile)] focus:outline-none md:scroll-mt-[calc(var(--landing-header-height)+1rem)] md:pt-[var(--landing-header-height)]"
      >
        {children}
      </main>
      <Footer footer={footer} />
    </div>
  );
}
