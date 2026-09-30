"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Navigation feedback the instant a link is clicked: a red line races along the top edge
 * pushed by a puck, and snaps to the boards when the new page arrives.
 */
export function NavProgress() {
  const here = usePathname() + "?" + useSearchParams().toString();
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      const key = url.pathname + "?" + url.searchParams.toString();
      const cur = location.pathname + "?" + new URLSearchParams(location.search).toString();
      if (key !== cur) setFrom(cur);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (from === null) return null;
  const arrived = from !== here;
  return (
    <div
      key={from}
      className={`nav-progress pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] ${arrived ? "nav-progress-done" : ""}`}
      onAnimationEnd={(e) => {
        if (arrived && e.animationName === "nav-fade") setFrom(null);
      }}
      aria-hidden
    >
      <div className="nav-progress-bar relative h-full bg-live shadow-[0_0_10px_var(--live)]">
        <span className="absolute -right-2 top-1/2 h-2.5 w-4 -translate-y-1/2 rounded-[50%] bg-fg ring-2 ring-bg" />
      </div>
    </div>
  );
}
