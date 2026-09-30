/** Puck sliding between two sticks — CSS only, so it works during server streaming. */
export function PuckLoader({ label = "Načítám…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-muted" role="status">
      <div className="relative h-10 w-44">
        <div className="absolute inset-x-0 bottom-1 h-px bg-line" />
        <svg viewBox="0 0 24 24" className="absolute bottom-0 left-0 size-8 -scale-x-100" aria-hidden>
          <path d="M20 2 L10 18 Q9 21 5 21 H2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="absolute bottom-0 right-0 size-8" aria-hidden>
          <path d="M20 2 L10 18 Q9 21 5 21 H2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className="puck-pass absolute bottom-1 left-6 h-2 w-4 rounded-[50%] bg-fg shadow-[0_2px_0_var(--border)]" />
      </div>
      <span className="text-xs">{label}</span>
    </div>
  );
}
