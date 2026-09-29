"use client";

import { useMemo, useState } from "react";
import type { Game, PlayerMatchStats, PlayerPeriodLine } from "@hokejhub/core";
import { fmtToi } from "@/lib/names";
import { Segmented } from "./segmented";

type Key = keyof PlayerPeriodLine;

const COLS: { key: Key; label: string; title: string }[] = [
  { key: "goals", label: "G", title: "Góly" },
  { key: "assists", label: "A", title: "Asistence" },
  { key: "points", label: "B", title: "Body" },
  { key: "plusMinus", label: "+/−", title: "Plus/minus" },
  { key: "shots", label: "S", title: "Střely na branku" },
  { key: "shotsBlocked", label: "SZ", title: "Střely zblokované soupeřem" },
  { key: "blocks", label: "BL", title: "Zblokované střely soupeře" },
  { key: "hits", label: "H", title: "Hity" },
  { key: "pim", label: "TM", title: "Trestné minuty" },
  { key: "shifts", label: "Stř", title: "Počet střídání" },
  { key: "toi", label: "TOI", title: "Čas na ledě" },
  { key: "ri", label: "RI", title: "Radegast index" },
];

export function PlayersTable({ game, stats }: { game: Game; stats: { home: PlayerMatchStats[]; away: PlayerMatchStats[] } }) {
  const [side, setSide] = useState<"home" | "away">("home");
  const [period, setPeriod] = useState<"all" | "0" | "1" | "2" | "3">("all");
  const [sort, setSort] = useState<Key>("toi");
  const maxPeriods = Math.max(0, ...stats[side].map((p) => p.periods.length));

  const rows = useMemo(() => {
    const list = stats[side]
      .filter((p) => p.position !== "GK" && p.position !== "B")
      .map((p) => ({ p, line: period === "all" ? (p as PlayerPeriodLine) : p.periods[Number(period)] }))
      .filter((r): r is { p: PlayerMatchStats; line: PlayerPeriodLine } => Boolean(r.line));
    return list.sort((a, b) => (b.line[sort] ?? 0) - (a.line[sort] ?? 0));
  }, [stats, side, period, sort]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Segmented
          value={side}
          onChange={setSide}
          options={[
            { value: "home", label: game.home.shortName },
            { value: "away", label: game.away.shortName },
          ]}
        />
        {maxPeriods > 1 ? (
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: "all", label: "Zápas" },
              ...Array.from({ length: Math.min(maxPeriods, 3) }, (_, i) => ({
                value: String(i) as "0" | "1" | "2",
                label: `${i + 1}. tř.`,
              })),
            ]}
          />
        ) : null}
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[680px] text-xs tabular">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-1.5 pr-2 text-left font-medium">#</th>
              <th className="py-1.5 pr-2 text-left font-medium">Hráč</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-1.5 py-1.5 text-right font-medium">
                  <button title={c.title} onClick={() => setSort(c.key)} className={sort === c.key ? "text-accent" : "hover:text-fg"}>
                    {c.label}
                  </button>
                </th>
              ))}
              <th className="py-1.5 pl-1.5 text-right font-medium" title="Vyhraná vhazování">
                Buly
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ p, line }) => (
              <tr key={p.id} className="transition-colors hover:bg-surface-2">
                <td className="py-1.5 pr-2 text-muted">{p.jersey}</td>
                <td className="whitespace-nowrap py-1.5 pr-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-1 text-muted">{p.position === "O" || p.position === "BK" ? "O" : "Ú"}</span>
                </td>
                {COLS.map((c) => {
                  const v = line[c.key];
                  return (
                    <td
                      key={c.key}
                      className={`px-1.5 py-1.5 text-right ${sort === c.key ? "font-semibold" : ""} ${
                        c.key === "plusMinus" && v > 0 ? "text-win" : c.key === "plusMinus" && v < 0 ? "text-live" : ""
                      }`}
                    >
                      {c.key === "toi" ? fmtToi(v) : c.key === "plusMinus" && v > 0 ? `+${v}` : v}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap py-1.5 pl-1.5 text-right">
                  {line.faceoffs ? `${line.faceoffsWon}/${line.faceoffs}` : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
