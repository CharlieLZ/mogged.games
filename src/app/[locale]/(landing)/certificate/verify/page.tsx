import {
  AlertTriangle,
  BadgeCheck,
  CalendarRange,
  ExternalLink,
  FileBadge2,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  getSupportEmail,
  replaceBrandTokens,
  replaceBrandTokensDeep,
} from '@/shared/lib/brand';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { getMetadata } from '@/shared/lib/seo';
import { cn } from '@/shared/lib/utils';
import {
  formatBusinessCertificateDisplayDate,
  getBusinessCertificateCurrentState,
  verifyBusinessCertificateVerificationToken,
} from '@/shared/services/business-certificate';

export const generateMetadata = getMetadata({
  metadataKey: 'certificate.verify.metadata',
  canonicalUrl: '/certificate/verify',
  noIndex: true,
});

type VerifyCopy = {
  title: string;
  description: string;
  support_text: string;
  badges: {
    valid: string;
    expired: string;
    invalid: string;
  };
  states: {
    valid: string;
    expired: string;
    invalid: string;
  };
  fields: {
    certificate_id: string;
    holder: string;
    plan: string;
    email: string;
    subscription_reference: string;
    issued_on: string;
    valid_from: string;
    valid_until: string;
    issuer: string;
  };
  actions: {
    pricing: string;
    support: string;
  };
};

export default async function CertificateVerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('certificate');
  const copy = replaceBrandTokensDeep(t.raw('verify')) as VerifyCopy;
  const supportEmail = getSupportEmail();
  const verification = token
    ? verifyBusinessCertificateVerificationToken(token)
    : null;
  const currentState = verification
    ? getBusinessCertificateCurrentState({
        validUntil: verification.validUntil,
      })
    : null;
  const isExpired = currentState === 'expired';
  const isValid = Boolean(verification);
  const badgeText = !isValid
    ? copy.badges.invalid
    : isExpired
      ? copy.badges.expired
      : copy.badges.valid;
  const stateText = !isValid
    ? copy.states.invalid
    : isExpired
      ? copy.states.expired
      : copy.states.valid;

  const detailItems = verification
    ? [
        {
          icon: FileBadge2,
          label: copy.fields.certificate_id,
          value: verification.certificateId,
        },
        {
          icon: BadgeCheck,
          label: copy.fields.holder,
          value: verification.holderName,
        },
        {
          icon: BadgeCheck,
          label: copy.fields.plan,
          value: verification.planName,
        },
        {
          icon: Mail,
          label: copy.fields.email,
          value: verification.maskedEmail,
        },
        {
          icon: FileBadge2,
          label: copy.fields.subscription_reference,
          value: verification.subscriptionReference,
        },
        {
          icon: CalendarRange,
          label: copy.fields.issued_on,
          value: formatBusinessCertificateDisplayDate(
            verification.issuedOn,
            verification.locale
          ),
        },
        {
          icon: CalendarRange,
          label: copy.fields.valid_from,
          value: formatBusinessCertificateDisplayDate(
            verification.validFrom,
            verification.locale
          ),
        },
        {
          icon: CalendarRange,
          label: copy.fields.valid_until,
          value: formatBusinessCertificateDisplayDate(
            verification.validUntil,
            verification.locale
          ),
        },
        {
          icon: ExternalLink,
          label: copy.fields.issuer,
          value: `${verification.issuerName} · ${verification.issuerDomain}`,
        },
      ]
    : [];

  return (
    <div className="bg-background min-h-screen">
      <section className="from-primary/10 via-background to-secondary/10 border-b bg-linear-to-br">
        <div className="container max-w-5xl py-8 md:py-10">
          <div className="mx-auto max-w-6xl space-y-3 text-center">
            <Badge variant={isValid && !isExpired ? 'default' : 'outline'}>
              {isValid && !isExpired ? (
                <BadgeCheck className="size-4" />
              ) : (
                <ShieldAlert className="size-4" />
              )}
              <span>{badgeText}</span>
            </Badge>
            <div className="space-y-3">
              <h1 className={publicPageTypography.pageHeaderTitle}>
                {copy.title}
              </h1>
              <p
                className={cn(
                  'text-muted-foreground',
                  publicPageTypography.pageHeaderDescription
                )}
              >
                {replaceBrandTokens(copy.description)}
              </p>
              <p className="text-foreground/90 text-sm md:text-base">
                {replaceBrandTokens(stateText)}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/pricing">{copy.actions.pricing}</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={`mailto:${supportEmail}`}>{copy.actions.support}</a>
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              {replaceBrandTokens(copy.support_text)}{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="text-primary font-medium hover:underline"
              >
                {supportEmail}
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="container max-w-5xl py-10 md:py-14">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-start gap-3">
              {isValid ? (
                <BadgeCheck className="text-primary mt-0.5 size-5 shrink-0" />
              ) : (
                <AlertTriangle className="text-muted-foreground mt-0.5 size-5 shrink-0" />
              )}
              <div className="space-y-1">
                <CardTitle>{badgeText}</CardTitle>
                <CardDescription>
                  {replaceBrandTokens(stateText)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="py-6">
            {verification ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {detailItems.map((item) => (
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
            ) : (
              <div className="bg-muted/20 rounded-xl border p-5 text-sm">
                {replaceBrandTokens(stateText)}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
