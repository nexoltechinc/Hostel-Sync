"use client";

import type { LucideIcon } from "lucide-react";

import { IconBadge } from "@/components/ui/icon-badge";

type SectionHeadingProps = {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  compact?: boolean;
};

export function SectionHeading({ icon, eyebrow, title, description, compact = false }: SectionHeadingProps) {
  return (
    <div className="flex items-start gap-4">
      <IconBadge icon={icon} size={compact ? "sm" : "lg"} tone={compact ? "muted" : "primary"} className={compact ? "" : "mt-0.5"} />
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">{eyebrow}</p>
        ) : null}
        <h2
          className={
            compact
              ? "text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]"
              : "text-[2rem] font-semibold tracking-[-0.03em] text-[var(--color-text-strong)] sm:text-[2.5rem]"
          }
        >
          {title}
        </h2>
        {description ? (
          <p
            className={
              compact
                ? "mt-1 text-sm text-[var(--color-text-muted)]"
                : "mt-2 max-w-3xl text-sm leading-7 text-[var(--color-text-soft)] sm:text-base"
            }
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
