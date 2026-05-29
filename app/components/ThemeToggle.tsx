"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, resolvedTheme, cycleTheme } = useTheme();
  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const label =
    theme === "system"
      ? `System theme (${resolvedTheme})`
      : `${theme[0].toUpperCase()}${theme.slice(1)} theme`;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title="Toggle theme"
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
    >
      <Icon size={15} strokeWidth={1.75} />
    </button>
  );
}
