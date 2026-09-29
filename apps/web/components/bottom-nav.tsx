"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Zápasy", match: (p: string) => p === "/" || p.startsWith("/zapas"), icon: "M4 5h16v14H4zM4 10h16M9 5v14" },
  { href: "/liga/cz-elh", label: "Liga", match: (p: string) => p.startsWith("/liga") || p.startsWith("/tym"), icon: "M5 4h14v4a7 7 0 01-14 0zM9 18h6M12 15v3M5 6H3a3 3 0 003 4M19 6h2a3 3 0 01-3 4" },
  { href: "/predikce", label: "Predikce", match: (p: string) => p.startsWith("/predikce") || p.startsWith("/tipovacka"), icon: "M4 19l5-6 4 3 7-9M15 7h5v5" },
  { href: "/rekordy", label: "Rekordy", match: (p: string) => p.startsWith("/rekordy") || p.startsWith("/dnes") || p.startsWith("/porovnat"), icon: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" },
  { href: "/upozorneni", label: "Upozornění", match: (p: string) => p.startsWith("/upozorneni"), icon: "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0" },
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
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={it.icon} />
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
