import {
  BadgeCheck,
  CalendarRange,
  ExternalLink,
  FileBadge2,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { resolveAppLocale } from '@/config/locale';
import { Empty } from '@/shared/blocks/common/empty';
import { ConsoleLayout } from '@/shared/blocks/console/layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  getAppDomain,
  getAppName,
  getSupportEmail,
  replaceBrandTokens,
  replaceBrandTokensDeep,
} from '@/shared/lib/brand';
import { getMetadata } from '@/shared/lib/seo';
import {
  getCurrentSubscription,
  getCurrentYearlySubscription,
} from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/services/current-user';
import {
  AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE,
  getAutomatedBusinessCertificateEligibility,
} from '@/shared/services/business-certificate-automation';
import {
  buildBusinessCertificateDownloadHref,
  formatBusinessCertificateDisplayDate,
  getBusinessCertificateAccess,
  normalizeBusinessCertificateLocale,
} from '@/shared/services/business-certificate';
import { getBusinessCertificateExtraCopy } from '@/shared/services/business-certificate-copy';
import { buildBusinessCertificatePayload } from '@/shared/services/business-certificate-record';
import { getLocalizedPricingDisplayName } from '@/shared/services/pricing';
import { Nav } from '@/shared/types/blocks/common';

export const generateMetadata = getMetadata({
  metadataKey: 'certificate.metadata',
  canonicalUrl: '/certificate',
  noIndex: true,
});

type CertificateCopy = {
  title: string;
  description: string;
  support_text: string;
  badges: {
    required: string;
    active: string;
    unavailable: string;
  };
  states: {
    locked: string;
    eligible: string;
    unavailable: string;
  };
  overview: {
    title: string;
    description: string;
    yearly_plan_required: string;
    current_plan: string;
    status: string;
    valid_until: string;
    subscription_no: string;
    certificate_id: string;
    issued_on: string;
    verification_url: string;
  };
  details: {
    title: string;
    verification_hint: string;
  };
  benefits: {
    title: string;
    items: string[];
  };
  actions: {
    upgrade: string;
    download: string;
    verify: string;
  };
  statuses: Record<string, string>;
};

