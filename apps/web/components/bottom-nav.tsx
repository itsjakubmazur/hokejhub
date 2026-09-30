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
 * Floating glass tab bar for phones. Reading down, it folds to a slim row of icons so the
 * content gets the screen; the first scroll back up brings the labels back.
 */
export function BottomNav() {
  const path = usePathname();
  const slim = useScrollingDown();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:hidden">
      <motion.nav
        aria-label="Hlavní navigace"
        animate={{ scale: slim ? 0.94 : 1, y: slim ? 4 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="glass-bar pointer-events-auto w-full max-w-md rounded-[26px]"
      >
        <ul className="grid grid-cols-6">
          {ITEMS.map((it) => {
            const on = it.match(path);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-[padding] duration-200 ${
                    slim ? "py-2" : "py-2.5"
                  } ${on ? "text-accent" : "text-muted"}`}
                >
                  {on ? (
                    <motion.span
                      layoutId="bottom-nav"
                      className="absolute inset-1 rounded-2xl bg-accent/12"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  ) : null}
                  <it.icon className="relative size-5" strokeWidth={on ? 2.2 : 1.9} aria-hidden />
                  <motion.span
                    className="relative overflow-hidden whitespace-nowrap leading-tight"
                    animate={{ height: slim ? 0 : 13, opacity: slim ? 0 : 1 }}
                    transition={{ duration: 0.18 }}
                  >
                    {it.label}
                  </motion.span>
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.nav>
    </div>
  );
}
