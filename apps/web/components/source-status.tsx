import type { SourceState } from "@/lib/server/fetcher";

const LABEL: Record<string, string> = { esports: "eSports.cz", nhl: "NHL", odds: "Kurzy", bets: "Sázky" };

/** Shows a small banner when any source is failing or serving stale data. */
export function SourceStatus({ sources }: { sources: Record<string, SourceState> }) {
  const bad = Object.entries(sources).filter(([, s]) => s === "error" || s === "stale");
  if (bad.length === 0) return null;
  return (
    <div className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold" role="status">
      {bad.map(([k, s]) => `${LABEL[k] ?? k}: ${s === "stale" ? "zpožděná data" : "nedostupné"}`).join(" · ")}
    </div>
  );
}
