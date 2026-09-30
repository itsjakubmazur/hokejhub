/* eslint-disable @next/next/no-img-element -- remote hokej.cz photos */
"use client";

import { useState } from "react";
import { imgSrc } from "@/lib/img";

/** Round player photo; hockey-player silhouette when hokej.cz has no photo. */
export function PlayerPhoto({
  src,
  alt,
  size = 32,
  ring,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  ring?: "home" | "away";
  className?: string;
}) {
  // Remember which URL failed, so a new photo for the same slot gets its own chance.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc !== null && failedSrc === src;
  const ringCls = ring === "home" ? "ring-2 ring-home" : ring === "away" ? "ring-2 ring-away" : "ring-1 ring-line";
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-surface-2 ${ringCls} ${className}`}
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        <img
          src={imgSrc(src)!}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailedSrc(src ?? null)}
          className="size-full object-cover object-top"
        />
      ) : (
        <svg viewBox="0 0 40 40" className="size-full text-muted" aria-label={alt}>
          <circle cx="20" cy="15" r="7" fill="currentColor" opacity=".55" />
          <path d="M7 40c1-9 6-14 13-14s12 5 13 14" fill="currentColor" opacity=".55" />
          <path d="M26 28l7 -9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4" />
        </svg>
      )}
    </span>
  );
}
