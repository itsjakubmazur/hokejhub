import { Sparkles } from "lucide-react";

export interface ModelTipChip {
  label: string;
  p: number;
  side?: "home" | "away" | "none";
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** The model's few tips worth writing down for a game — handicap, goals, first goal — as chips. */
export function ModelTips({ tips, className = "" }: { tips: ModelTipChip[]; className?: string }) {
  if (!tips.length) return null;
  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Tipy modelu">
      <li className="flex items-center gap-1 text-[11px] text-muted">
        <Sparkles className="size-3" aria-hidden /> tipy modelu
      </li>
      {tips.map((t) => (
        <li
          key={t.label}
          className={`flex items-center gap-1.5 border px-2 py-0.5 text-[11px] ${
            t.side === "home" ? "border-home/40" : t.side === "away" ? "border-away/40" : "border-line"
          }`}
        >
          <span className="font-medium">{t.label}</span>
          <span className="tabular text-muted">{pct(t.p)}</span>
        </li>
      ))}
    </ul>
  );
}
