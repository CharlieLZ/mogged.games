import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { isExternalHref } from '@/shared/lib/support-link';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function Copyright({ brand }: { brand: BrandType }) {
  const currentYear = new Date().getFullYear();
  const href = brand?.url || envConfigs.app_url;
  const linkTitle = brand?.title || envConfigs.app_name;
  const target = brand?.target || undefined;

  return (
    <div className={`text-muted-foreground text-sm`}>
      © {currentYear}{' '}
      {isExternalHref(href) ? (
        <a
          href={href}
          target={target}
          className="text-primary hover:text-primary/80 cursor-pointer"
        >
          {linkTitle}
        </a>
      ) : (
        <Link
          href={href}
          target={target}
          className="text-primary hover:text-primary/80 cursor-pointer"
        >
          {linkTitle}
        </Link>
      )}
      , All rights reserved
    </div>
  );
}
