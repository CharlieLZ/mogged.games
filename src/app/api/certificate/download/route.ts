import { NextRequest } from 'next/server';

import { getAppDomain, getAppName } from '@/shared/lib/brand';
import { getCurrentYearlySubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/services/current-user';
import {
  AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE,
  getAutomatedBusinessCertificateEligibility,
} from '@/shared/services/business-certificate-automation';
import {
  buildBusinessCertificateFileName,
  getBusinessCertificateAccess,
  normalizeBusinessCertificateLocale,
} from '@/shared/services/business-certificate';
import {
  getBusinessCertificateExtraCopy,
  getBusinessCertificateMessages,
} from '@/shared/services/business-certificate-copy';
import { renderBusinessCertificatePdf } from '@/shared/services/business-certificate-pdf';
import { buildBusinessCertificatePayload } from '@/shared/services/business-certificate-record';
import { getLocalizedPricingDisplayName } from '@/shared/services/pricing';

export async function GET(request: NextRequest) {
  const locale = normalizeBusinessCertificateLocale(
    request.nextUrl.searchParams.get('locale')
  );
  const certificateCopy = getBusinessCertificateMessages(locale);
  const extraCopy = getBusinessCertificateExtraCopy(locale);

  try {
    const user = await getUserInfo();
    if (!user) {
      return new Response(extraCopy.signInRequired, {
        status: 401,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'private, no-store',
        },
      });
    }

    const yearlySubscription = await getCurrentYearlySubscription(user.id);
    const certificateAccess = getBusinessCertificateAccess(yearlySubscription);

    if (!certificateAccess.eligible || !yearlySubscription) {
      return new Response(certificateCopy.page.states.locked, {
        status: 403,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'private, no-store',
        },
      });
    }

    const automatedCertificateEligibility =
      getAutomatedBusinessCertificateEligibility({
        holderName: user.name,
      });

    if (!automatedCertificateEligibility.eligible) {
      return new Response(extraCopy.manualReviewApiMessage, {
        status: 409,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'private, no-store',
        },
      });
    }

    const planName = await getLocalizedPricingDisplayName({
      locale: AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE,
      productId: yearlySubscription.productId,
      fallback:
        yearlySubscription.planName || yearlySubscription.productName || '',
    });
    const payload = buildBusinessCertificatePayload({
      locale: AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE,
      user,
      subscription: yearlySubscription,
      planName,
      issuerName: getAppName(),
      issuerDomain: getAppDomain(),
    });
    const pdfBytes = Uint8Array.from(await renderBusinessCertificatePdf(payload));
    const pdfDocument = new Blob([pdfBytes], {
      type: 'application/pdf',
    });
    const fileName = buildBusinessCertificateFileName({
      locale: AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE,
      subscriptionNo: yearlySubscription.subscriptionNo,
    });

    return new Response(pdfDocument, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${fileName}"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[business-certificate/download] failed', {
      locale,
      step: 'download-pdf',
      error,
    });

    return new Response(certificateCopy.page.states.unavailable, {
      status: 500,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'private, no-store',
      },
    });
  }
}
