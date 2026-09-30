"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GameRowDb } from "@/lib/server/queries";
import { Segmented } from "../game/segmented";
import { ClubLogo } from "../club-logo";

type Where = "all" | "home" | "away";
type Phase = "all" | "regular" | "playoff";

export function TeamResults({ teamId, games }: { teamId: string; games: GameRowDb[] }) {
  const [where, setWhere] = useState<Where>("all");
  const [phase, setPhase] = useState<Phase>("all");
  const list = useMemo(
    () =>
      games
        .filter((g) => (where === "all" ? true : where === "home" ? g.home_team_id === teamId : g.away_team_id === teamId))
        .filter((g) => phase === "all" || g.phase === phase)
        .slice()
        .reverse(),
    [games, where, phase, teamId],
  );
  const hasPlayoff = games.some((g) => g.phase === "playoff");
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Segmented value={where} onChange={setWhere} options={[{ value: "all", label: "Vše" }, { value: "home", label: "Doma" }, { value: "away", label: "Venku" }]} />
        {hasPlayoff ? (
          <Segmented value={phase} onChange={setPhase} options={[{ value: "all", label: "Celá sezóna" }, { value: "regular", label: "Základní část" }, { value: "playoff", label: "Play-off" }]} />
        ) : null}
      </div>
      <ol className="divide-y divide-line">
        {list.map((g) => {
          const home = g.home_team_id === teamId;
          const played = g.status === "final" && g.home_score !== null;
          const gf = home ? g.home_score : g.away_score;
          const ga = home ? g.away_score : g.home_score;
          const won = played && gf! > ga!;
          const ot = g.decided_in === "OT" || g.decided_in === "SO";
          const tie = played && gf === ga;
          const badge = !played ? null : tie ? "R" : won ? (ot ? "VP" : "V") : ot ? "PP" : "P";
          const color = badge === "V" ? "bg-win" : badge === "VP" ? "bg-win/60" : badge === "R" ? "bg-muted/60" : badge === "PP" ? "bg-gold/70 text-black" : "bg-live";
          const xgf = home ? g.xg_home : g.xg_away;
          const xga = home ? g.xg_away : g.xg_home;
          return (
            <li key={g.id}>
              <Link href={`/zapas/${g.id}`} className="grid grid-cols-[52px_28px_1fr_auto] items-center gap-2 py-2 text-sm hover:bg-surface-2 sm:grid-cols-[64px_28px_1fr_auto_auto]">
                <span className="text-xs text-muted tabular">
                  {new Date(g.start_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
                </span>
                <span className="text-center text-[10px] font-semibold uppercase text-muted">{home ? "doma" : "venku"}</span>
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <ClubLogo src={home ? g.away_logo : g.home_logo} alt="" size={26} />
                  <span className="truncate font-medium">{home ? g.away_name : g.home_name}</span>
                  {g.phase === "playoff" && g.round ? <span className="ml-1.5 text-xs text-muted">{g.round}</span> : null}
                </span>
                {xgf != null && xga != null ? (
                  <span className="hidden text-xs text-muted tabular sm:block" title="xG pro : proti">
                    xG {xgf.toFixed(1)}:{xga.toFixed(1)}
                  </span>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <span className="flex items-center gap-2 font-bold tabular">
                  {played ? `${gf}:${ga}` : "–"}
                  {badge ? <span className={`grid h-5 min-w-6 place-items-center rounded text-[10px] text-white ${color}`}>{badge}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
