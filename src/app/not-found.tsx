import Image from 'next/image';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

import { defaultLocale } from '@/config/locale';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import { getCommonCopy } from '@/shared/lib/common-copy';
import { SITE_LOGO_PATH } from '@/shared/lib/site-icons';

export default async function NotFoundPage() {
  const locale = await getLocale();
  const copy = getCommonCopy(locale).system_pages.not_found;
  const homeHref = locale === defaultLocale ? '/' : `/${locale}`;

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <Image src={SITE_LOGO_PATH} alt="mogged" width={80} height={80} />
      <h1 className="text-2xl font-normal">{copy.title}</h1>
      <Button asChild>
        <Link href={homeHref} className="mt-4">
          <SmartIcon name="ArrowLeft" />
          <span>{copy.back_home}</span>
        </Link>
      </Button>
    </div>
  );
}
