import type { Subscription } from '@/shared/models/subscription';
import { FAQ as FAQType } from '@/shared/types/blocks/landing';
import {
  Pricing as PricingType,
  PricingPageCopy,
} from '@/shared/types/blocks/pricing';
import { FAQ } from '@/themes/default/blocks/faq';
import { Pricing } from '@/themes/default/blocks/pricing';

export default async function PricingPage({
  locale: _locale,
  pricing,
  pricingPageCopy,
  currentSubscription,
  faq,
}: {
  locale?: string;
  pricing: PricingType;
  pricingPageCopy: PricingPageCopy;
  currentSubscription?: Subscription;
  faq?: FAQType;
}) {
  return (
    <>
      <Pricing
        pricing={pricing}
        pageCopy={pricingPageCopy}
        currentSubscription={currentSubscription}
      />
      {faq && <FAQ faq={faq} />}
    </>
  );
}
