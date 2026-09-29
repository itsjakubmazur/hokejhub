"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { Game } from "@hokejhub/core";
import type { GameDetailResponse } from "@/lib/types";
import { FormBadges } from "../league/standings";
import { PlayerPhoto } from "../player-photo";

const MILESTONE: Record<string, (v: number) => string> = {
  career_gp: (v) => `${v}. zápas v extralize`,
  club_gp: (v) => `${v}. zápas za klub`,
  career_g: (v) => `${v}. gól v extralize`,
  club_g: (v) => `${v}. gól za klub`,
  career_pts: (v) => `${v}. bod v extralize`,
  club_pts: (v) => `${v}. bod za klub`,
};

function streakText(s: NonNullable<GameDetailResponse["insights"]>["home"]) {
  const out: string[] = [];
  if (s.wins >= 2) out.push(`${s.wins} výhry v řadě`);
  if (s.losses >= 2) out.push(`${s.losses} prohry v řadě`);
  if (s.points >= 3 && s.wins < s.points) out.push(`bodoval ${s.points}× v řadě`);
  if (s.homeWins >= 3) out.push(`doma vyhrál ${s.homeWins}× v řadě`);
  if (s.awayWins >= 3) out.push(`venku vyhrál ${s.awayWins}× v řadě`);
  return out;
}

export function Insights({ game, data }: { game: Game; data: GameDetailResponse }) {
  const ins = data.insights;
  if (!ins || !data.teamIds) return null;
  const teams = [
    { side: "home" as const, team: game.home, s: ins.home, id: data.teamIds.home },
    { side: "away" as const, team: game.away, s: ins.away, id: data.teamIds.away },
  ];
  const sideOf = (teamId: string) => (teamId === data.teamIds!.home ? "home" : "away");
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {teams.map(({ side, team, s }) => (
          <div key={side} className="rounded-xl bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <span className={`size-2 rounded-full ${side === "home" ? "bg-home" : "bg-away"}`} />
                {team.shortName}
              </span>
              <FormBadges form={s.last10.slice(0, 5) as never} />
            </div>
            <ul className="space-y-0.5 text-xs text-muted">
              {streakText(s).map((t) => (
                <li key={t}>🔥 {t}</li>
              ))}
              {streakText(s).length === 0 ? <li>Bez výrazné série.</li> : null}
            </ul>
          </div>
        ))}
      </div>
      {ins.reached.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">Milníky v tomto zápase</h3>
          <ul className="space-y-2">
            {ins.reached.map((m, i) => (
              <motion.li
                key={`${m.player_id}-${m.kind}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5"
              >
                <PlayerPhoto src={m.headshot} alt={m.name} size={36} ring={sideOf(m.team_id)} />
                <span className="text-sm">
                  <Link href={`/hrac/${m.player_id}`} className="font-semibold hover:text-accent">
                    {m.name}
                  </Link>{" "}
                  – {MILESTONE[m.kind]?.(m.value) ?? m.kind}
                </span>
                <span className="ml-auto text-lg">🏆</span>
              </motion.li>
            ))}
          </ul>
        </div>
      ) : null}
      {ins.notes.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {game.status === "final" ? "Jak šli hráči do zápasu" : "Na koho se dívat"}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ins.notes.map((n, i) => (
              <motion.li
                key={`${n.player_id}-${n.text}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2.5 rounded-xl bg-surface-2 p-2"
              >
                <PlayerPhoto src={n.headshot ?? data.photos?.[n.player_id]} alt={n.name} size={34} ring={sideOf(n.team_id)} />
                <span className="min-w-0 text-sm leading-tight">
                  <Link href={`/hrac/${n.player_id}`} className="font-semibold hover:text-accent">
                    {n.name}
                  </Link>
                  <span className="block text-xs text-muted">{n.text}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
