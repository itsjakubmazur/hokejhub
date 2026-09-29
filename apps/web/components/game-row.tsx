"use client";

import Link from "next/link";
import type { Game, Odds1x2 } from "@hokejhub/core";
import { formatOdds, formatTime } from "@/lib/format";
import { TeamLogo } from "./team-logo";
import { useGoalFlash } from "./use-goal-flash";

export function gameHref(game: Game, date: string) {
  return game.source === "nhl" ? `/zapas/${game.id}` : `/zapas/${game.id}?d=${date}`;
}

function StatusCell({ game }: { game: Game }) {
  const live = game.status === "live" || game.status === "intermission";
  if (live) {
    const label = game.status === "intermission" ? "Přestávka" : game.period && game.period <= 3 ? `${game.period}. třetina` : game.statusLabel;
    return (
      <div className="text-center text-[11px] font-bold leading-tight text-live">
        {label}
        {game.status === "live" && game.clock ? <div className="tabular">{game.clock}</div> : null}
      </div>
    );
  }
  if (game.status === "final") {
    return (
      <div className="text-center text-[11px] leading-tight text-muted">
        {game.decidedIn === "SO" ? "Po nájezdech" : game.decidedIn === "OT" ? "Po prodl." : "Konec"}
      </div>
    );
  }
  if (game.status === "postponed" || game.status === "cancelled") {
    return <div className="text-center text-[11px] leading-tight text-gold">{game.statusLabel}</div>;
  }
  return <div className="text-center text-sm font-medium tabular text-muted">{formatTime(game.startAt)}</div>;
}

/** One dense Livesport-style row: status · teams · score · period scores · 1X2. */
export function GameRow({ game, date, liveOdds, index }: { game: Game; date: string; liveOdds?: Odds1x2; index: number }) {
  const flash = useGoalFlash(game.homeScore, game.awayScore);
  const live = game.status === "live" || game.status === "intermission";
  const final = game.status === "final";
  const winner =
    final && game.homeScore !== null && game.awayScore !== null ? (game.homeScore > game.awayScore ? "home" : "away") : null;
  const odds = live ? (liveOdds ?? null) : game.preOdds;
  const periods = game.periods.slice(0, 4);

  return (
    <Link
      href={gameHref(game, date)}
      key={flash.home + flash.away}
      style={{ animationDelay: `${Math.min(index * 18, 400)}ms` }}
      className={`rise group grid grid-cols-[64px_1fr_auto] items-center gap-2 border-b border-line px-2 py-1.5 transition-colors last:border-b-0 hover:bg-surface-2 sm:grid-cols-[72px_1fr_auto_auto] ${
        flash.home + flash.away > 0 ? "goal-sweep" : ""
      }`}
    >
      <StatusCell game={game} />
      <div className="min-w-0 space-y-0.5">
        {(["home", "away"] as const).map((side) => (
          <div key={side} className="flex items-center gap-2">
            <TeamLogo team={game[side]} size={18} />
            <span
              className={`truncate text-[14px] ${winner === side ? "font-bold" : winner ? "text-muted" : "font-medium"}`}
            >
              {game[side].shortName}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="space-y-0.5 text-right">
          {(["home", "away"] as const).map((side) => {
            const score = side === "home" ? game.homeScore : game.awayScore;
            return (
              <div
                key={`${side}${flash[side]}`}
                className={`text-[14px] font-bold tabular ${live ? "text-live" : ""} ${flash[side] ? "goal-pop" : ""} ${
                  winner && winner !== side ? "font-medium text-muted" : ""
                }`}
              >
                {score ?? ""}
              </div>
            );
          })}
        </div>
        {periods.length > 0 ? (
          <div className="hidden gap-2 text-[12px] text-muted tabular sm:flex">
            {periods.map(([h, a], i) => (
              <div key={i} className="w-4 space-y-0.5 text-center">
                <div>{h}</div>
                <div>{a}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="hidden w-[150px] grid-cols-3 gap-1 sm:grid">
        {odds
          ? (["home", "draw", "away"] as const).map((k) => {
              const pre = game.preOdds?.[k];
              const v = odds[k];
              const move = live && v && pre ? (v < pre ? "▼" : v > pre ? "▲" : "") : "";
              return (
                <span key={k} className="rounded bg-surface-2 px-1 py-1 text-center text-[11px] font-medium tabular">
                  {move ? <span className={move === "▼" ? "text-win" : "text-live"}>{move}</span> : null}
                  {formatOdds(v)}
                </span>
              );
            })
          : null}
      </div>
    </Link>
  );
}
