'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ScrollArea, ScrollBar } from '@/shared/components/ui/scroll-area';
import {
  Tabs as TabsComponent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';
import { Tab } from '@/shared/types/blocks/common';

export function getDefaultTabName(tabs: Tab[]) {
  const defaultTab = tabs.find((tab) => tab.is_active) ?? tabs[0];
  return typeof defaultTab?.name === 'string' ? defaultTab.name : '';
}

export function isHashTabUrl(url?: string | null) {
  return Boolean(url?.startsWith('#'));
}

export function isRouteTab(tab?: Tab) {
  const url = tab?.url;
  return Boolean(url) && !isHashTabUrl(url);
}

function normalizePath(pathname?: string | null) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function isLocalizedPathMatch(currentPathname: string, targetPathname: string) {
  if (currentPathname === targetPathname) {
    return true;
  }

  if (!currentPathname.endsWith(targetPathname)) {
    return false;
  }

  const prefix = currentPathname.slice(0, -targetPathname.length);
  return prefix === '' || /^\/[^/]+$/.test(prefix);
}

export function matchesRouteTab(
  tab: Tab,
  pathname?: string | null,
  search?: string | null
) {
  if (!tab.url || isHashTabUrl(tab.url)) {
    return false;
  }

  try {
    const parsed = new URL(tab.url, 'https://mogged.games');
    const currentPathname = normalizePath(pathname);
    const targetPathname = normalizePath(parsed.pathname);
    const currentSearch = search || '';
    const targetSearch = parsed.searchParams.toString();

    return (
      isLocalizedPathMatch(currentPathname, targetPathname) &&
      currentSearch === targetSearch
    );
  } catch {
    return false;
  }
}

export function getMatchedHashTabName(tabs: Tab[], hash?: string | null) {
  const normalizedHash = typeof hash === 'string' ? hash.replace(/^#/, '') : '';
  if (!normalizedHash) {
    return '';
  }

  const matchedTab = tabs.find((tab) => {
    if (tab.name !== normalizedHash) {
      return false;
    }

    return !isRouteTab(tab);
  });

  return typeof matchedTab?.name === 'string' ? matchedTab.name : '';
}

export function Tabs({
  tabs,
  size,
}: {
  tabs: Tab[];
  size?: 'sm' | 'md' | 'lg';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tabName, setTabName] = useState(() => getDefaultTabName(tabs));
  const currentSearch = searchParams?.toString() || '';
  const hasRouteTabs = tabs.some((tab) => isRouteTab(tab));
  const hasHashTabs = tabs.some((tab) => !isRouteTab(tab));

  // tabs 变化时，当前 tab 不存在就回退到新的默认值
  useEffect(() => {
    const fallback = getDefaultTabName(tabs);
    setTabName((current) => {
      const exists = tabs.some((tab) => tab.name === current);
      if (exists && current) {
        return current;
      }
      return fallback || '';
    });
  }, [tabs]);

  useEffect(() => {
    if (!hasRouteTabs) {
      return;
    }

    const matchedTab = tabs.find((tab) =>
      matchesRouteTab(tab, pathname, currentSearch)
    );
    const matchedTabName =
      typeof matchedTab?.name === 'string' ? matchedTab.name : '';

    if (matchedTabName && matchedTabName !== tabName) {
      setTabName(matchedTabName);
    }
  }, [currentSearch, hasRouteTabs, pathname, tabName, tabs]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHashTabs) {
      return;
    }

    const applyHash = () => {
      const hashTabName = getMatchedHashTabName(tabs, window.location.hash);

      if (hashTabName && hashTabName !== tabName) {
        setTabName(hashTabName);
      }
    };

    applyHash();
    window.addEventListener('hashchange', applyHash);

    return () => {
      window.removeEventListener('hashchange', applyHash);
    };
  }, [hasHashTabs, hasRouteTabs, tabName, tabs]);

  useEffect(() => {
    if (typeof window === 'undefined' || !tabName) {
      return;
    }

    const activeTab = tabs.find((tab) => tab.name === tabName);
    if (!activeTab || isRouteTab(activeTab)) {
      return;
    }

    const newHash =
      activeTab.url && isHashTabUrl(activeTab.url)
        ? activeTab.url
        : `#${tabName}`;

    const targetElement = document.getElementById(tabName);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [tabName, tabs]);

  const handleTabChange = (newTabName: string) => {
    const tab = tabs.find((t) => t.name === newTabName);
    setTabName(newTabName);

    if (isRouteTab(tab) && tab?.url) {
      router.push(tab.url);
    }
  };

  return (
    <div className="relative mb-8">
      <ScrollArea className="w-full lg:max-w-none">
        <div className="flex items-center space-x-2">
          <TabsComponent value={tabName} onValueChange={handleTabChange}>
            <TabsList className={cn(size === 'sm' && 'h-8')}>
              {tabs.map((tab, idx) => (
                <TabsTrigger key={idx} value={tab.name || ''}>
                  {tab.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </TabsComponent>
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
