/* eslint-disable @next/next/no-img-element -- remote hokej.cz / NHL photos */
"use client";

import { useState } from "react";

/**
 * Player card portrait (3:4) — the photo is the point, so it is shown large with the jersey
 * number and a team-colour base line. Falls back to a silhouette when there is no photo.
 */
export function Portrait({
  src,
  alt,
  width = 72,
  side,
  number,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  width?: number;
  side?: "home" | "away";
  number?: number | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const height = Math.round((width * 4) / 3);
  return (
    <span
      className={`relative block shrink-0 overflow-hidden bg-gradient-to-b from-surface-2 to-surface ${className}`}
      style={{ width, height }}
    >
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full object-cover object-top" />
      ) : (
        <svg viewBox="0 0 30 40" className="size-full text-muted/40" aria-label={alt}>
          <circle cx="15" cy="14" r="6.5" fill="currentColor" />
          <path d="M3 40c.8-9 5.6-14 12-14s11.2 5 12 14" fill="currentColor" />
        </svg>
      )}
      {number != null ? (
        <span className="display absolute left-1 top-1 bg-bg/80 px-1 text-[0.8rem] leading-tight tabular backdrop-blur-sm">{number}</span>
      ) : null}
      {side ? <span className={`absolute inset-x-0 bottom-0 h-[3px] ${side === "home" ? "bg-home" : "bg-away"}`} /> : null}
    </span>
  );
}
