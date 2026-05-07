'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocale } from 'next-intl';

import { Link, usePathname } from '@/core/i18n/navigation';
import { getPromoBannerCopy } from '@/config/website/promo-banner-copy';
import { BrandLogo } from '@/shared/blocks/common/brand-logo';
import { DailyClaimButton } from '@/shared/blocks/common/daily-claim-button';
import { LocaleSelector } from '@/shared/blocks/common/locale-selector';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { ThemeToggler } from '@/shared/blocks/common/theme-toggler';
import { SignUser } from '@/shared/blocks/sign/sign-user';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger as RawNavigationMenuTrigger,
} from '@/shared/components/ui/navigation-menu';
import { PromoBannerWrapper } from '@/shared/components/ui/promo-banner-wrapper';
import { useDeferredClientRender } from '@/shared/hooks/use-deferred-client-render';
import { useMedia } from '@/shared/hooks/use-media';
import { replaceBrandTokens } from '@/shared/lib/brand';
import { getCommonCopy } from '@/shared/lib/common-copy';
import { cn } from '@/shared/lib/utils';
import { GUEST_DAILY_QUOTA_LIMIT } from '@/shared/lib/viewer-quota';
import { NavItem } from '@/shared/types/blocks/common';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

// For Next.js hydration mismatch warning, conditionally render NavigationMenuTrigger only after mount to avoid inconsistency between server/client render
function NavigationMenuTrigger(
  props: React.ComponentProps<typeof RawNavigationMenuTrigger>
) {
  const ready = useDeferredClientRender();
  // Only render after client has mounted, to avoid SSR/client render id mismatch
  if (!ready) return null;
  return <RawNavigationMenuTrigger {...props} />;
}

