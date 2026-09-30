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
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Centre-ice faceoff circle: the one mark in the brand. */
function Mark() {
  return (
    <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
      <circle cx="14" cy="14" r="12" fill="none" stroke="var(--accent)" strokeWidth="2.2" />
      <circle cx="14" cy="14" r="3.6" fill="var(--live)" />
      <path d="M2 14h7M19 14h7" stroke="var(--live)" strokeWidth="2.2" />
    </svg>
  );
}
