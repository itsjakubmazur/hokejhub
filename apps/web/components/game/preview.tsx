"use client";

import Link from "next/link";
import type { Game } from "@hokejhub/core";
import { seasonLabel } from "@/lib/format";
import type { ElhPreview, PreviewTeam } from "@/lib/server/preview";
import { PlayerPhoto } from "../player-photo";

const RES: Record<string, { t: string; cls: string }> = {
  W: { t: "V", cls: "bg-win text-white" },
  OTW: { t: "VP", cls: "bg-win/60 text-white" },
  T: { t: "R", cls: "bg-muted/40" },
  OTL: { t: "PP", cls: "bg-gold/70 text-black" },
  L: { t: "P", cls: "bg-live text-white" },
};

/** Side-by-side pre-game comparison of two extraliga teams. */
export function ElhPreviewPanel({ game, preview }: { game: Game; preview: ElhPreview }) {
  const { home, away } = preview;
  const per = (t: PreviewTeam, v: number) => (t.gp ? (v / t.gp).toFixed(2) : "–");
  const rows: [string, string, string, "high" | "low" | null, number, number][] = [
    ["Pořadí", home.rank ? `${home.rank}.` : "–", away.rank ? `${away.rank}.` : "–", "low", home.rank ?? 99, away.rank ?? 99],
    ["Body", String(home.pts), String(away.pts), "high", home.pts, away.pts],
    ["Body na zápas", per(home, home.pts), per(away, away.pts), "high", home.gp ? home.pts / home.gp : 0, away.gp ? away.pts / away.gp : 0],
    ["Góly na zápas", per(home, home.gf), per(away, away.gf), "high", home.gp ? home.gf / home.gp : 0, away.gp ? away.gf / away.gp : 0],
    ["Obdržené na zápas", per(home, home.ga), per(away, away.ga), "low", home.gp ? home.ga / home.gp : 9, away.gp ? away.ga / away.gp : 9],
    [
      "Doma / venku (body na zápas)",
      home.venueRecord?.gp ? (home.venueRecord.pts / home.venueRecord.gp).toFixed(2) : "–",
      away.venueRecord?.gp ? (away.venueRecord.pts / away.venueRecord.gp).toFixed(2) : "–",
      "high",
      home.venueRecord?.gp ? home.venueRecord.pts / home.venueRecord.gp : 0,
      away.venueRecord?.gp ? away.venueRecord.pts / away.venueRecord.gp : 0,
    ],
  ];
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted">
        Sezóna {seasonLabel(preview.season)}
        {preview.previousSeason ? " (nová sezóna má zatím málo zápasů, porovnáváme minulou)" : ""}
      </p>
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="label text-muted">
            <th className="pb-2 text-left">{game.home.shortName}</th>
            <th />
            <th className="pb-2 text-right">{game.away.shortName}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([label, hv, av, better, hn, an]) => {
            const hb = better === "high" ? hn > an : better === "low" ? hn < an : false;
            const ab = better === "high" ? an > hn : better === "low" ? an < hn : false;
            return (
              <tr key={label}>
                <td className={`py-2 ${hb ? "font-bold" : "text-muted"}`}>{hv}</td>
                <td className="py-2 text-center text-xs text-muted">{label}</td>
                <td className={`py-2 text-right ${ab ? "font-bold" : "text-muted"}`}>{av}</td>
              </tr>
            );
          })}
          <tr>
            <td className="py-2">
              <Form list={home.form} />
            </td>
            <td className="py-2 text-center text-xs text-muted">Forma (posledních 5)</td>
            <td className="py-2">
              <div className="flex justify-end">
                <Form list={away.form} />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="grid gap-5 sm:grid-cols-2">
        {([home, away] as const).map((t, i) => (
          <div key={t.teamId} className="space-y-4">
            <h3 className="label text-muted">{i === 0 ? game.home.shortName : game.away.shortName}</h3>
            <ul className="space-y-2">
              {t.leaders.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5">
                  <PlayerPhoto src={p.photo} alt={p.name} size={44} ring={i === 0 ? "home" : "away"} />
                  <Link href={`/hrac/${p.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent">
                    {p.name}
                  </Link>
                  <span className="text-xs text-muted tabular">
                    {p.gp} záp. · {p.g}+{p.a}
                  </span>
                  <span className="display w-8 text-right text-lg tabular">{p.pts}</span>
                </li>
              ))}
            </ul>
            {t.goalie ? (
              <div className="flex items-center gap-2.5 border-t border-line pt-3">
                <PlayerPhoto src={t.goalie.photo} alt={t.goalie.name} size={44} />
                <Link href={`/hrac/${t.goalie.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent">
                  {t.goalie.name}
                  <span className="block text-xs font-normal text-muted">brankář · {t.goalie.gp} záp.</span>
                </Link>
                <span className="text-right tabular">
                  <span className="display block text-lg">{t.goalie.svPct != null ? `${t.goalie.svPct.toFixed(1)} %` : "–"}</span>
                  <span className="text-[11px] text-muted">průměr {t.goalie.gaa?.toFixed(2) ?? "–"}</span>
                </span>
              </div>
            ) : null}
            <ul className="space-y-1 border-t border-line pt-3 text-sm">
              {t.last.map((g, j) => (
                <li key={j} className="flex items-center gap-2 tabular">
                  <span className={`grid h-5 w-7 place-items-center text-[10px] font-bold ${RES[g.result]?.cls ?? ""}`}>{RES[g.result]?.t}</span>
                  <span className="w-12 text-xs text-muted">{new Date(g.date).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}</span>
                  <span className="min-w-0 flex-1 truncate">{g.opponent}</span>
                  <span className="font-semibold">{g.score}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Form({ list }: { list: string[] }) {
  return (
    <div className="flex gap-0.5">
      {list.map((r, i) => (
        <span key={i} className={`grid h-5 w-6 place-items-center text-[10px] font-bold ${RES[r]?.cls ?? ""}`}>
          {RES[r]?.t}
        </span>
      ))}
    </div>
  );
}
