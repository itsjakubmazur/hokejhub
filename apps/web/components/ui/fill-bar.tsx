export function FillBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-muted">–</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
        <span className={`block h-full rounded-full ${pct >= 98 ? "bg-win" : "bg-accent"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </span>
      <span className="w-12 text-right">{pct.toFixed(1)} %</span>
    </span>
  );
}

