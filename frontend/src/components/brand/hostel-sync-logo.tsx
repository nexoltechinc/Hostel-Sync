"use client";

import clsx from "clsx";
import Image from "next/image";
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

const LOGO_ASSETS = {
  full: { src: "/brand/hostelsync-logo.png", width: 320, height: 96, fallback: "Hostel Sync" },
  mark: { src: "/brand/hostelsync-icon.png", width: 72, height: 72, fallback: "HS" },
} as const;

export function HostelSyncLogo({
  variant = "full",
  size = "md",
  className,
  imageClassName,
  fallbackClassName,
}: HostelSyncLogoProps) {
  const [hasError, setHasError] = useState(false);
  const asset = LOGO_ASSETS[variant];

  return (
    <span className={clsx("inline-flex items-center", SIZE_STYLES[size], className)}>
      {!hasError ? (
        <Image
          src={asset.src}
          alt="Hostel Sync"
          width={asset.width}
          height={asset.height}
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
          {asset.fallback}
        </span>
      )}
    </span>
  );
}
