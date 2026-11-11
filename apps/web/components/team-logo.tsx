"use client";

 
import { useState } from "react";
import type { TeamRef } from "@hokejhub/core";
import { RemoteImg } from "@/components/ui/remote-img";

export function TeamLogo({ team, size = 28, className = "" }: { team: TeamRef; size?: number; className?: string }) {
  // Remember which URL failed, so a new photo for the same slot gets its own chance.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc !== null && failedSrc === team.logoUrl;
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
    <RemoteImg
      src={team.logoUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onFail={() => setFailedSrc(team.logoUrl ?? null)}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
