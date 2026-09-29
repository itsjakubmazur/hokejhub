import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlayerPhoto } from "@/components/player-photo";
import { PlayerPicker } from "@/components/player-picker";
import { Card, Empty } from "@/components/ui/card";
import { seasonLabel } from "@/lib/format";
import { fmtToi } from "@/lib/names";
import { dbAvailable } from "@/lib/server/db";
import { careerTotals } from "@/lib/server/hub";
import { getPlayer, getPlayerSeasons } from "@/lib/server/queries";

export const metadata: Metadata = { title: "Porovnání hráčů" };

type Totals = NonNullable<Awaited<ReturnType<typeof careerTotals>>>;

const ROWS: { label: string; get: (t: Totals) => number | null; fmt?: (v: number) => string; lowerBetter?: boolean }[] = [
  { label: "Zápasy", get: (t) => t.gp },
  { label: "Góly", get: (t) => t.goals },
  { label: "Asistence", get: (t) => t.assists },
  { label: "Body", get: (t) => t.points },
  { label: "Body na zápas", get: (t) => (t.gp ? t.points / t.gp : null), fmt: (v) => v.toFixed(2) },
  { label: "Góly na zápas", get: (t) => (t.gp ? t.goals / t.gp : null), fmt: (v) => v.toFixed(2) },
  { label: "+/−", get: (t) => t.plus_minus, fmt: (v) => (v > 0 ? `+${v}` : String(v)) },
  { label: "Střely na branku", get: (t) => t.shots },
  { label: "Úspěšnost střelby", get: (t) => (t.shots ? t.goals / t.shots : null), fmt: (v) => `${(v * 100).toFixed(1)} %` },
  { label: "xG", get: (t) => t.xg, fmt: (v) => v.toFixed(1) },
  { label: "Góly − xG", get: (t) => (t.xg != null ? t.goals - t.xg : null), fmt: (v) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) },
  { label: "Hity", get: (t) => t.hits },
  { label: "Blokované střely", get: (t) => t.blocks },
  { label: "Vhazování %", get: (t) => (t.fo_taken >= 50 ? t.fo_w / t.fo_taken : null), fmt: (v) => `${(v * 100).toFixed(1)} %` },
  { label: "Průměrný čas na ledě", get: (t) => t.toi_avg, fmt: (v) => fmtToi(v) },
  { label: "Trestné minuty", get: (t) => t.pim, lowerBetter: true },
  { label: "Sezóny", get: (t) => t.seasons },
];

async function load(id: string | undefined) {
  if (!id) return null;
  const [player, totals, seasons] = await Promise.all([getPlayer(id), careerTotals(id), getPlayerSeasons(id)]);
  return player && totals ? { player, totals, seasons: seasons.filter((s) => s.phase === "regular") } : null;
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  if (!dbAvailable()) return <Empty>Databáze není připojena.</Empty>;
  const { a, b } = await searchParams;
  const [A, B] = await Promise.all([load(a), load(b)]);
  const sides = [A, B] as const;

  // Points per season, aligned by career year so different eras compare fairly.
  const series = sides.map((s) => {
    if (!s) return [];
    const bySeason = new Map<number, number>();
    for (const r of s.seasons) bySeason.set(r.season, (bySeason.get(r.season) ?? 0) + Number(r.pts));
    return [...bySeason.entries()].sort((x, y) => x[0] - y[0]);
  });
  const maxLen = Math.max(1, ...series.map((x) => x.length));
  const maxPts = Math.max(1, ...series.flat().map(([, v]) => v));

  return (
    <div className="space-y-4">
      <h1 className="rise text-3xl font-black tracking-tight">Porovnání hráčů</h1>
      <div className="grid grid-cols-2 gap-3">
        {sides.map((s, i) => (
          <div key={i} className="rise space-y-3 rounded-2xl border border-line bg-surface p-4 text-center">
            <Suspense>
              <PlayerPicker param={i === 0 ? "a" : "b"} placeholder={i === 0 ? "První hráč…" : "Druhý hráč…"} />
            </Suspense>
            {s ? (
              <Link href={`/hrac/${s.player.id}`} className="block">
                <PlayerPhoto src={s.player.headshot} alt={s.player.name} size={96} ring={i === 0 ? "home" : "away"} className="mx-auto" />
                <div className="mt-2 text-lg font-bold">{s.player.name}</div>
                <div className="text-xs text-muted">
                  {s.player.current_team_name ?? ""}
                  {s.player.birth_date ? ` · nar. ${s.player.birth_date.slice(0, 4)}` : ""}
                </div>
              </Link>
            ) : (
              <div className="py-10 text-sm text-muted">Vyber hráče</div>
            )}
          </div>
        ))}
      </div>

      {A && B ? (
        <>
          <Card title="Kariéra v extralize">
            <table className="w-full text-sm tabular">
              <tbody className="divide-y divide-line">
                {ROWS.map((r) => {
                  const va = r.get(A.totals);
                  const vb = r.get(B.totals);
                  const both = va != null && vb != null;
                  const aWins = both && va !== vb && (r.lowerBetter ? va < vb : va > vb);
                  const bWins = both && va !== vb && !aWins;
                  const share = both && Math.abs(va) + Math.abs(vb) > 0 ? Math.abs(va) / (Math.abs(va) + Math.abs(vb)) : 0.5;
                  const f = (v: number | null) => (v == null ? "–" : r.fmt ? r.fmt(v) : v.toLocaleString("cs-CZ"));
                  return (
                    <tr key={r.label}>
                      <td className={`w-24 py-2 text-left ${aWins ? "font-bold text-home" : ""}`}>{f(va)}</td>
                      <td className="py-2">
                        <div className="text-center text-xs text-muted">{r.label}</div>
                        <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                          <div className="rounded-l-full bg-home transition-all" style={{ width: `${share * 100}%`, opacity: aWins ? 1 : 0.35 }} />
                          <div className="flex-1 rounded-r-full bg-away" style={{ opacity: bWins ? 1 : 0.35 }} />
                        </div>
                      </td>
                      <td className={`w-24 py-2 text-right ${bWins ? "font-bold text-away" : ""}`}>{f(vb)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card title="Body v základní části podle roku kariéry">
            <div className="flex h-44 items-end gap-1.5">
              {Array.from({ length: maxLen }, (_, k) => (
                <div key={k} className="flex h-full flex-1 flex-col justify-end">
                  <div className="flex h-full items-end justify-center gap-0.5">
                    {series.map((s, i) => {
                      const e = s[k];
                      return (
                        <div
                          key={i}
                          title={e ? `${sides[i]!.player.name}: ${seasonLabel(e[0])} – ${e[1]} b.` : ""}
                          className={`grow-bar w-full max-w-4 rounded-t ${i === 0 ? "bg-home" : "bg-away"}`}
                          style={{ height: e ? `${(e[1] / maxPts) * 100}%` : 0, animationDelay: `${k * 40}ms` }}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-1 text-center text-[10px] text-muted tabular">{k + 1}.</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-home" /> {A.player.name}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-away" /> {B.player.name}
              </span>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