export function Header({ header }: { header: HeaderType }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const locale = useLocale();
  const copy = getCommonCopy(locale);
  const promoCopy = getPromoBannerCopy(locale);
  const isLarge = useMedia('(min-width: 64rem)');
  const pathname = usePathname();
  const ready = useDeferredClientRender();
  const promoQuotaLabel = replaceBrandTokens(promoCopy.quotaLabel);
  const promoQuotaSuffix = replaceBrandTokens(promoCopy.quotaSuffix);
  const promoPopoverTitle = replaceBrandTokens(promoCopy.popoverTitle);
  const promoPopoverBody = replaceBrandTokens(promoCopy.popoverBody).replaceAll(
    '{{guest_daily_quota_limit}}',
    String(GUEST_DAILY_QUOTA_LIMIT)
  );
  const promoPopoverFooter = replaceBrandTokens(promoCopy.popoverFooter);
  const toggleThemeLabel = copy.a11y.toggle_theme ?? 'Toggle theme';
  const changeLanguageLabel = copy.a11y.change_language ?? 'Change language';
  const showDesktopPromo = ready && isLarge;
  const showMobilePromo = ready && !isLarge;

  useEffect(() => {
    // Listen to scroll event to enable header styles on scroll
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isLarge) {
      setIsMobileMenuOpen(false);
    }
  }, [isLarge]);

  // Navigation menu for large screens
  const NavMenu = () => {
    const menuRef = useRef<React.ElementRef<typeof NavigationMenu>>(null);
    const isItemActive = (item: NavItem) => {
      if (item.is_active) {
        return true;
      }

      if (item.url) {
        return pathname === item.url || pathname.endsWith(item.url);
      }

      return item.children?.some((child) =>
        child.url
          ? pathname === child.url || pathname.endsWith(child.url)
          : false
      );
    };

    // Calculate dynamic viewport height for animated menu
    const handleViewportHeight = () => {
      requestAnimationFrame(() => {
        const menuNode = menuRef.current;
        if (!menuNode) return;

        const openContent = document.querySelector<HTMLElement>(
          '[data-slot="navigation-menu-viewport"][data-state="open"]'
        );

        if (openContent) {
          const height = openContent.scrollHeight;
          document.documentElement.style.setProperty(
            '--navigation-menu-viewport-height',
            `${height}px`
          );
        } else {
          document.documentElement.style.removeProperty(
            '--navigation-menu-viewport-height'
          );
        }
      });
    };

    return (
      <NavigationMenu
        ref={menuRef}
        onValueChange={handleViewportHeight}
        className="[--color-muted:color-mix(in_oklch,var(--color-foreground)_5%,transparent)] [--viewport-outer-px:2rem] **:data-[slot=navigation-menu-viewport]:rounded-none **:data-[slot=navigation-menu-viewport]:border-0 **:data-[slot=navigation-menu-viewport]:bg-transparent **:data-[slot=navigation-menu-viewport]:shadow-none **:data-[slot=navigation-menu-viewport]:ring-0 max-lg:hidden"
      >
        <NavigationMenuList className="justify-center gap-5 xl:gap-7">
          {header.nav?.items?.map((item, idx) => (
            <NavigationMenuItem key={idx} value={item.title || ''}>
              {item.children && item.children.length > 0 ? (
                <>
                  <NavigationMenuTrigger
                    className={cn(
                      'text-muted-foreground hover:text-foreground relative flex flex-row items-center gap-2 px-3 text-sm font-semibold',
                      isItemActive(item)
                        ? 'text-primary after:bg-primary after:absolute after:right-3 after:-bottom-1 after:left-3 after:h-0.5 after:rounded-full'
                        : ''
                    )}
                  >
                    {item.icon && (
                      <SmartIcon
                        name={item.icon as string}
                        className="h-4 w-4"
                      />
                    )}
                    {item.title}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="mt-4.5 origin-top pt-5 pb-14 shadow-none ring-0">
                    <div className="divide-foreground/10 grid w-full min-w-6xl grid-cols-4 gap-4 divide-x pr-22 rtl:pr-0 rtl:pl-22 rtl:divide-x-reverse">
                      <div className="col-span-2 row-span-2 grid grid-rows-subgrid gap-1 border-r-0">
                        <span className="text-muted-foreground ml-2 text-xs rtl:mr-2 rtl:ml-0">
                          {item.title}
                        </span>
                        <ul className="mt-1 grid grid-cols-2 gap-2">
                          {item.children?.map((subItem: NavItem, iidx) => (
                            <ListItem
                              key={iidx}
                              href={subItem.url || ''}
                              title={subItem.title || ''}
                              description={subItem.description || ''}
                            >
                              {subItem.icon && (
                                <SmartIcon name={subItem.icon as string} />
                              )}
                            </ListItem>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </>
              ) : (
                <NavigationMenuLink asChild>
                  <Link
                    href={item.url || ''}
                    target={item.target || '_self'}
                    className={cn(
                      'text-muted-foreground hover:text-foreground relative flex flex-row items-center gap-2 px-3 py-2 text-sm font-semibold',
                      isItemActive(item)
                        ? 'text-primary after:bg-primary after:absolute after:right-3 after:bottom-0 after:left-3 after:h-0.5 after:rounded-full'
                        : ''
                    )}
                  >
                    {item.icon && <SmartIcon name={item.icon as string} />}
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    );
  };

  // Mobile menu using Accordion, shown on small screens
  const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
    return (
      <nav
        role="navigation"
        className="w-full [--color-border:--alpha(var(--color-foreground)/5%)] [--color-muted:--alpha(var(--color-foreground)/5%)]"
      >
        <Accordion
          type="single"
          collapsible
          className="-mx-4 mt-0.5 space-y-0.5 **:hover:no-underline"
        >
          {header.nav?.items?.map((item, idx) => {
            return (
              <AccordionItem
                key={idx}
                value={item.title || ''}
                className="group relative border-b-0 before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:border-b"
              >
                {item.children && item.children.length > 0 ? (
                  <>
                    <AccordionTrigger className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg **:!font-normal">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <ul>
                        {item.children?.map((subItem: NavItem, iidx) => (
                          <li key={iidx}>
                            <Link
                              href={subItem.url || ''}
                              onClick={closeMenu}
                              className="grid grid-cols-[auto_1fr] items-center gap-2.5 px-4 py-2"
                            >
                              <div
                                aria-hidden
                                className="flex items-center justify-center *:size-4"
                              >
                                {subItem.icon && (
                                  <SmartIcon name={subItem.icon as string} />
                                )}
                              </div>
                              <div className="text-base">{subItem.title}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </>
                ) : (
                  <Link
                    href={item.url || ''}
                    onClick={closeMenu}
                    className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg **:!font-normal"
                  >
                    {item.title}
                  </Link>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
      </nav>
    );
  };

  // List item for submenus in NavigationMenu
  function ListItem({
    title,
    description,
    children,
    href,
    ...props
  }: React.ComponentPropsWithoutRef<'li'> & {
    href: string;
    title: string;
    description?: string;
  }) {
    return (
      <li {...props}>
        <NavigationMenuLink asChild>
          <Link href={href} className="grid grid-cols-[auto_1fr] gap-3.5">
            <div className="bg-background ring-foreground/10 relative flex size-9 items-center justify-center rounded border border-transparent shadow shadow-sm ring-1">
              {children}
            </div>
            <div className="space-y-0.5">
              <div className="text-foreground text-sm font-medium">{title}</div>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {description}
              </p>
            </div>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  }

  const HeaderActionButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      data-slot={
        mobile ? 'landing-header-mobile-actions' : 'landing-header-actions'
      }
      className={cn(
        'flex items-center gap-4 sm:gap-5',
        mobile ? 'w-full flex-wrap' : 'min-w-0 justify-end lg:flex-nowrap'
      )}
    >
      {header.show_sign ? <DailyClaimButton /> : null}
      {!mobile && showDesktopPromo ? (
        <PromoBannerWrapper
          quotaLabel={promoQuotaLabel}
          quotaSuffix={promoQuotaSuffix}
          popoverTitle={promoPopoverTitle}
          popoverBody={promoPopoverBody}
          popoverFooter={promoPopoverFooter}
          quotaTotal={GUEST_DAILY_QUOTA_LIMIT}
          className="shrink-0"
          popoverAlign="end"
        />
      ) : null}
      {header.show_sign ? <SignUser userNav={header.user_nav} /> : null}
      {header.buttons?.map((button, idx) => (
        <Button
          key={idx}
          asChild
          size="sm"
          variant={button.variant || 'default'}
          className="h-7 px-3 ring-0"
        >
          <Link href={button.url || ''} target={button.target || '_self'}>
            {button.icon && <SmartIcon name={button.icon as string} />}
            <span>{button.title}</span>
          </Link>
        </Button>
      ))}
      {header.show_theme ? <ThemeToggler ariaLabel={toggleThemeLabel} /> : null}
      {header.show_locale ? (
        <LocaleSelector ariaLabel={changeLanguageLabel} />
      ) : null}
    </div>
  );

  return (
    <header
      data-state={isMobileMenuOpen ? 'active' : 'inactive'}
      {...(isScrolled && { 'data-scrolled': true })}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        data-slot="landing-header-shell"
        className={cn(
          'relative z-50 min-h-14 border-transparent ring-1 ring-transparent transition-[min-height,background-color,border-color,box-shadow,backdrop-filter] duration-300 lg:min-h-18',
          'in-data-scrolled:border-foreground/5 in-data-scrolled:bg-background/75 in-data-scrolled:border-b in-data-scrolled:backdrop-blur',
          'has-data-[state=open]:ring-foreground/5 has-data-[state=open]:bg-card/75 has-data-[state=open]:shadow-foreground/10 has-data-[state=open]:border-b has-data-[state=open]:shadow-lg has-data-[state=open]:backdrop-blur',
          'lg:has-data-[state=open]:min-h-[calc(var(--navigation-menu-viewport-height)+var(--landing-header-height))]',
          'max-lg:in-data-[state=active]:bg-background/75 max-lg:overflow-hidden max-lg:border-b max-lg:in-data-[state=active]:min-h-[100dvh] max-lg:in-data-[state=active]:backdrop-blur'
        )}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div
            data-slot="landing-header-row"
            className="grid min-h-14 items-center gap-4 lg:min-h-18 lg:grid-cols-[minmax(12rem,1fr)_auto_minmax(12rem,1fr)] lg:gap-6 xl:gap-10"
          >
            <div className="flex min-w-0 items-center justify-between gap-4 lg:gap-8">
              {header.brand && <BrandLogo brand={header.brand} />}

              <div
                data-slot="landing-header-mobile-utility"
                className="flex items-center gap-2 lg:hidden"
              >
                {showMobilePromo ? (
                  <PromoBannerWrapper
                    quotaLabel={promoQuotaLabel}
                    quotaSuffix={promoQuotaSuffix}
                    popoverTitle={promoPopoverTitle}
                    popoverBody={promoPopoverBody}
                    popoverFooter={promoPopoverFooter}
                    quotaTotal={GUEST_DAILY_QUOTA_LIMIT}
                    className="shrink-0"
                    popoverAlign="end"
                  />
                ) : null}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label={
                    isMobileMenuOpen
                      ? copy.a11y.close_menu
                      : copy.a11y.open_menu
                  }
                  className="relative z-20 -m-2.5 -mr-3 block cursor-pointer p-2.5 rtl:-mr-0 rtl:-ml-3"
                >
                  <Menu className="m-auto size-5 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0" />
                  <X className="absolute inset-0 m-auto size-5 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100" />
                </button>
              </div>
            </div>

            {isLarge ? (
              <div
                data-slot="landing-header-nav-rail"
                className="hidden min-w-0 lg:flex lg:justify-center"
              >
                <NavMenu />
              </div>
            ) : null}

            <div className="hidden min-w-0 items-center justify-end lg:flex">
              <HeaderActionButtons />
            </div>
          </div>

          {!isLarge && isMobileMenuOpen ? (
            <div
              data-slot="landing-header-mobile-panel"
              className="border-foreground/5 border-t px-4 pt-4 pb-6"
            >
              <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />
              <div className="mt-5">
                <HeaderActionButtons mobile />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
