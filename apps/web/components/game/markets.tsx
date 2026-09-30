"use client";

import { matchMarkets, type Market, type MarketGroup } from "@hokejhub/core";
import { useMemo, useState } from "react";

const GROUPS: { key: MarketGroup; label: string }[] = [
  { key: "vysledek", label: "Výsledek" },
  { key: "handicap", label: "Hendikep" },
  { key: "goly", label: "Góly" },
  { key: "tretiny", label: "Třetiny" },
  { key: "prvni-gol", label: "První gól" },
  { key: "skore", label: "Přesný výsledek" },
];

const pct = (v: number) => `${Math.round(v * 100)} %`;
const odds = (v: number) => (Number.isFinite(v) ? v.toFixed(2).replace(".", ",") : "–");

/**
 * The bookmaker-style markets the model can price: 1X2 and winner incl. OT, ±1,5 handicaps,
 * totals, both to score, first-period and first-goal markets, top exact scores. Each row shows
 * the model's probability and the fair odds (1 / p), so a real price above it is value.
 */
export function Markets({ expHome, expAway, homeLabel, awayLabel }: { expHome: number; expAway: number; homeLabel: string; awayLabel: string }) {
  const [group, setGroup] = useState<MarketGroup>("handicap");
  const all = useMemo(() => matchMarkets(expHome, expAway, homeLabel, awayLabel), [expHome, expAway, homeLabel, awayLabel]);
  const rows: Market[] = all.filter((m) => m.group === group);
  return (
    <div>
      <div className="-mx-3 flex gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={group === g.key}
            onClick={() => setGroup(g.key)}
            className={`shrink-0 border px-2.5 py-1 text-xs font-semibold ${group === g.key ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-[11px] text-muted">
            <th className="py-1 text-left font-medium">Tip</th>
            <th className="w-16 py-1 text-right font-medium">Model</th>
            <th className="w-16 py-1 text-right font-medium" title="Férový kurz = 1 / pravděpodobnost. Kurz sázkovky vyšší než tento je value.">
              Fér kurz
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((m) => (
            <tr key={m.key} className="line-change">
              <td className="py-1.5 pr-2">
                <span className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${m.side === "home" ? "bg-home" : m.side === "away" ? "bg-away" : "bg-muted/50"}`} />
                {m.label}
              </td>
              <td className={`py-1.5 text-right tabular ${m.p >= 0.5 ? "font-semibold" : "text-muted"}`}>{pct(m.p)}</td>
              <td className="py-1.5 text-right tabular text-muted">{odds(m.odds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[11px] text-muted">
        Model pracuje se základní hrací dobou; „i po prodloužení“ dělí remízy podle síly týmů. Fér kurz je bez marže — sázkovka nabízí
        zpravidla o 5–10 % méně.
      </p>
    </div>
  );
}
