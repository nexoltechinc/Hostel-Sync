"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

type IconBadgeProps = {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "primary" | "muted";
};

const sizeClasses = {
  sm: "h-7.5 w-7.5 rounded-[0.8rem]",
  md: "h-8 w-8 rounded-[0.875rem]",
  lg: "h-10 w-10 rounded-[0.95rem]",
} as const;

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-3 w-3",
  lg: "h-4 w-4",
} as const;

const toneClasses = {
  default:
    "border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)] text-[var(--color-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  primary:
    "border border-white/10 bg-[linear-gradient(135deg,#245df4_0%,#1b82f0_48%,#1db5a8_100%)] text-white shadow-[0_18px_34px_rgba(20,64,172,0.26)]",
  muted:
    "border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
} as const;

export function IconBadge({ icon: Icon, className, size = "md", tone = "default" }: IconBadgeProps) {
  return (
    <span className={clsx("inline-flex shrink-0 items-center justify-center", sizeClasses[size], toneClasses[tone], className)}>
      <Icon className={iconSizeClasses[size]} />
    </span>
  );
}
