'use client';

import { ImageWorkspace } from '@/shared/blocks/generator/image-workspace';
import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';

export function LandingImageWorkspaceShell({
  pricingPayload,
  srOnlyTitle,
}: {
  pricingPayload?: GeneratorPricingPayload | null;
  srOnlyTitle?: string;
}) {
  return (
    <ImageWorkspace
      defaultMode="image-to-image"
      primaryTabs="image-edit-mode"
      pricingPayload={pricingPayload}
      showSamplePreview
      srOnlyTitle={srOnlyTitle}
    />
  );
}
