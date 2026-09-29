import Link from "next/link";
import { SearchPalette } from "./search-palette";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          <span>
            Hokej<span className="text-accent">Hub</span>
          </span>
        </Link>
        <nav className="ml-2 flex min-w-0 items-center gap-1 overflow-x-auto text-sm text-muted">
          <Link href="/" className="rounded-lg px-3 py-1.5 hover:bg-surface-2 hover:text-fg">
            Zápasy
          </Link>
          <Link href="/liga/cz-elh" className="rounded-lg px-3 py-1.5 hover:bg-surface-2 hover:text-fg">
            Extraliga
          </Link>
          <Link href="/predikce" className="hidden rounded-lg px-3 py-1.5 hover:bg-surface-2 hover:text-fg sm:inline">
            Predikce
          </Link>
          <Link href="/rekordy" className="hidden rounded-lg px-3 py-1.5 hover:bg-surface-2 hover:text-fg md:inline">
            Rekordy
          </Link>
          <Link href="/dnes-v-historii" className="hidden rounded-lg px-3 py-1.5 hover:bg-surface-2 hover:text-fg lg:inline">
            Tento den
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchPalette />
          <Link href="/upozorneni" aria-label="Upozornění" className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:text-fg">
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

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <ellipse cx="16" cy="19" rx="8" ry="3.2" fill="var(--bg)" />
      <ellipse cx="16" cy="17" rx="8" ry="3.2" fill="var(--text)" />
    </svg>
  );
}
