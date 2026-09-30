"use client";

/* eslint-disable @next/next/no-img-element -- remote SVG/PNG logos from several CDNs */
import { useState } from "react";
import type { TeamRef } from "@hokejhub/core";

export function TeamLogo({ team, size = 28, className = "" }: { team: TeamRef; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!team.logoUrl || failed) {
    return (
      <span
        className={`display grid shrink-0 place-items-center bg-surface-2 text-muted ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.3) }}
      >
        {team.abbrev.slice(0, 3)}
      </span>
    );
  }
  return (
    <img
      src={team.logoUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
