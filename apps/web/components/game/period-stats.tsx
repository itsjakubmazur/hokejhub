"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Game, HokejczMatch, MatchPeriodStats, PeriodKey, ShotEvent } from "@hokejhub/core";
import { Segmented } from "./segmented";

interface Row {
  label: string;
  home: number;
  away: number;
  /** Display strings (e.g. "36/69 (52 %)"). */
  homeText?: string;
  awayText?: string;
  /** Lower is better (e.g. penalty minutes) → highlight the smaller value. */
  lowerIsBetter?: boolean;
  decimals?: number;
}

const PERIOD_LABEL: Record<PeriodKey, string> = { "1": "1. třetina", "2": "2. třetina", "3": "3. třetina", OT: "Prodloužení", total: "Zápas" };

function xgBy(shots: ShotEvent[] | null, homeId: string, period: PeriodKey): [number, number] | null {
  if (!shots?.some((s) => s.xg !== undefined)) return null;
  const inPeriod = shots.filter((s) => period === "total" || (period === "OT" ? s.period >= 4 : s.period === Number(period)));
  const h = inPeriod.filter((s) => s.teamId === homeId).reduce((a, s) => a + (s.xg ?? 0), 0);
  const a = inPeriod.filter((s) => s.teamId !== homeId).reduce((a2, s) => a2 + (s.xg ?? 0), 0);
  return [h, a];
}

function shotsBy(shots: ShotEvent[] | null, homeId: string, period: PeriodKey, types: ShotEvent["type"][]): [number, number] | null {
  if (!shots) return null;
  const inPeriod = shots.filter((s) => types.includes(s.type) && (period === "total" || s.period === Number(period)));
  return [inPeriod.filter((s) => s.teamId === homeId).length, inPeriod.filter((s) => s.teamId !== homeId).length];
}

function rowsFor(stats: MatchPeriodStats | null, box: HokejczMatch | null, shots: ShotEvent[] | null, game: Game, p: PeriodKey): Row[] {
  const rows: Row[] = [];
  const xg = xgBy(shots, game.home.id, p);
  if (xg) rows.push({ label: "Očekávané góly (xG)", home: xg[0], away: xg[1], decimals: 2 });
  const get = (s: MatchPeriodStats[keyof MatchPeriodStats] | undefined) => (s && !Array.isArray(s) ? (s as Record<string, [number, number]>)[p] : undefined);
  if (stats) {
    const sog = get(stats.shotsOnGoal);
    const miss = get(stats.missedShots);
    const blk = get(stats.blockedShots);
    if (sog && miss && blk) {
      rows.push({ label: "Střelecké pokusy", home: sog[0] + miss[0] + blk[0], away: sog[1] + miss[1] + blk[1] });
    }
    if (sog) rows.push({ label: "Střely na branku", home: sog[0], away: sog[1] });
    if (miss) rows.push({ label: "Střely mimo", home: miss[0], away: miss[1] });
    if (blk) rows.push({ label: "Zblokované střely", home: blk[0], away: blk[1] });
    const saves = sog && get(stats.goals) ? [sog[1] - get(stats.goals)![1], sog[0] - get(stats.goals)![0]] : null;
    if (saves) rows.push({ label: "Zákroky brankáře", home: saves[0]!, away: saves[1]! });
    const blocks = get(stats.blocks);
    if (blocks) rows.push({ label: "Bloky", home: blocks[0], away: blocks[1] });
    const hits = get(stats.hits);
    if (hits) rows.push({ label: "Hity", home: hits[0], away: hits[1] });
    const fw = get(stats.faceoffsWon);
    const ft = get(stats.faceoffsTotal);
    if (fw && ft && ft[0] + ft[1] > 0) {
      const tot = ft[0];
      const pct = (w: number) => (tot ? Math.round((w / tot) * 100) : 0);
      rows.push({
        label: "Vhazování",
        home: fw[0],
        away: fw[1],
        homeText: `${pct(fw[0])} % (${fw[0]}/${tot})`,
        awayText: `${pct(fw[1])} % (${fw[1]}/${tot})`,
      });
    }
    const pim = get(stats.penaltyMinutes);
    if (pim) rows.push({ label: "Trestné minuty", home: pim[0], away: pim[1], lowerIsBetter: true });
    const shift = get(stats.avgShift);
    if (shift && shift[0] + shift[1] > 0) rows.push({ label: "Průměrná délka střídání (s)", home: shift[0], away: shift[1], decimals: 0 });
  } else if (p === "total") {
    const fromShots = shotsBy(shots, game.home.id, p, ["goal", "shot-on-goal"]);
    if (fromShots) rows.push({ label: "Střely na branku", home: fromShots[0], away: fromShots[1] });
  }
  if (p === "total" && box) {
    const ts = box.teamStats;
    const add = (k: string, label = k, lowerIsBetter = false) => {
      const v = ts[k];
      if (v && !rows.some((r) => r.label === label)) rows.push({ label, home: v[0], away: v[1], lowerIsBetter });
    };
    if (!stats) {
      add("Střely na branku");
      add("Zblokované střely");
      add("Hity");
      add("Bloky");
      add("Vhazování");
      add("Trestné minuty", "Trestné minuty", true);
    }
    add("Využití", "Góly v přesilovce");
    add("V oslabení", "Góly v oslabení");
    add("Vyloučení", "Vyloučení", true);
    add("Radegast index");
  }
  return rows;
}

