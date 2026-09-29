"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { impliedProbs, pragueDate, type BetDistribution, type Game, type Odds1x2 } from "@hokejhub/core";
import type { GameDetailResponse } from "@/lib/types";
import { formatDayLong, formatOdds, formatPct, formatTime } from "@/lib/format";
import { GamblingNotice } from "./gambling-notice";
import { ShotMap } from "./shot-map";
import { SourceStatus } from "./source-status";
import { StatusPill } from "./status-pill";
import { TeamLogo } from "./team-logo";
import { useGoalFlash } from "./use-goal-flash";

const easternDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));

const isLive = (g: Game) => g.status === "live" || g.status === "intermission";

export function GameCenter({ id, date, initial }: { id: string; date?: string; initial: GameDetailResponse }) {
  const { data } = useQuery({
    queryKey: ["game", id],
    queryFn: async (): Promise<GameDetailResponse> => {
      const res = await fetch(`/api/game/${id}${date ? `?d=${date}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    initialData: initial,
    refetchInterval: (q) => (q.state.data && isLive(q.state.data.game) ? 15_000 : false),
  });
  const { game } = data;
  const day = game.source === "nhl" ? easternDate(game.startAt) : pragueDate(new Date(game.startAt));

  return (
    <div className="space-y-4">
      <Link href={day === pragueDate() ? "/" : `/?date=${day}`} className="text-sm text-muted hover:text-fg">
        ← {game.leagueName}
      </Link>

      <Scoreline game={game} />
      <SourceStatus sources={data.sources} />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {data.shots && data.shots.length > 0 ? (
            <Card title="Mapa střel">
              <ShotMap
                shots={data.shots}
                homeId={game.home.id}
                players={data.players}
                homeAbbrev={game.home.abbrev}
                awayAbbrev={game.away.abbrev}
              />
            </Card>
          ) : null}

          {data.goals && data.goals.length > 0 ? (
            <Card title="Góly">
              <ol className="divide-y divide-line">
                {data.goals.map((g, i) => {
                  const home = g.teamAbbrev === game.home.abbrev;
                  return (
                    <li key={i} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-16 shrink-0 text-xs text-muted tabular">
                        {g.periodType === "SO" ? "SN" : g.periodType === "OT" ? "PP" : `${g.period}. tř.`} {g.time}
                      </span>
                      <span className={`size-2 shrink-0 rounded-full ${home ? "bg-home" : "bg-away"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{g.scorer}</span>
                        {g.assists.length > 0 ? (
                          <span className="text-muted"> ({g.assists.join(", ")})</span>
                        ) : null}
                        {g.strength && g.strength !== "ev" ? (
                          <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] font-semibold uppercase text-accent">
                            {g.strength}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-semibold tabular">
                        {g.homeScore}:{g.awayScore}
                      </span>
                      {g.videoUrl ? (
                        <a href={g.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-accent">
                          video
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </Card>
          ) : null}

          {game.source === "esports" ? (
            <Card title="Detail zápasu">
              <p className="text-sm text-muted">
                Box score hráčů (TOI, střely, hity, vhazování) a průběh zápasu z hokej.cz doplníme v dalším kroku.
              </p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <OddsCard pre={game.preOdds} live={isLive(game) ? data.liveOdds : null} game={game} />
          {data.bets ? <BetsCard bets={data.bets} game={game} /> : null}
          <Card title="Informace">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">Soutěž</dt>
              <dd>{game.leagueName}</dd>
              <dt className="text-muted">Začátek</dt>
              <dd className="first-letter:uppercase">
                {formatDayLong(day)}, {formatTime(game.startAt)}
              </dd>
              {game.series ? (
                <>
                  <dt className="text-muted">Série</dt>
                  <dd>{game.series}</dd>
                </>
              ) : null}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Scoreline({ game }: { game: Game }) {
  const flash = useGoalFlash(game.homeScore, game.awayScore);
  const started = game.homeScore !== null;
  return (
    <section
      key={flash.home + flash.away}
      className={`relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-8 ${flash.home + flash.away > 0 ? "goal-sweep" : ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, var(--home) 14%, transparent), transparent), radial-gradient(60% 80% at 100% 100%, color-mix(in oklab, var(--away) 14%, transparent), transparent)",
        }}
      />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBlock game={game} side="home" />
        <div className="flex flex-col items-center gap-2">
          <StatusPill game={game} />
          <div className="flex items-center gap-2 text-5xl font-semibold tracking-tight tabular sm:text-6xl">
            {started ? (
              <>
                <span key={`h${flash.home}`} className={flash.home ? "goal-pop" : ""}>
                  {game.homeScore}
                </span>
                <span className="text-muted/50">:</span>
                <span key={`a${flash.away}`} className={flash.away ? "goal-pop" : ""}>
                  {game.awayScore}
                </span>
              </>
            ) : (
              <span className="text-3xl text-muted">vs</span>
            )}
          </div>
          {game.periods.length > 0 ? (
            <div className="flex gap-2 text-xs text-muted tabular">
              {game.periods.map(([h, a], i) => (
                <span key={i} className="rounded-md bg-surface-2 px-1.5 py-0.5">
                  {h}:{a}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <TeamBlock game={game} side="away" />
      </div>
    </section>
  );
}

function TeamBlock({ game, side }: { game: Game; side: "home" | "away" }) {
  const team = game[side];
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamLogo team={team} size={64} />
      <div className="text-sm font-semibold sm:text-base">{team.shortName}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rise rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

function OddsCard({ pre, live, game }: { pre: Odds1x2 | null; live: Odds1x2 | null; game: Game }) {
  if (!pre && !live) return null;
  const current = live ?? pre!;
  const probs = impliedProbs(current);
  const rows: [string, keyof Odds1x2][] = [
    [game.home.shortName, "home"],
    ["Remíza", "draw"],
    [game.away.shortName, "away"],
  ];
  return (
    <Card title={live ? "Kurzy · živě" : "Kurzy před zápasem"}>
      <div className="space-y-2.5">
        {rows.map(([label, key]) => {
          const p = probs?.[key] ?? 0;
          const before = pre?.[key];
          const now = current[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <span className="flex items-center gap-2 tabular">
                  {live && before && before !== now ? (
                    <span className="text-xs text-muted line-through">{formatOdds(before)}</span>
                  ) : null}
                  <span className="font-semibold">{formatOdds(now)}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700"
                  style={{ width: `${p * 100}%` }}
                />
              </div>
              <div className="mt-0.5 text-right text-[11px] text-muted tabular">{formatPct(p)} implikovaně</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <GamblingNotice compact />
      </div>
    </Card>
  );
}

function BetsCard({ bets, game }: { bets: BetDistribution; game: Game }) {
  const rows = [
    [game.home.shortName, bets.home],
    ["Remíza", bets.draw],
    [game.away.shortName, bets.away],
  ] as const;
  return (
    <Card title="Rozložení sázek">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-home" style={{ width: `${bets.home.pct}%` }} />
        <div className="bg-muted/40" style={{ width: `${bets.draw.pct}%` }} />
        <div className="bg-away" style={{ width: `${bets.away.pct}%` }} />
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        {rows.map(([label, s]) => (
          <div key={label} className="flex items-center justify-between tabular">
            <span>{label}</span>
            <span className="flex items-center gap-3">
              {s.tickets !== null ? <span className="text-xs text-muted">{s.tickets} tiketů</span> : null}
              <span className="font-semibold">{s.pct} %</span>
            </span>
          </div>
        ))}
      </div>
      {bets.topBets.length > 0 ? (
        <>
          <h3 className="mb-1.5 mt-4 text-xs font-semibold text-muted">Nejsázenější tipy</h3>
          <ul className="space-y-1 text-xs">
            {bets.topBets.slice(0, 5).map((b) => (
              <li key={b.name} className="flex justify-between gap-3">
                <span className="truncate">{b.name}</span>
                <span className="shrink-0 tabular text-muted">{formatOdds(b.odds)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
