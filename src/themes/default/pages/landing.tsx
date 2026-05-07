import { NextIntlClientProvider } from 'next-intl';

import { PageHeader } from '@/shared/blocks/common/page-header';
import { ImageGeneratorShowcaseStack } from '@/shared/blocks/generator/image-generator-showcase-stack';
import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';
import { type Landing } from '@/shared/types/blocks/landing';
import { FAQ } from '@/themes/default/blocks/faq';
import { Features } from '@/themes/default/blocks/features';
import { FeaturesStep } from '@/themes/default/blocks/features-step';
import { GptImageComparisonShowcase } from '@/themes/default/blocks/gpt-image-comparison-showcase';
import { HomeFinalCTA } from '@/themes/default/blocks/home-final-cta';
import { LandingImageWorkspaceShell } from '@/themes/default/blocks/landing-image-workspace-shell';
import { NanoBananaCases } from '@/themes/default/blocks/nano-banana-cases';
import { ReplacePsShowcase } from '@/themes/default/blocks/replace-ps-showcase';

type LandingImageWorkspaceMessages = Record<string, unknown>;

function LandingHeroGenerator({
  hero,
  imageWorkspaceMessages,
  locale,
  pricingPayload,
}: {
  hero?: Landing['hero'];
  imageWorkspaceMessages?: LandingImageWorkspaceMessages;
  locale?: string;
  pricingPayload?: GeneratorPricingPayload | null;
}) {
  if (!hero) return null;

  const workspace = (
    <LandingImageWorkspaceShell
      pricingPayload={pricingPayload}
      srOnlyTitle={hero.title}
    />
  );

  return (
    <section id={hero.id}>
      <PageHeader
        title={hero.title}
        description={hero.description}
        size="compact"
      />
      <div className="scroll-mt-4">
        {imageWorkspaceMessages ? (
          <NextIntlClientProvider
            locale={locale}
            messages={imageWorkspaceMessages}
          >
            {workspace}
          </NextIntlClientProvider>
        ) : (
          workspace
        )}
      </div>
    </section>
  );
}

export default async function LandingPage({
  imageWorkspaceMessages,
  locale,
  page,
  pricingPayload,
}: {
  imageWorkspaceMessages?: LandingImageWorkspaceMessages;
  locale?: string;
  page: Landing;
  pricingPayload?: GeneratorPricingPayload | null;
}) {
  return (
    <>
      <LandingHeroGenerator
        hero={page.hero}
        imageWorkspaceMessages={imageWorkspaceMessages}
        locale={locale}
        pricingPayload={pricingPayload}
      />
      <ImageGeneratorShowcaseStack />
      {page.features && <Features features={page.features} />}
      <ReplacePsShowcase locale={locale} />
      {page.usage && <FeaturesStep features={page.usage} />}
      <GptImageComparisonShowcase locale={locale} />
      {page.nano_banana_cases ? (
        <NanoBananaCases cases={page.nano_banana_cases} />
      ) : null}
      {page.faq && <FAQ faq={page.faq} />}
      {page.cta && <HomeFinalCTA cta={page.cta} className="bg-muted" />}
    </>
  );
}
