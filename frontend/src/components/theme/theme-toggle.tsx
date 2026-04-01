"use client";

import clsx from "clsx";
import { MoonStar, SunMedium } from "lucide-react";

import { useTheme } from "@/providers/theme-provider";

type ThemeToggleProps = {
  className?: string;
  compact?: boolean;
};

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-full border transition",
          compact
            ? "h-8.5 w-8.5 bg-[var(--color-surface)] text-[var(--color-text-soft)] shadow-[var(--panel-shadow)] hover:text-[var(--color-text-strong)]"
            : "rounded-full bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text-soft)] shadow-[var(--panel-shadow)] hover:text-[var(--color-text-strong)]",
          className,
        )}
      style={{ borderColor: compact ? "var(--color-border)" : "var(--color-border-strong)" }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <SunMedium className="h-3 w-3" /> : <MoonStar className="h-3 w-3" />}
      {compact ? null : <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
