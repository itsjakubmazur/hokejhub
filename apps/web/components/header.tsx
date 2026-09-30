import { Bell } from "lucide-react";
import Link from "next/link";
import { SearchPalette } from "./search-palette";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "Zápasy" },
  { href: "/liga/cz-elh", label: "Extraliga" },
  { href: "/predikce", label: "Predikce" },
  { href: "/rekordy", label: "Rekordy" },
  { href: "/historie", label: "Historie" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="HokejHub – úvod">
          <Mark />
          <span className="display text-[1.6rem] leading-none tracking-wide">
            Hokej<span className="text-live">Hub</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-5 sm:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="label text-muted transition-colors hover:text-fg">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchPalette />
          <Link href="/upozorneni" aria-label="Upozornění" className="grid size-9 place-items-center border border-line text-muted hover:text-fg">
            <Bell className="size-4" aria-hidden />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Faceoff circle with hash marks, the same mark as the app icon. */
function Mark() {
  return (
    <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
      <path d="M2.5 10.8h4.6M2.5 17.2h4.6M20.9 10.8h4.6M20.9 17.2h4.6" stroke="var(--live)" strokeWidth="1.8" />
      <circle cx="14" cy="14" r="8.3" fill="none" stroke="var(--accent)" strokeWidth="2.4" />
      <circle cx="14" cy="14" r="2.9" fill="var(--live)" />
    </svg>
  );
}
