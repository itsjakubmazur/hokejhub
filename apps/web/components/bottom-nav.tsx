"use client";

import { Bell, CalendarDays, ChartNoAxesColumnIncreasing, Medal, Trophy, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; match: (p: string) => boolean; icon: LucideIcon }[] = [
  { href: "/", label: "Zápasy", match: (p: string) => p === "/" || p.startsWith("/zapas"), icon: CalendarDays },
  { href: "/liga/cz-elh", label: "Liga", match: (p: string) => p.startsWith("/liga") || p.startsWith("/tym"), icon: Trophy },
  { href: "/predikce", label: "Predikce", match: (p: string) => p.startsWith("/predikce") || p.startsWith("/tipovacka"), icon: ChartNoAxesColumnIncreasing },
  { href: "/rekordy", label: "Rekordy", match: (p: string) => p.startsWith("/rekordy") || p.startsWith("/dnes") || p.startsWith("/porovnat") || p.startsWith("/historie"), icon: Medal },
  { href: "/upozorneni", label: "Upozornění", match: (p: string) => p.startsWith("/upozorneni"), icon: Bell },
];

/** Thumb-reach tab bar for phones (the PWA's main navigation). */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const on = it.match(path);
          return (
            <li key={it.href}>
              <Link href={it.href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${on ? "text-accent" : "text-muted"}`}>
                {on ? <motion.span layoutId="bottom-nav" className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent" /> : null}
                <it.icon className="size-5" strokeWidth={1.9} aria-hidden />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
