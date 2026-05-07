'use client';

import { LazyLoadImage } from 'react-lazy-load-image-component';

import 'react-lazy-load-image-component/src/effects/blur.css';

export function LazyImage({
  src,
  alt,
  className,
  wrapperClassName,
  width,
  height,
  placeholderSrc,
}: {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  width?: number;
  height?: number;
  placeholderSrc?: string;
}) {
  return (
    <LazyLoadImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      effect="blur" // 支持 blur、opacity 等
      placeholderSrc={placeholderSrc} // 可选
      className={className}
      wrapperClassName={wrapperClassName}
    />
  );
}
