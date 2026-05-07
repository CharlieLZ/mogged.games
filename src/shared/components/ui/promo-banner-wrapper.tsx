'use client';

import { useEffect, useState } from 'react';

import { PromoBanner } from './promo-banner';
import {
  claimPromoBannerFirstVisit,
  markPromoBannerSeen,
} from './promo-banner.storage';
import { PROMO_BANNER_POPOVER_DURATION_MS } from '@/shared/lib/viewer-quota';

interface PromoBannerWrapperProps {
  quotaLabel: string;
  quotaSuffix?: string;
  popoverTitle: string;
  popoverBody: string;
  popoverFooter: string;
  quotaTotal: number;
  className?: string;
  popoverAlign?: 'start' | 'center' | 'end';
}

const normalizeQuotaTotal = (quotaTotal: number) => {
  const roundedQuotaTotal = Math.round(quotaTotal);

  if (!Number.isFinite(roundedQuotaTotal) || roundedQuotaTotal <= 0) {
    return 0;
  }

  return roundedQuotaTotal;
};

export function PromoBannerWrapper({
  quotaLabel,
  quotaSuffix,
  popoverTitle,
  popoverBody,
  popoverFooter,
  quotaTotal,
  className,
  popoverAlign = 'end',
}: PromoBannerWrapperProps) {
  const [showPopover, setShowPopover] = useState(false);

  const normalizedQuotaTotal = normalizeQuotaTotal(quotaTotal);

  const quotaCurrent =
    normalizedQuotaTotal <= 0
      ? 0
      : normalizedQuotaTotal;

  useEffect(() => {
    if (normalizedQuotaTotal <= 0) {
      setShowPopover(false);
      return;
    }

    if (!claimPromoBannerFirstVisit()) {
      setShowPopover(false);
      return;
    }

    setShowPopover(true);

    const timer = window.setTimeout(() => {
      markPromoBannerSeen();
      setShowPopover(false);
    }, PROMO_BANNER_POPOVER_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [normalizedQuotaTotal]);

  if (normalizedQuotaTotal <= 0) {
    return null;
  }

  return (
    <PromoBanner
      quotaLabel={quotaLabel}
      quotaSuffix={quotaSuffix}
      quotaCurrent={quotaCurrent}
      quotaTotal={normalizedQuotaTotal}
      popoverTitle={popoverTitle}
      popoverBody={popoverBody}
      popoverFooter={popoverFooter}
      showPopover={showPopover}
      className={className}
      popoverAlign={popoverAlign}
    />
  );
}
