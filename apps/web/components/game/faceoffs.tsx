"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { Game, HokejczMatch, MatchPeriodStats, PlayerMatchStats } from "@hokejhub/core";
import { PlayerPhoto } from "../player-photo";

const pct = (w: number, t: number) => (t ? Math.round((w / t) * 100) : 0);

/**
 * Faceoffs: the zone strip drawn like the rink between the blue lines, and the centre duel —
 * every player who took 3+ draws, home on the left, away on the right.
 */
export function Faceoffs({
  game,
  zones,
  stats,
  periodStats,
  box,
  photos,
}: {
  game: Game;
  zones: { home: number[]; away: number[] } | null;
  stats: { home: PlayerMatchStats[]; away: PlayerMatchStats[] } | null;
  periodStats: MatchPeriodStats | null;
  box: HokejczMatch | null;
  photos: Record<string, string> | null;
}) {
  const won = periodStats?.faceoffsWon?.total;
  const total = periodStats?.faceoffsTotal?.total;
  const fromBox = box?.teamStats["Vhazování"] ?? box?.teamStats["Vyhraná vhazování"];
  const homeWon = won?.[0] ?? fromBox?.[0] ?? stats?.home.reduce((a, p) => a + p.faceoffsWon, 0) ?? 0;
  const awayWon = won?.[1] ?? fromBox?.[1] ?? stats?.away.reduce((a, p) => a + p.faceoffsWon, 0) ?? 0;
  const all = homeWon + awayWon || (total?.[0] ?? 0);
  if (!all && !zones) return null;
  const centres = (side: "home" | "away") =>
    (stats?.[side] ?? []).filter((p) => p.faceoffs >= 3).sort((a, b) => b.faceoffs - a.faceoffs);
  const idOf = (side: "home" | "away") => new Map((box?.skaters[side] ?? []).filter((s) => s.player.id).map((s) => [s.number, s.player.id!]));

  return (
    <div className="space-y-6">
      {all ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="display text-3xl tabular text-home">{homeWon}</span>
            <span className="label text-muted">vyhraná vhazování</span>
            <span className="display text-3xl tabular text-away">{awayWon}</span>
          </div>
          <div className="flex h-2.5 gap-0.5">
            <motion.div className="bg-home" initial={{ width: 0 }} animate={{ width: `${(homeWon / all) * 100}%` }} transition={{ duration: 0.7 }} />
            <div className="flex-1 bg-away" />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted tabular">
            <span>{pct(homeWon, all)} %</span>
            <span>{pct(awayWon, all)} %</span>
          </div>
        </div>
      ) : null}

      {zones ? <ZoneStrip game={game} zones={zones} /> : null}

      {stats && (centres("home").length || centres("away").length) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["home", "away"] as const).map((side) => {
            const ids = idOf(side);
            const list = centres(side);
            return (
              <div key={side}>
                <h3 className="label mb-2 text-muted">{game[side].shortName}</h3>
                {list.length === 0 ? <p className="text-sm text-muted">Nikdo nevhazoval aspoň třikrát.</p> : null}
                <ul className="space-y-2">
                  {list.map((p) => {
                    const hid = p.jersey != null ? ids.get(p.jersey) : undefined;
                    const w = pct(p.faceoffsWon, p.faceoffs);
                    return (
                      <li key={p.id} className="grid grid-cols-[28px_1fr_auto] items-center gap-2">
                        <PlayerPhoto src={hid ? photos?.[`hcz-${hid}`] : null} alt={p.name} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            {hid ? (
                              <Link href={`/hrac/hcz-${hid}`} className="truncate font-medium hover:text-accent">
                                {p.name}
                              </Link>
                            ) : (
                              <span className="truncate font-medium">{p.name}</span>
                            )}
                            <span className="shrink-0 text-xs text-muted tabular">
                              {p.faceoffsWon}/{p.faceoffs}
                            </span>
                          </div>
                          <div className="relative mt-1 h-1.5 bg-surface-2">
                            <div className="absolute inset-y-0 left-1/2 w-px bg-muted/50" />
                            <motion.div
                              className={side === "home" ? "h-full bg-home" : "h-full bg-away"}
                              initial={{ width: 0 }}
                              animate={{ width: `${w}%` }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>
                        </div>
                        <span className={`display w-11 text-right text-lg tabular ${w >= 50 ? "text-fg" : "text-muted"}`}>{w} %</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
      {stats ? <p className="text-[11px] text-muted">Čárka uprostřed pruhu = 50 %. Hráči s aspoň třemi vhazováními.</p> : null}
    </div>
  );
}

/** The rink from the home team's end: defensive zone, neutral zone between blue lines, attacking zone. */
function ZoneStrip({ game, zones }: { game: Game; zones: { home: number[]; away: number[] } }) {
  const labels = ["Obranné pásmo", "Střední pásmo", "Útočné pásmo"];
  return (
    <div>
      <h3 className="label mb-2 text-muted">{game.home.shortName}: úspěšnost podle pásma</h3>
      <svg viewBox="0 0 600 150" className="w-full max-w-2xl" role="img" aria-label="Úspěšnost vhazování podle pásem">
        <rect x="2" y="2" width="596" height="146" rx="44" fill="var(--rink)" stroke="var(--rink-line)" strokeWidth="2" />
        <line x1="210" x2="210" y1="2" y2="148" stroke="var(--accent)" strokeWidth="6" opacity="0.7" />
        <line x1="390" x2="390" y1="2" y2="148" stroke="var(--accent)" strokeWidth="6" opacity="0.7" />
        <line x1="300" x2="300" y1="2" y2="30" stroke="var(--live)" strokeWidth="4" opacity="0.55" />
        <line x1="300" x2="300" y1="120" y2="148" stroke="var(--live)" strokeWidth="4" opacity="0.55" />
        <line x1="40" x2="40" y1="10" y2="140" stroke="var(--live)" strokeWidth="1.5" opacity="0.5" />
        <line x1="560" x2="560" y1="10" y2="140" stroke="var(--live)" strokeWidth="1.5" opacity="0.5" />
        {[100, 300, 500].map((cx, i) => {
          const v = Math.round(zones.home[i] ?? 0);
          return (
            <g key={cx}>
              <circle cx={cx} cy="75" r="42" fill="none" stroke="var(--live)" strokeWidth="1.5" opacity="0.35" />
              <text x={cx} y="82" textAnchor="middle" fontSize="26" fontWeight="800" fill={v >= 50 ? "var(--text)" : "var(--muted)"} style={{ fontFamily: "var(--font-display)" }}>
                {v} %
              </text>
              <text x={cx} y="138" textAnchor="middle" fontSize="11" fill="var(--muted)">
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