function StatRow({ r, i }: { r: Row; i: number }) {
  const total = Math.abs(r.home) + Math.abs(r.away);
  const hp = total ? Math.abs(r.home) / total : 0.5;
  const ap = total ? Math.abs(r.away) / total : 0.5;
  const homeBetter = r.lowerIsBetter ? r.home < r.away : r.home > r.away;
  const awayBetter = r.lowerIsBetter ? r.away < r.home : r.away > r.home;
  const fmt = (v: number) => (r.decimals !== undefined ? v.toFixed(r.decimals) : String(v));
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-center justify-between text-sm tabular">
        <span className={homeBetter ? "font-bold" : "text-muted"}>{r.homeText ?? fmt(r.home)}</span>
        <span className="text-xs font-medium text-muted">{r.label}</span>
        <span className={awayBetter ? "font-bold" : "text-muted"}>{r.awayText ?? fmt(r.away)}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="flex h-2 justify-end overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className={`h-full rounded-full ${homeBetter ? "bg-home" : "bg-home/45"}`}
            initial={{ width: 0 }}
            animate={{ width: `${hp * 100}%` }}
            transition={{ duration: 0.7, delay: i * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className={`h-full rounded-full ${awayBetter ? "bg-away" : "bg-away/45"}`}
            initial={{ width: 0 }}
            animate={{ width: `${ap * 100}%` }}
            transition={{ duration: 0.7, delay: i * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

export function PeriodStats({
  game,
  stats,
  box,
  shots,
}: {
  game: Game;
  stats: MatchPeriodStats | null;
  box: HokejczMatch | null;
  shots: ShotEvent[] | null;
}) {
  const periods: PeriodKey[] = stats?.periods ?? ["total"];
  const ordered: PeriodKey[] = ["total", ...periods.filter((p) => p !== "total")];
  const [period, setPeriod] = useState<PeriodKey>("total");
  const rows = useMemo(() => rowsFor(stats, box, shots, game, period), [stats, box, shots, game, period]);

  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted">Statistiky zatím nejsou k dispozici.</p>;
  return (
    <div>
      {ordered.length > 1 ? (
        <Segmented
          value={period}
          onChange={setPeriod}
          options={ordered.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
          className="mb-4"
        />
      ) : null}
      <div className="mb-1 flex justify-between text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-home" />
          {game.home.shortName}
        </span>
        <span className="flex items-center gap-1.5">
          {game.away.shortName}
          <span className="size-2 rounded-full bg-away" />
        </span>
      </div>
      <div key={period} className="divide-y divide-line">
        {rows.map((r, i) => (
          <StatRow key={r.label} r={r} i={i} />
        ))}
      </div>
    </div>
  );
}
