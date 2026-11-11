"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * Link that warms its route on intent (hover, touch, focus) instead of on sight. A day's
 * scoreboard lists dozens of games and a table dozens of players: prefetching each one as it
 * scrolls into view cost a server request per row on every visit, for pages rarely opened.
 */
export function IntentLink({ href, ...rest }: Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & { href: string }) {
  const router = useRouter();
  const warm = () => router.prefetch(href);
  return <Link {...rest} href={href} prefetch={false} onMouseEnter={warm} onTouchStart={warm} onFocus={warm} />;
}
