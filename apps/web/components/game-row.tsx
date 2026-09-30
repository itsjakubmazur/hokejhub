"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { impliedProbs, type Game, type Odds1x2 } from "@hokejhub/core";
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
export function GameRow({
  game,
  date,
  liveOdds,
  prediction,
}: {
  game: Game;
  date: string;
  liveOdds?: Odds1x2;
  /** Position in its list (kept for callers; rows no longer stagger). */
  index?: number;
  prediction?: { home: number; draw: number; away: number };
}) {
  const flash = useGoalFlash(game.homeScore, game.awayScore);
  const live = game.status === "live" || game.status === "intermission";
  const final = game.status === "final";
  const winner =
    final && game.homeScore !== null && game.awayScore !== null ? (game.homeScore > game.awayScore ? "home" : "away") : null;
  const odds = live ? (liveOdds ?? null) : game.preOdds;
  const periods = game.periods.slice(0, 4);
  const market = prediction && game.preOdds ? impliedProbs(game.preOdds) : null;

  return (
    <Link
      href={gameHref(game, date)}
      key={flash.home + flash.away}
      className={`puck-rail group grid grid-cols-[64px_1fr_auto] items-center gap-2 border-b border-line px-2 py-1 transition-colors sm:py-1.5 last:border-b-0 hover:bg-surface-2 sm:grid-cols-[72px_1fr_auto_auto] ${
        flash.home + flash.away > 0 ? "goal-sweep" : ""
      }`}
    >
      <StatusCell game={game} />
      <div className="min-w-0 space-y-0.5 sm:space-y-1">
        {(["home", "away"] as const).map((side) => (
          <div key={side} className="flex items-center gap-2">
            <TeamLogo team={game[side]} size={30} className="!size-[26px] sm:!size-[30px]" />
            <span
              className={`truncate text-sm sm:text-[15px] ${winner === side ? "font-bold" : winner ? "text-muted" : "font-medium"}`}
            >
              {game[side].shortName}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="space-y-0.5 text-right sm:space-y-1">
          {(["home", "away"] as const).map((side) => {
            const score = side === "home" ? game.homeScore : game.awayScore;
            return (
              <div
                key={`${side}${flash[side]}`}
                className={`display text-[17px] leading-[26px] tabular sm:text-[19px] sm:leading-[30px] ${live ? "text-live" : ""} ${flash[side] ? "goal-pop" : ""} ${
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
              <div key={i} className="w-4 space-y-0.5 text-center leading-[30px]">
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
              const value = !live && prediction && market && prediction[k] - market[k] > 0.04;
              return (
                <span
                  key={k}
                  title={prediction ? `model ${Math.round(prediction[k] * 100)} %${market ? ` · trh ${Math.round(market[k] * 100)} %` : ""}` : undefined}
                  className={`rounded bg-surface-2 px-1 py-1 text-center text-[11px] font-medium tabular ${value ? "ring-1 ring-win" : ""}`}
                >
                  {move === "▼" ? <ArrowDown className="mr-0.5 inline size-3 text-win" aria-hidden /> : move === "▲" ? <ArrowUp className="mr-0.5 inline size-3 text-live" aria-hidden /> : null}
                  {formatOdds(v)}
                </span>
              );
            })
          : null}
        {prediction && !live && !final ? (
          <div className="col-span-3 flex h-1 gap-px overflow-hidden rounded-full" title={`Model: ${Math.round(prediction.home * 100)} / ${Math.round(prediction.draw * 100)} / ${Math.round(prediction.away * 100)} %`}>
            <span className="bg-home" style={{ width: `${prediction.home * 100}%` }} />
            <span className="bg-muted/50" style={{ width: `${prediction.draw * 100}%` }} />
            <span className="bg-away" style={{ width: `${prediction.away * 100}%` }} />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
