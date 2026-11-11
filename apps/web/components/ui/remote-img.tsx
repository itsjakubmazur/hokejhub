/* eslint-disable @next/next/no-img-element -- remote hokej.cz / NHL images */
"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { imgSrc } from "@/lib/img";

/**
 * Remote image through our CDN relay, with the original address as a second try: hokej.cz at
 * times refuses the relay's datacenter address while it serves the visitor's browser fine.
 * `onFail` fires only when both are gone, so callers can show their placeholder.
 */
export function RemoteImg({
  src,
  onFail,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & { src: string; onFail?: () => void }) {
  const relayed = imgSrc(src)!;
  // Remember which address fell back, so a new image in the same slot starts with the relay.
  const [directFor, setDirectFor] = useState<string | null>(null);
  const direct = directFor === src;
  return (
    <img
      {...rest}
      alt={rest.alt ?? ""}
      src={direct ? src : relayed}
      onError={() => {
        if (!direct && relayed !== src) setDirectFor(src);
        else onFail?.();
      }}
    />
  );
}
