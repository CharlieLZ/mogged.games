import Image from 'next/image';

import { Link } from '@/core/i18n/navigation';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function BrandLogo({ brand }: { brand: BrandType }) {
  return (
    <Link
      href={brand.url || ''}
      target={brand.target || '_self'}
      className={`flex items-center space-x-2 ${brand.className}`}
    >
      {brand.logo && (
        <Image
          src={brand.logo.src}
          alt={brand.logo.alt || ''}
          width={36}
          height={36}
          priority
          className="h-9 w-9 shrink-0"
        />
      )}
      {brand.title && (
        <span className="truncate text-lg font-medium">{brand.title}</span>
      )}
    </Link>
  );
}
