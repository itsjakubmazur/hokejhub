"use client";

import Link from "next/link";
import type { Game, Odds1x2 } from "@hokejhub/core";
import { formatOdds } from "@/lib/format";
import { StatusPill } from "./status-pill";
import { TeamLogo } from "./team-logo";
import { useGoalFlash } from "./use-goal-flash";

export function gameHref(game: Game, date: string) {
  return game.source === "nhl" ? `/zapas/${game.id}` : `/zapas/${game.id}?d=${date}`;
}

export function GameCard({ game, date, liveOdds }: { game: Game; date: string; liveOdds?: Odds1x2 }) {
  const flash = useGoalFlash(game.homeScore, game.awayScore);
  const live = game.status === "live" || game.status === "intermission";
  const final = game.status === "final";
  const winner = final && game.homeScore !== null && game.awayScore !== null
    ? game.homeScore > game.awayScore ? "home" : "away"
    : null;

  return (
    <Link
      href={gameHref(game, date)}
      key={flash.home + flash.away}
      className={`group relative block rounded-2xl border border-line bg-surface p-3.5 transition hover:border-accent/40 hover:shadow-[0_0_0_4px_var(--accent-soft)] active:scale-[0.99] ${flash.home + flash.away > 0 ? "goal-sweep" : ""}`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <StatusPill game={game} />
        {game.series ? <span className="text-[11px] text-muted">série {game.series}</span> : null}
      </div>

      {(["home", "away"] as const).map((side) => {
        const team = game[side];
        const score = side === "home" ? game.homeScore : game.awayScore;
        const dim = winner !== null && winner !== side;
        return (
          <div key={side} className={`flex items-center gap-2.5 py-1 ${dim ? "text-muted" : ""}`}>
            <TeamLogo team={team} size={26} />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{team.shortName}</span>
            <span
              key={flash[side]}
              className={`tabular text-lg font-semibold ${flash[side] ? "goal-pop" : ""} ${live ? "text-fg" : ""}`}
            >
              {score ?? ""}
            </span>
          </div>
        );
      })}

      {game.periods.length > 0 ? (
        <div className="mt-1.5 flex gap-2 text-[11px] text-muted tabular">
          {game.periods.map(([h, a], i) => (
            <span key={i}>
              {h}:{a}
            </span>
          ))}
          {game.decidedIn && game.decidedIn !== "REG" ? <span>· {game.decidedIn === "OT" ? "PP" : "SN"}</span> : null}
        </div>
      ) : null}

      <OddsStrip pre={game.preOdds} live={live ? liveOdds : undefined} />
    </Link>
  );
}

function OddsStrip({ pre, live }: { pre: Odds1x2 | null; live?: Odds1x2 }) {
  const odds = live ?? pre;
  if (!odds) return null;
  const cells: [string, keyof Odds1x2][] = [["1", "home"], ["0", "draw"], ["2", "away"]];
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      {cells.map(([label, key]) => {
        const v = odds[key];
        const p = pre?.[key];
        const move = live && v && p ? (v < p ? "down" : v > p ? "up" : null) : null;
        return (
          <div key={key} className="flex items-center justify-between rounded-lg bg-surface-2 px-2 py-1 text-xs tabular">
            <span className="text-muted">{label}</span>
            <span className="flex items-center gap-0.5 font-medium">
              {move === "down" ? <span className="text-win">▼</span> : move === "up" ? <span className="text-live">▲</span> : null}
              {formatOdds(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
