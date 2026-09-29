import Link from "next/link";
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
        <nav className="ml-2 flex items-center gap-1 text-sm text-muted">
          <Link href="/" className="rounded-lg px-3 py-1.5 hover:bg-surface-2 hover:text-fg">
            Zápasy
          </Link>
        </nav>
        <div className="ml-auto">
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
