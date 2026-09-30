"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Tab bar driven by `?tab=` so each view is linkable; animated underline. */
export function UrlTabs({ tabs, active, layoutId }: { tabs: { id: string; label: string }[]; active: string; layoutId: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <nav className="no-scrollbar sticky top-14 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-line bg-bg/85 px-4 backdrop-blur-xl sm:mx-0 sm:px-0">
      {tabs.map((t, i) => {
        const next = new URLSearchParams(params);
        if (i === 0) next.delete("tab");
        else next.set("tab", t.id);
        const qs = next.toString();
        return (
          <Link
            key={t.id}
            href={qs ? `${pathname}?${qs}` : pathname}
            scroll={false}
            prefetch
            className={`label relative shrink-0 px-3 py-3.5 transition-colors ${
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
