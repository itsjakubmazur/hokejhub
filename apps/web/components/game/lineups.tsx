"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { Game, LineupPlayer, MatchLineups, PlayerMatchStats, TeamLineup } from "@hokejhub/core";
import { fmtToi } from "@/lib/names";
import { Segmented } from "./segmented";

type Side = "home" | "away";

function age(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

function Chip({
  p,
  side,
  stats,
  delay,
}: {
  p: LineupPlayer | null;
  side: Side;
  stats?: PlayerMatchStats;
  delay: number;
}) {
  if (!p) return <div className="w-20" />;
  const a = age(p.birthDate);
  const title = [
    `${p.name} ${p.surname}`,
    a !== null ? `${a} let` : null,
    p.stick ? `hůl ${p.stick === "L" ? "levá" : "pravá"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 380, damping: 26 }}
      className="group flex w-20 flex-col items-center text-center sm:w-24"
      title={title}
    >
      <div className="relative">
        <div
          className={`grid size-10 place-items-center rounded-full text-sm font-bold text-white shadow-lg ring-2 ring-surface transition-transform group-hover:scale-110 sm:size-11 ${
            side === "home" ? "bg-home" : "bg-away"
          }`}
        >
          {p.jersey ?? "–"}
        </div>
        {p.role ? (
          <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-gold text-[9px] font-black text-black">
            {p.role.toUpperCase()}
          </span>
        ) : null}
      </div>
      <span className="mt-1 w-full truncate text-[11px] font-semibold leading-tight">{p.surname}</span>
      {stats ? (
        <span className="text-[10px] text-muted tabular">
          {fmtToi(stats.toi)}
          {stats.points ? ` · ${stats.goals}+${stats.assists}` : ""}
        </span>
      ) : p.position === "GK" && p.saves != null ? (
        <span className="text-[10px] text-muted tabular">{p.saves} zákroků</span>
      ) : null}
    </motion.div>
  );
}

function TeamFormation({
  team,
  side,
  name,
  stats,
}: {
  team: TeamLineup;
  side: Side;
  name: string;
  stats?: PlayerMatchStats[];
}) {
  const byJersey = new Map((stats ?? []).map((s) => [s.jersey, s]));
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_60%)] bg-surface p-3 sm:p-4">
      <h3 className="relative mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className={`size-2.5 rounded-full ${side === "home" ? "bg-home" : "bg-away"}`} />
        {name}
      </h3>
      <div className="relative space-y-3">
        {team.forwards.map((line, i) => (
          <div key={`f${i}`}>
            <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">{i + 1}. útok</div>
            <div className="flex justify-center gap-1 sm:gap-3">
              {line.map((p, j) => (
                <Chip key={j} p={p} side={side} stats={p ? byJersey.get(p.jersey) : undefined} delay={(i * 3 + j) * 0.025} />
              ))}
            </div>
          </div>
        ))}
        <div className="border-t border-dashed border-line pt-3" />
        {team.defence.map((pair, i) => (
          <div key={`d${i}`}>
            <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">{i + 1}. obrana</div>
            <div className="flex justify-center gap-6 sm:gap-10">
              {pair.map((p, j) => (
                <Chip key={j} p={p} side={side} stats={p ? byJersey.get(p.jersey) : undefined} delay={(12 + i * 2 + j) * 0.025} />
              ))}
            </div>
          </div>
        ))}
        <div className="border-t border-dashed border-line pt-3" />
        <div>
          <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">Brankáři</div>
          <div className="flex justify-center gap-6">
            {team.goalies.map((p, j) => (
              <Chip key={j} p={p} side={side} delay={(20 + j) * 0.025} />
            ))}
          </div>
        </div>
      </div>
      {team.coaches.length > 0 ? (
        <div className="relative mt-4 border-t border-line pt-3 text-xs text-muted">
          {team.coaches.map((c) => (
            <div key={c.name} className="flex justify-between">
              <span>{c.role}</span>
              <span className="font-medium text-fg">{c.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Lineups({
  game,
  lineups,
  stats,
}: {
  game: Game;
  lineups: MatchLineups | null;
  stats: { home: PlayerMatchStats[]; away: PlayerMatchStats[] } | null;
}) {
  const [side, setSide] = useState<Side>("home");
  if (!lineups) {
    return <p className="py-8 text-center text-sm text-muted">Sestavy budou k dispozici těsně před zápasem.</p>;
  }
  return (
    <div>
      <Segmented
        className="mb-4 lg:hidden"
        value={side}
        onChange={setSide}
        options={[
          { value: "home", label: game.home.shortName },
          { value: "away", label: game.away.shortName },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {(["home", "away"] as const).map((s) => (
          <div key={s} className={s === side ? "" : "hidden lg:block"}>
            <TeamFormation team={lineups[s]} side={s} name={game[s].name} stats={stats?.[s]} />
          </div>
        ))}
      </div>
      {lineups.referees.length > 0 ? (
        <p className="mt-4 text-xs text-muted">
          <span className="font-semibold text-fg">Rozhodčí:</span>{" "}
          {lineups.referees.filter((r) => r.role === "referee").map((r) => r.name).join(", ")}
          {" · "}
          <span className="font-semibold text-fg">Čároví:</span>{" "}
          {lineups.referees.filter((r) => r.role === "linesman").map((r) => r.name).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