function getDisplayStatus(
  status: string | null | undefined,
  copy: CertificateCopy['statuses']
) {
  if (!status) {
    return copy.unknown || '-';
  }

  return copy[status] || copy[status.toLowerCase()] || status;
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveAppLocale(rawLocale);
  setRequestLocale(locale);
  const certificateLocale = normalizeBusinessCertificateLocale(locale);

  const [certificateT, settingsT] = await Promise.all([
    getTranslations('certificate'),
    getTranslations('settings.sidebar'),
  ]);
  const copy = replaceBrandTokensDeep(
    certificateT.raw('page')
  ) as CertificateCopy;
  const settingsNav = replaceBrandTokensDeep(settingsT.raw('nav')) as Nav;
  const rawTopNav = replaceBrandTokensDeep(settingsT.raw('top_nav')) as Nav;
  const topNav = {
    ...rawTopNav,
    items: rawTopNav.items.map((item) => ({
      ...item,
      is_active: item.url === '/settings' ? true : item.is_active,
    })),
  };

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  let latestSubscription = null;
  let yearlySubscription = null;
  let displayedSubscription = null;
  let displayedPlanName = '-';
  let automatedCertificatePlanName = '-';
  let certificatePreview: ReturnType<
    typeof buildBusinessCertificatePayload
  > | null = null;
  let subscriptionLookupFailed = false;
  let certificatePreviewFailed = false;

  try {
    [latestSubscription, yearlySubscription] = await Promise.all([
      getCurrentSubscription(user.id),
      getCurrentYearlySubscription(user.id),
    ]);
    displayedSubscription = yearlySubscription || latestSubscription;

    if (displayedSubscription) {
      const pricingNameFallback =
        displayedSubscription.planName ||
        displayedSubscription.productName ||
        '-';
      const [localizedPlanName, englishPlanName] = await Promise.all([
        getLocalizedPricingDisplayName({
          locale,
          productId: displayedSubscription.productId,
          fallback: pricingNameFallback,
        }),
        getLocalizedPricingDisplayName({
          locale: AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE,
          productId: displayedSubscription.productId,
          fallback: pricingNameFallback,
        }),
      ]);

      displayedPlanName = localizedPlanName;
      automatedCertificatePlanName = englishPlanName;
    }
  } catch (error) {
    subscriptionLookupFailed = true;
    console.error('[certificate/page] failed to load subscription', {
      userId: user.id,
      locale,
      step: 'load-certificate-subscription',
      error,
    });
  }

  const yearlyAccess = getBusinessCertificateAccess(yearlySubscription);
  const extraCopy = getBusinessCertificateExtraCopy(certificateLocale);
  const automatedCertificateEligibility =
    getAutomatedBusinessCertificateEligibility({
      holderName: user.name,
    });
  const requiresManualIssuance = Boolean(
    yearlyAccess.eligible && !automatedCertificateEligibility.eligible
  );

  if (
    !subscriptionLookupFailed &&
    yearlyAccess.eligible &&
    automatedCertificateEligibility.eligible &&
    yearlySubscription
  ) {
    try {
      certificatePreview = buildBusinessCertificatePayload({
        locale: AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE,
        user,
        subscription: yearlySubscription,
        planName: automatedCertificatePlanName,
        issuerName: getAppName(),
        issuerDomain: getAppDomain(),
      });
    } catch (error) {
      certificatePreviewFailed = true;
      console.error('[certificate/page] failed to build preview', {
        userId: user.id,
        locale,
        step: 'build-certificate-preview',
        subscriptionNo: yearlySubscription.subscriptionNo,
        error,
      });
    }
  }

  const isEligible = Boolean(yearlyAccess.eligible && certificatePreview);
  const isUnavailable = subscriptionLookupFailed || certificatePreviewFailed;
  const statusBadge = isUnavailable
    ? copy.badges.unavailable
    : requiresManualIssuance
      ? extraCopy.manualReviewBadge
    : isEligible
      ? copy.badges.active
      : copy.badges.required;
  const statusMessage = isUnavailable
    ? copy.states.unavailable
    : requiresManualIssuance
      ? extraCopy.manualReviewDescription
    : isEligible
      ? copy.states.eligible
      : copy.states.locked;
  const downloadHref = buildBusinessCertificateDownloadHref(certificateLocale);
  const supportEmail = getSupportEmail();

  const summaryItems = [
    {
      icon: WalletCards,
      label: copy.overview.current_plan,
      value: displayedPlanName,
    },
    {
      icon: ShieldCheck,
      label: copy.overview.status,
      value: isUnavailable
        ? statusBadge
        : getDisplayStatus(displayedSubscription?.status, copy.statuses),
    },
    {
      icon: CalendarRange,
      label: copy.overview.valid_until,
      value: displayedSubscription?.currentPeriodEnd
        ? formatBusinessCertificateDisplayDate(
            displayedSubscription.currentPeriodEnd,
            certificateLocale
          )
        : '-',
    },
    {
      icon: FileBadge2,
      label: copy.overview.subscription_no,
      value: displayedSubscription?.subscriptionNo || '-',
    },
  ];

  const previewItems = certificatePreview
    ? [
        {
          label: copy.overview.certificate_id,
          value: certificatePreview.certificateId,
        },
        {
          label: copy.overview.issued_on,
          value: formatBusinessCertificateDisplayDate(
            certificatePreview.issuedOn,
            certificatePreview.locale
          ),
        },
        {
          label: copy.overview.verification_url,
          value: certificatePreview.verificationUrl,
        },
      ]
    : [];

  return (
    <ConsoleLayout
      title={copy.title}
      nav={settingsNav}
      topNav={topNav}
      supportText={replaceBrandTokens(copy.support_text)}
      supportEmail={supportEmail}
      className="py-16 md:py-20"
    >
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30 gap-4 border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Badge variant={isUnavailable ? 'outline' : 'secondary'}>
                  <BadgeCheck className="size-4" />
                  <span>{statusBadge}</span>
                </Badge>
                <div className="space-y-2">
                  <CardTitle className="text-2xl md:text-3xl">
                    {copy.overview.title}
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-sm md:text-base">
                    {copy.description}
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isEligible ? (
                  <>
                    <Button asChild>
                      <a href={downloadHref} download>
                        <FileBadge2 />
                        {copy.actions.download}
                      </a>
                    </Button>
                    {certificatePreview && (
                      <Button variant="outline" asChild>
                        <a
                          href={certificatePreview.verificationUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink />
                          {copy.actions.verify}
                        </a>
                      </Button>
                    )}
                  </>
                ) : requiresManualIssuance ? (
                  <Button variant="outline" asChild>
                    <a href={`mailto:${supportEmail}`}>
                      <ShieldCheck />
                      {extraCopy.manualReviewAction}
                    </a>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/pricing">
                      <ShieldCheck />
                      {copy.actions.upgrade}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-6 py-6 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="space-y-4">
              <div className="bg-background rounded-xl border p-4">
                <p className="text-foreground text-lg font-semibold">
                  {isUnavailable
                    ? copy.badges.unavailable
                    : isEligible
                      ? copy.badges.active
                      : copy.overview.yearly_plan_required}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {statusMessage}
                </p>
                {(isEligible || requiresManualIssuance) && (
                  <div className="text-muted-foreground mt-4 space-y-2 text-sm">
                    <p>{extraCopy.automatedPdfLanguageNote}</p>
                    <p>{extraCopy.automatedLatinNameNote}</p>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {summaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="bg-muted/20 rounded-xl border p-4"
                  >
                    <div className="text-muted-foreground flex items-center gap-2 text-xs tracking-wide uppercase">
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </div>
                    <div className="mt-3 text-sm font-medium break-all">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {certificatePreview && (
                <div className="bg-background rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <FileBadge2 className="size-5" />
                    <span>{copy.details.title}</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {previewItems.map((item) => (
                      <div
                        key={item.label}
                        className="bg-muted/20 rounded-xl border p-4"
                      >
                        <div className="text-muted-foreground text-xs tracking-wide uppercase">
                          {item.label}
                        </div>
                        <div className="mt-3 text-sm font-medium break-all">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-4 text-sm">
                    {copy.details.verification_hint}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-muted/20 rounded-xl border p-5">
              <div className="flex items-center gap-2 text-base font-semibold">
                <ShieldCheck className="size-5" />
                <span>{copy.benefits.title}</span>
              </div>
              <ul className="mt-4 space-y-3">
                {copy.benefits.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <BadgeCheck className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/20 border-t py-4">
            <p className="text-muted-foreground text-sm">
              {isEligible
                ? replaceBrandTokens(copy.overview.description)
                : requiresManualIssuance
                  ? extraCopy.manualReviewDescription
                : statusMessage}
            </p>
          </CardFooter>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
