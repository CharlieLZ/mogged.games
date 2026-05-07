'use client';

import { Monitor, Moon, SunDim } from 'lucide-react';
import { useTheme } from 'next-themes';

import { AnimatedThemeToggler } from '@/shared/components/magicui/animated-theme-toggler';
import { Button } from '@/shared/components/ui/button';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/shared/components/ui/toggle-group';
import { useDeferredClientRender } from '@/shared/hooks/use-deferred-client-render';

export function ThemeToggler({
  type = 'icon',
  className,
  ariaLabel = 'Toggle theme',
}: {
  type?: 'icon' | 'button' | 'toggle';
  className?: string;
  ariaLabel?: string;
}) {
  const { theme, setTheme } = useTheme();
  const ready = useDeferredClientRender();
  const handleThemeChange = (value: string) => {
    setTheme(value);
  };

  if (!ready) {
    return null;
  }

  if (type === 'button') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={ariaLabel}
        className="hover:bg-primary/10"
      >
        <SunDim />
      </Button>
    );
  } else if (type === 'toggle') {
    return (
      <ToggleGroup
        type="single"
        className={` ${className}`}
        value={theme}
        onValueChange={handleThemeChange}
        variant="outline"
      >
        <ToggleGroupItem
          value="light"
          aria-label="Use light theme"
          onClick={() => setTheme('light')}
        >
          <SunDim />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dark"
          aria-label="Use dark theme"
          onClick={() => setTheme('dark')}
        >
          <Moon />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="system"
          aria-label="Use system theme"
          onClick={() => setTheme('system')}
        >
          <Monitor />
        </ToggleGroupItem>
      </ToggleGroup>
    );
  }

  return <AnimatedThemeToggler className={className} ariaLabel={ariaLabel} />;
}
