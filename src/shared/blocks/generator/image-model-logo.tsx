import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import {
  SiAlibabacloud,
  SiBytedance,
  SiFlux,
  SiGoogle,
  SiOpenai,
  SiX,
} from 'react-icons/si';

import { cn } from '@/shared/lib/utils';

import type { ImageModelBrand } from './image-generator-config';

type ImageModelLogoProps = ComponentPropsWithoutRef<'span'> & {
  brand: ImageModelBrand;
};

function IdeogramLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
    >
      <circle cx="12" cy="5" r="2.5" fill="currentColor" />
      <rect x="10" y="9" width="4" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}

function ZaiLogo() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
    >
      <path
        d="M20.1312 7.50002L17.4088 11.1913H5.81625L8.5375 7.50002H20.1325H20.1312ZM34.0675 28.81L31.3475 32.5H19.795L22.5125 28.81H34.0675ZM35 7.50002L16.58 32.5H5L23.42 7.50002H35Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ImageModelLogo({
  brand,
  className,
  ...props
}: ImageModelLogoProps) {
  let content: ReactNode;
  let colorClassName = 'text-foreground';

  switch (brand) {
    case 'google':
      content = <SiGoogle className="h-4 w-4" />;
      colorClassName = 'text-[#4285F4]';
      break;
    case 'openai':
      content = <SiOpenai className="h-4 w-4" />;
      colorClassName = 'text-foreground';
      break;
    case 'bytedance':
      content = <SiBytedance className="h-4 w-4" />;
      colorClassName = 'text-[#2B6FF7]';
      break;
    case 'flux':
      content = <SiFlux className="h-4 w-4" />;
      colorClassName = 'text-[#111827]';
      break;
    case 'xai':
      content = <SiX className="h-4 w-4" />;
      colorClassName = 'text-foreground';
      break;
    case 'ideogram':
      content = <IdeogramLogo />;
      colorClassName = 'text-[#2563EB]';
      break;
    case 'alibaba':
      content = <SiAlibabacloud className="h-4 w-4" />;
      colorClassName = 'text-[#FF6A00]';
      break;
    case 'zai':
      content = <ZaiLogo />;
      colorClassName = 'text-[#111827]';
      break;
  }

  return (
    <span
      {...props}
      aria-hidden="true"
      data-model-brand={brand}
      className={cn(
        'flex items-center justify-center',
        colorClassName,
        className
      )}
    >
      {content}
    </span>
  );
}
