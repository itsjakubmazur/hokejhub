"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Game } from "@hokejhub/core";
import type { GameRowDb } from "@/lib/server/queries";
import { Segmented } from "./segmented";

export function HeadToHead({ game, games, teamIds }: { game: Game; games: GameRowDb[]; teamIds: { home: string; away: string } }) {
  const [where, setWhere] = useState<"all" | "home">("all");
  const list = useMemo(() => (where === "home" ? games.filter((g) => g.home_team_id === teamIds.home) : games), [games, where, teamIds.home]);
  const s = useMemo(() => {
    let hw = 0;
    let aw = 0;
    let ot = 0;
    let goals = 0;
    for (const g of list) {
      const homeIsA = g.home_team_id === teamIds.home;
      const aGoals = homeIsA ? g.home_score! : g.away_score!;
      const bGoals = homeIsA ? g.away_score! : g.home_score!;
      if (aGoals > bGoals) hw++;
      else aw++;
      if (g.decided_in === "OT" || g.decided_in === "SO") ot++;
      goals += g.home_score! + g.away_score!;
    }
    return { hw, aw, ot, avg: list.length ? goals / list.length : 0 };
  }, [list, teamIds.home]);

  if (games.length === 0) return <p className="py-8 text-center text-sm text-muted">Týmy se zatím v naší databázi nepotkaly.</p>;
  const total = s.hw + s.aw || 1;
  return (
    <div className="space-y-4">
      <Segmented
        value={where}
        onChange={setWhere}
        options={[
          { value: "all", label: "Všechny zápasy" },
          { value: "home", label: `${game.home.shortName} doma` },
        ]}
      />
      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-black tabular">{s.hw}</div>
            <div className="text-xs text-muted">výher {game.home.shortName}</div>
          </div>
          <div className="text-center text-xs text-muted tabular">
            {list.length} zápasů · {s.ot}× po prodl./SN
            <br />Ø {s.avg.toFixed(1)} gólu na zápas
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tabular">{s.aw}</div>
            <div className="text-xs text-muted">výher {game.away.shortName}</div>
          </div>
        </div>
        <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          <motion.div className="rounded-l-full bg-home" initial={{ width: 0 }} animate={{ width: `${(s.hw / total) * 100}%` }} transition={{ duration: 0.8 }} />
          <motion.div className="rounded-r-full bg-away" initial={{ width: 0 }} animate={{ width: `${(s.aw / total) * 100}%` }} transition={{ duration: 0.8 }} />
        </div>
      </div>
      <ol className="divide-y divide-line">
        {list.map((g) => {
          const homeWon = g.home_score! > g.away_score!;
          return (
            <li key={g.id}>
              <Link href={`/zapas/${g.id}`} className="grid grid-cols-[70px_1fr_auto_1fr] items-center gap-2 py-2 text-sm hover:bg-surface-2">
                <span className="text-xs text-muted tabular">{new Date(g.start_at).toLocaleDateString("cs-CZ")}</span>
                <span className={`truncate text-right ${homeWon ? "font-bold" : "text-muted"}`}>{g.home_name}</span>
                <span className="rounded-md bg-surface-2 px-2 py-0.5 font-bold tabular">
                  {g.home_score}:{g.away_score}
                  {g.decided_in && g.decided_in !== "REG" ? <span className="ml-1 text-[10px] text-muted">{g.decided_in === "OT" ? "PP" : "SN"}</span> : null}
                </span>
                <span className={`truncate ${!homeWon ? "font-bold" : "text-muted"}`}>
                  {g.away_name}
                  {g.phase === "playoff" ? <span className="ml-1.5 text-[10px] font-semibold uppercase text-accent">PO</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
