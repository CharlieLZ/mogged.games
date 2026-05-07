'use client';

import { ReactNode, useState } from 'react';

import { Link, usePathname } from '@/core/i18n/navigation';
import { SupportEmailLink } from '@/shared/blocks/common/support-email-link';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Nav } from '@/shared/types/blocks/common';

export function ConsoleLayout({
  title,
  nav,
  topNav,
  headerActions,
  supportText,
  supportEmail,
  className,
  children,
}: {
  title?: string;
  nav?: Nav;
  topNav?: Nav;
  headerActions?: ReactNode;
  supportText?: string;
  supportEmail?: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const filteredItems = nav?.items;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`bg-background min-h-screen ${className}`}>
      {/* Top Navigation */}
      {topNav && (
        <div className="border-border border-b">
          <div className="container overflow-x-auto">
            <nav className="flex items-center gap-2 text-sm md:gap-4">
              {topNav.items.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.url || ''}
                  className={`text-muted-foreground hover:bg-foreground/10 flex shrink-0 items-center gap-1.5 px-2 py-2 md:gap-2 md:px-3 ${
                    item.is_active || pathname?.startsWith(item.url as string)
                      ? 'border-primary text-muted-foreground border-b-2'
                      : ''
                  } hover:text-foreground duration-200 ease-linear`}
                >
                  {item.icon && (
                    <SmartIcon name={item.icon as string} size={16} />
                  )}
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="border-border border-b">
        <div className="container">
          <div className="flex flex-col gap-4 py-4 md:flex-row md:items-start md:justify-between md:py-8">
            <div>
              <h1 className="text-foreground text-2xl font-semibold md:text-3xl">
                {title}
              </h1>
              {/* Support Contact */}
              {supportText && supportEmail && (
                <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                  <SmartIcon name="Mail" size={14} />
                  <span>{supportText}</span>
                  <SupportEmailLink
                    email={supportEmail}
                    className="text-primary hover:underline font-medium"
                  >
                    {supportEmail}
                  </SupportEmailLink>
                </div>
              )}
            </div>
            {headerActions ? (
              <div className="flex items-center justify-end gap-2">
                {headerActions}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        <div className="flex flex-col gap-4 py-8 md:flex-row md:gap-8">
          {/* Mobile Sidebar Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="border-border bg-secondary/50 hover:bg-secondary flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors"
            >
              <span className="text-foreground font-medium">
                {filteredItems?.find(
                  (item) =>
                    item.is_active ||
                    pathname.endsWith(item.url as string) ||
                    item.url?.endsWith(pathname)
                )?.title || nav?.items?.[0]?.title}
              </span>
              <SmartIcon
                name={sidebarOpen ? 'ChevronUp' : 'ChevronDown'}
                size={16}
                className="text-muted-foreground"
              />
            </button>
          </div>

          {/* Left Sidebar */}
          <div
            className={`${
              sidebarOpen ? 'block' : 'hidden'
            } w-full flex-shrink-0 md:block md:w-64`}
          >
            {/* Navigation Menu */}
            <nav className="space-y-1">
              {filteredItems?.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.url || ''}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    item.is_active ||
                    pathname.endsWith(item.url as string) ||
                    item.url?.endsWith(pathname)
                      ? 'bg-secondary text-secondary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <SmartIcon name={item.icon as string} size={16} />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
