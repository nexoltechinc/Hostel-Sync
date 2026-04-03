"use client";

import clsx from "clsx";
import { useState } from "react";

type HostelSyncLogoProps = {
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

const SIZE_STYLES: Record<NonNullable<HostelSyncLogoProps["size"]>, string> = {
  sm: "h-10",
  md: "h-12",
  lg: "h-16",
};

export function HostelSyncLogo({
  variant = "full",
  size = "md",
  className,
  imageClassName,
  fallbackClassName,
}: HostelSyncLogoProps) {
  const [hasError, setHasError] = useState(false);
  const src = variant === "mark" ? "/brand/hostelsync-icon.png" : "/brand/hostelsync-logo.png";
  const fallbackText = variant === "mark" ? "HS" : "Hostel Sync";

  return (
    <span className={clsx("inline-flex items-center", SIZE_STYLES[size], className)}>
      {!hasError ? (
        <img
          src={src}
          alt="Hostel Sync"
          className={clsx("h-full w-auto object-contain", imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : (
        <span
          className={clsx(
            "inline-flex h-full w-auto items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-sm font-semibold uppercase tracking-[0.18em] text-white",
            fallbackClassName,
          )}
        >
          {fallbackText}
        </span>
      )}
    </span>
  );
}
