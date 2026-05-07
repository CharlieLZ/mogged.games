'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { useLocale } from 'next-intl';

import { Link, usePathname } from '@/core/i18n/navigation';
import { BrandLogo } from '@/shared/blocks/common/brand-logo';
import { DailyClaimButton } from '@/shared/blocks/common/daily-claim-button';
import { LocaleSelector } from '@/shared/blocks/common/locale-selector';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { ThemeToggler } from '@/shared/blocks/common/theme-toggler';
import { NotificationBellButton } from '@/shared/blocks/notifications/notification-bell-button';
import { SignUser } from '@/shared/blocks/sign/sign-user';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { getCommonCopy } from '@/shared/lib/common-copy';
import { Header as LandingHeaderType } from '@/shared/types/blocks/landing';
import { NavItem } from '@/shared/types/blocks/common';

function isActive(pathname: string, url?: string) {
  if (!url) return false;
  return pathname === url || pathname.startsWith(url);
}

export function DashboardTopNav({ header }: { header: LandingHeaderType }) {
  const [mounted, setMounted] = useState(false);
  const locale = useLocale();
  const copy = getCommonCopy(locale);

  // Radix 的触发器在 SSR 下会生成随机 id，等到客户端再算一遍就不一致了。
  // 先等到客户端挂载完再渲染真实导航，避免服务端/客户端的节点对不上导致 hydration 告警。
  useEffect(() => {
    setMounted(true);
  }, []);

  const pathname = usePathname();

  const renderLink = (
    item: NavItem,
    className?: string,
    key?: string | number
  ) => (
    <Link
      key={key}
      href={item.url || ''}
      target={item.target || '_self'}
      className={`text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors ${className || ''} ${
        isActive(pathname, item.url) ? 'bg-muted text-foreground' : ''
      }`}
    >
      <span className="flex items-center gap-2">
        {item.icon && <SmartIcon name={item.icon as string} />}
        {item.title}
      </span>
    </Link>
  );

  return (
    <div className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container">
        {!mounted ? (
          <div className="grid h-14 items-center md:h-16" />
        ) : (
          <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3 md:h-16">
          <div className="flex items-center gap-4">
            {header.brand && <BrandLogo brand={header.brand} />}
          </div>

          <nav className="hidden items-center justify-center gap-2 lg:flex">
            {header.nav?.items?.map((item, idx) => {
              if (!item) return null;

              const hasActiveChild = item?.children?.some((child) =>
                isActive(pathname, child.url)
              );
              const active = hasActiveChild || isActive(pathname, item?.url);

              return item?.children && item.children.length > 0 ? (
                <DropdownMenu key={item.title || idx}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 px-3 ${active ? 'bg-muted' : ''}`}
                    >
                      {item.icon && <SmartIcon name={item.icon as string} />}
                      {item.title}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-64">
                    {item.children?.map((child, cIdx) => (
                      <DropdownMenuItem key={child.title || cIdx} asChild>
                        <Link
                          href={child.url || ''}
                          target={child.target || '_self'}
                          className="flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-2">
                            {child.icon && (
                              <SmartIcon name={child.icon as string} />
                            )}
                            <span className="text-sm font-medium">
                              {child.title}
                            </span>
                          </div>
                          {child.description && (
                            <span className="text-muted-foreground text-xs">
                              {child.description}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                renderLink(item as NavItem, 'font-medium', item?.title || idx)
              );
            })}
          </nav>

          <div className="hidden items-center justify-end gap-3 lg:flex">
            {header.buttons?.map((button, idx) => (
              <Link
                key={button.title || idx}
                href={button.url || ''}
                target={button.target || '_self'}
              >
                <Button
                  variant={button.variant || 'outline'}
                  size={button.size || 'sm'}
                  className="gap-2"
                >
                  {button.icon && <SmartIcon name={button.icon as string} />}
                  {button.title}
                </Button>
              </Link>
            ))}
            {header.show_theme && <ThemeToggler />}
            {header.show_locale !== false && <LocaleSelector type="button" />}
            <NotificationBellButton />
            <DailyClaimButton />
            {header.show_sign && <SignUser userNav={header.user_nav} />}
          </div>

          <div className="flex items-center justify-end gap-2 lg:hidden">
            <DailyClaimButton />
            {header.show_theme && <ThemeToggler />}
            {header.show_locale !== false && <LocaleSelector type="button" />}
            <NotificationBellButton />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{copy.a11y.open_menu}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] sm:w-[360px]">
                <SheetHeader>
                  <SheetTitle>{header.brand?.title || copy.a11y.menu}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Accordion type="single" collapsible className="space-y-2">
                    {header.nav?.items?.map((item, idx) => {
                      if (!item) return null;

                      return item.children && item.children.length > 0 ? (
                        <AccordionItem
                          value={item.title || `item-${idx}`}
                          key={item.title || idx}
                        >
                          <AccordionTrigger className="text-left">
                            <span className="flex items-center gap-2 text-base font-medium">
                              {item.icon && (
                                <SmartIcon name={item.icon as string} />
                              )}
                              {item.title}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-col gap-2">
                              {item.children?.map((child, cIdx) => (
                                <Link
                                  key={child.title || cIdx}
                                  href={child.url || ''}
                                  target={child.target || '_self'}
                                  className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
                                >
                                  {child.icon && (
                                    <SmartIcon name={child.icon as string} />
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {child.title}
                                    </span>
                                    {child.description && (
                                      <span className="text-muted-foreground text-xs">
                                        {child.description}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ) : (
                        <div key={item?.title || idx} className="rounded-md">
                          {renderLink(
                            item as NavItem,
                            'block text-base font-medium'
                          )}
                        </div>
                      );
                    })}
                  </Accordion>

                  {header.buttons && header.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {header.buttons.map((button, idx) => (
                        <Link
                          key={button.title || idx}
                          href={button.url || ''}
                          target={button.target || '_self'}
                          className="w-full sm:w-auto"
                        >
                          <Button
                            variant={button.variant || 'default'}
                            size={button.size || 'sm'}
                            className="w-full justify-center gap-2 sm:w-auto"
                          >
                            {button.icon && (
                              <SmartIcon name={button.icon as string} />
                            )}
                            {button.title}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}

                  {header.show_sign && <SignUser userNav={header.user_nav} />}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
