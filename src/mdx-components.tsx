import React from 'react';
import Image from 'next/image';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { getLocalizedHref } from '@/core/i18n/localized-path';
import { SupportEmailLink as SharedSupportEmailLink } from '@/shared/blocks/common/support-email-link';
import { HeroMini } from '@/themes/default/blocks/hero-mini';
import { HeroFull } from '@/themes/default/blocks/hero-full';
import { getAppUrl, getSupportEmail } from '@/shared/lib/brand';

// 自定义图片组件，确保 MDX 中的图片正确渲染
const CustomImage = ({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) => {
  // 确保 src 是字符串类型
  const srcString = typeof src === 'string' ? src : '';
  if (!srcString) return null;

  // 对于本地图片，使用 Next.js Image 组件
  if (srcString.startsWith('/')) {
    return (
      <span className="block my-6">
        <Image
          src={srcString}
          alt={alt || ''}
          width={1200}
          height={675}
          className="rounded-lg w-full h-auto"
          unoptimized
        />
      </span>
    );
  }

  // 对于外部图片，使用普通 img 标签
  return (
    <span className="block my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={srcString}
        alt={alt || ''}
        className="rounded-lg w-full h-auto"
        {...props}
      />
    </span>
  );
};

function localizeSiteHref(href?: string, locale?: string) {
  if (!href || !locale) {
    return href;
  }

  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:')
  ) {
    return href;
  }

  if (href.startsWith('/')) {
    const url = new URL(href, getAppUrl());
    return getLocalizedHref({
      pathname: url.pathname,
      locale,
      search: url.search,
      hash: url.hash,
    });
  }

  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    return href;
  }

  try {
    const url = new URL(href);
    const appOrigin = new URL(getAppUrl()).origin;

    if (url.origin !== appOrigin) {
      return href;
    }

    return getLocalizedHref({
      pathname: url.pathname,
      locale,
      search: url.search,
      hash: url.hash,
    });
  } catch {
    return href;
  }
}

function createCustomLink(locale?: string) {
  return ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const localizedHref = localizeSiteHref(href, locale);
    const isExternal =
      localizedHref?.startsWith('http') || localizedHref?.startsWith('//');

    if (isExternal) {
      return (
        <a
          href={localizedHref}
          target="_blank"
          rel="nofollow noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <a href={localizedHref} {...props}>
        {children}
      </a>
    );
  };
}

const SupportEmailLink = () => {
  const email = getSupportEmail();

  return <SharedSupportEmailLink email={email}>{email}</SharedSupportEmailLink>;
};

// Higher-order component to wrap any link component with nofollow logic
export function withNoFollow(
  LinkComponent: React.ComponentType<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >,
  locale?: string
) {
  return ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const localizedHref = localizeSiteHref(href, locale);
    const isExternal =
      localizedHref?.startsWith('http') || localizedHref?.startsWith('//');

    if (isExternal) {
      return (
        <LinkComponent
          href={localizedHref}
          target="_blank"
          rel="nofollow noopener noreferrer"
          {...props}
        >
          {children}
        </LinkComponent>
      );
    }

    return (
      <LinkComponent href={localizedHref} {...props}>
        {children}
      </LinkComponent>
    );
  };
}

export function getMDXComponents(
  components?: MDXComponents,
  options?: { locale?: string }
): MDXComponents {
  const mergedComponents: MDXComponents = {
    ...defaultMdxComponents,
    a: createCustomLink(options?.locale),
    img: CustomImage,
    HeroMini,
    HeroFull,
    SupportEmailLink,
  };

  if (components) {
    Object.assign(mergedComponents, components);
  }

  if (components?.a) {
    mergedComponents.a = withNoFollow(
      components.a as React.ComponentType<
        React.AnchorHTMLAttributes<HTMLAnchorElement>
      >,
      options?.locale
    );
  }

  return mergedComponents;
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
