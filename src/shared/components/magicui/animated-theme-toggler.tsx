"use client";

import { Moon, SunDim } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/shared/lib/utils";
import { useTheme } from "next-themes";

type props = {
  className?: string;
  ariaLabel?: string;
};

export const AnimatedThemeToggler = ({
  className,
  ariaLabel = "Toggle theme",
}: props) => {
  const { theme, setTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    setIsDarkMode(theme === "dark");
  }, [theme]);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const changeTheme = async () => {
    if (!buttonRef.current) return;

    const applyThemeChange = () => {
      const dark = document.documentElement.classList.toggle("dark");
      setTheme(dark ? "dark" : "light");
      setIsDarkMode(dark);
    };
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      prefersReducedMotion ||
      typeof document.startViewTransition !== "function"
    ) {
      applyThemeChange();
      return;
    }

    await document.startViewTransition(() => {
      flushSync(applyThemeChange);
    }).ready;

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const y = top + height / 2;
    const x = left + width / 2;

    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRad}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  };
  if (!mounted) {
    return null;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={ariaLabel}
      onClick={changeTheme}
      className={cn(className)}
    >
      {isDarkMode ? <SunDim /> : <Moon />}
    </button>
  );
};
