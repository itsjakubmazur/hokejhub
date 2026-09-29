/* eslint-disable @next/next/no-img-element -- remote club logos */
"use client";

import { useState } from "react";

/** Club logo on a light chip so dark logos stay visible in dark mode. */
export function ClubLogo({ src, alt, size = 24, className = "" }: { src: string | null | undefined; alt: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-md bg-white/95 p-0.5 ${className}`}
      style={{ width: size, height: size }}
      title={alt}
    >
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full object-contain" />
      ) : (
        <svg viewBox="0 0 24 24" className="size-full text-black/40" aria-hidden>
          <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}
