"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Tab bar driven by `?tab=` so each view is linkable; animated underline.
 *
 * Tabs prefetch on intent (hover, touch, focus), never on sight: a full prefetch of every tab
 * rendered all of a page's heavy views (xG, attendance, history…) in the background on each
 * visit, and those renders queued ahead of the user's real navigation for the DB connections.
 */
export function UrlTabs({ tabs, active, layoutId }: { tabs: { id: string; label: string }[]; active: string; layoutId: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  return (
    <nav className="no-scrollbar sticky top-14 z-20 -mx-3 flex gap-0.5 overflow-x-auto border-b border-line bg-bg/85 px-3 backdrop-blur-xl sm:mx-0 sm:gap-1 sm:px-0">
      {tabs.map((t, i) => {
        const next = new URLSearchParams(params);
        if (i === 0) next.delete("tab");
        else next.set("tab", t.id);
        const qs = next.toString();
        const href = qs ? `${pathname}?${qs}` : pathname;
        const warm = active === t.id ? undefined : () => router.prefetch(href);
        return (
          <Link
            key={t.id}
            href={href}
            scroll={false}
            prefetch={false}
            onMouseEnter={warm}
            onTouchStart={warm}
            onFocus={warm}
            className={`label relative shrink-0 px-2.5 py-3 !text-[13px] transition-colors sm:px-3 sm:py-3.5 sm:!text-[15px] ${
              active === t.id ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
            {active === t.id ? <motion.span layoutId={layoutId} className="absolute inset-x-2 -bottom-px h-[3px] bg-live" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
