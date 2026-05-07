import { type Benefits as BenefitsType } from '@/shared/types/blocks/landing';

import { BenefitsReviewCarousel } from './benefits-review-carousel';

export function BenefitsReviewCarouselShell({
  benefits,
  className,
}: {
  benefits: BenefitsType;
  className?: string;
}) {
  return <BenefitsReviewCarousel benefits={benefits} className={className} />;
}
