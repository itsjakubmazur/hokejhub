"use client";

import { Bell, CalendarDays, ChartNoAxesColumnIncreasing, Medal, Target, Trophy, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ITEMS: { href: string; label: string; match: (p: string) => boolean; icon: LucideIcon }[] = [
  { href: "/", label: "Zápasy", match: (p: string) => p === "/" || p.startsWith("/zapas"), icon: CalendarDays },
  { href: "/liga/cz-elh", label: "Liga", match: (p: string) => p.startsWith("/liga") || p.startsWith("/tym"), icon: Trophy },
  { href: "/predikce", label: "Predikce", match: (p: string) => p.startsWith("/predikce"), icon: ChartNoAxesColumnIncreasing },
  {
    href: "/rekordy",
    label: "Rekordy",
    match: (p: string) => p.startsWith("/rekordy") || p.startsWith("/dnes") || p.startsWith("/porovnat") || p.startsWith("/historie"),
    icon: Medal,
  },
  { href: "/tipovacka", label: "Tipovačka", match: (p: string) => p.startsWith("/tipovacka"), icon: Target },
  { href: "/upozorneni", label: "Upozornění", match: (p: string) => p.startsWith("/upozorneni"), icon: Bell },
];

/** True while the page is being scrolled down; flips back on any upward scroll or near the top. */
function useScrollingDown() {
  const [down, setDown] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        if (y < 40) setDown(false);
        else if (delta > 6) setDown(true);
        else if (delta < -6) setDown(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return down;
}

/**
 * Floating glass tab bar for phones, Livesport-style: a rounded pill with large icons and bold
 * labels, the current section in its own inner pill in the brand red. Reading down, it folds
 * sideways into a compact capsule of icons so the content gets the screen; the first scroll back
 * up brings the labels back.
 */
export function BottomNav() {
  const path = usePathname();
  const slim = useScrollingDown();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:hidden">
      <motion.nav
        layout
        aria-label="Hlavní navigace"
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        className={`glass-bar bottom-pill pointer-events-auto ${slim ? "rounded-full p-1" : "w-full max-w-md rounded-[30px] p-1.5"}`}
      >
        <ul className={slim ? "flex" : "grid grid-cols-6"}>
          {ITEMS.map((it) => {
            const on = it.match(path);
            return (
              <motion.li layout="position" key={it.href} transition={{ type: "spring", stiffness: 420, damping: 36 }}>
                <Link
                  href={it.href}
                  aria-current={on ? "page" : undefined}
                  aria-label={it.label}
                  className={`relative flex flex-col items-center justify-center rounded-full ${slim ? "size-10" : "gap-1 py-2"} ${
                    on ? "text-live" : "text-fg/80"
                  }`}
                >
                  {on ? (
                    <motion.span
                      layoutId="bottom-nav"
                      className="absolute inset-0 rounded-[24px] bg-fg/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  ) : null}
                  <it.icon className={`relative ${slim ? "size-5" : "size-6"}`} strokeWidth={on ? 2.2 : 1.8} aria-hidden />
                  {slim ? null : (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: 0.05 }}
                      className="relative whitespace-nowrap text-[10.5px] font-semibold leading-none tracking-[-0.01em]"
                    >
                      {it.label}
                    </motion.span>
                  )}
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </motion.nav>
    </div>
  );
}
