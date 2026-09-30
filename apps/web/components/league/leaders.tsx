"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fmtToi } from "@/lib/names";
import { ClubLogo } from "../club-logo";
import { PlayerPhoto } from "../player-photo";
import type { SkaterSeasonRow } from "@/lib/server/queries";

type Key = "pts" | "g" | "a" | "pm" | "sog" | "xg" | "gax" | "hits" | "blk" | "pim" | "toi_avg" | "fo";

const COLS: { key: Key; label: string; title: string }[] = [
  { key: "g", label: "G", title: "Góly" },
  { key: "a", label: "A", title: "Asistence" },
  { key: "pts", label: "B", title: "Kanadské body" },
  { key: "pm", label: "+/−", title: "Plus/minus" },
  { key: "sog", label: "S", title: "Střely na branku" },
  { key: "xg", label: "xG", title: "Očekávané góly" },
  { key: "gax", label: "G−xG", title: "Góly nad očekávání (efektivita zakončení)" },
  { key: "hits", label: "H", title: "Hity" },
  { key: "blk", label: "BL", title: "Bloky" },
  { key: "pim", label: "TM", title: "Trestné minuty" },
  { key: "fo", label: "Buly %", title: "Úspěšnost vhazování (min. 20)" },
  { key: "toi_avg", label: "TOI", title: "Průměrný čas na ledě" },
];

function val(r: SkaterSeasonRow, k: Key): number {
  if (k === "gax") return r.xg != null ? r.g - r.xg : -99;
  if (k === "fo") return r.fo_taken >= 20 ? r.fo_w / r.fo_taken : -1;
  return (r[k] as number | null) ?? -99;
}

export function Leaders({ rows, initialSort = "pts", showTeam = true }: { rows: SkaterSeasonRow[]; initialSort?: Key; showTeam?: boolean }) {
  const [sort, setSort] = useState<Key>(initialSort);
  const sorted = useMemo(() => [...rows].sort((a, b) => val(b, sort) - val(a, sort) || b.pts - a.pts), [rows, sort]);
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[760px] text-sm tabular">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="py-2 pr-2 text-left font-medium">#</th>
            <th className="py-2 pr-2 text-left font-medium">Hráč</th>
            {showTeam ? <th className="px-1.5 text-left font-medium">Tým</th> : null}
            <th className="px-1.5 text-right font-medium">Z</th>
            {COLS.map((c) => (
              <th key={c.key} className="px-1.5 text-right font-medium">
                <button title={c.title} onClick={() => setSort(c.key)} className={sort === c.key ? "text-accent" : "hover:text-fg"}>
                  {c.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((r, i) => (
            <tr key={r.player_id} className="hover:bg-surface-2">
              <td className="py-1.5 pr-2 text-muted">{i + 1}.</td>
              <td className="whitespace-nowrap py-1.5 pr-2 font-medium">
                <PlayerPhoto src={r.headshot} alt={r.name} size={36} className="mr-2 align-middle" />
                <Link href={`/hrac/${r.player_id}`} className="hover:text-accent">
                  {r.name}
                </Link>
                {r.position ? <span className="ml-1 text-xs text-muted">{r.position}</span> : null}
              </td>
              {showTeam ? (
                <td className="px-1.5">
                  <Link href={`/tym/${r.team_id}`} className="flex items-center gap-1.5 text-muted hover:text-accent">
                    <ClubLogo src={r.team_logo} alt={r.team_abbrev} size={24} />
                    {r.team_abbrev}
                  </Link>
                </td>
              ) : null}
              <td className="px-1.5 text-right">{r.gp}</td>
              {COLS.map((c) => {
                const v = val(r, c.key);
                let text: string;
                if (c.key === "toi_avg") text = fmtToi(r.toi_avg);
                else if (c.key === "xg") text = r.xg != null ? r.xg.toFixed(2) : "–";
                else if (c.key === "gax") text = r.xg != null ? `${v > 0 ? "+" : ""}${v.toFixed(2)}` : "–";
                else if (c.key === "fo") text = v >= 0 ? `${Math.round(v * 100)} %` : "–";
                else if (c.key === "pm") text = `${v > 0 ? "+" : ""}${v}`;
                else text = String(v);
                return (
                  <td
                    key={c.key}
                    className={`px-1.5 text-right ${sort === c.key ? "font-bold" : ""} ${
                      (c.key === "pm" || c.key === "gax") && v > 0 && v !== -99 ? "text-win" : (c.key === "pm" || c.key === "gax") && v < 0 && v !== -99 ? "text-live" : ""
                    }`}
                  >
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
