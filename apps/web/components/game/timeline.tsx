"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { Game, GoalSummary, HokejczMatch, NhlPenalty } from "@hokejhub/core";
import { nice } from "@/lib/names";
import { OctagonAlert } from "lucide-react";
import { Portrait } from "../portrait";

type Side = "home" | "away";

interface TimelineEvent {
  side: Side;
  kind: "goal" | "penalty";
  /** Seconds elapsed in the game (for sorting). */
  t: number;
  clock: string;
  period: string;
  title: string;
  sub?: string;
  badge?: string;
  score?: string;
  minutes?: number | null;
  href?: string;
  playerId?: string;
}

function elapsed(clock: string) {
  const m = /^(\d+):(\d{2})$/.exec(clock);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

const SITUATION: Record<string, string> = { "5/4": "přesilovka", "5/3": "přesilovka 5/3", "4/3": "přesilovka 4/3", "4/5": "oslabení", "3/5": "oslabení", "3/4": "oslabení", EN: "prázdná branka", TS: "trestné střílení" };

function fromHokejcz(box: HokejczMatch): TimelineEvent[] {
  let h = 0;
  let a = 0;
  const goals = [...box.goals].sort((x, y) => elapsed(x.time) - elapsed(y.time));
  const out: TimelineEvent[] = goals.map((g) => {
    const side: Side = g.team === box.home.abbrev ? "home" : "away";
    if (side === "home") h++;
    else a++;
    return {
      side,
      kind: "goal",
      t: elapsed(g.time),
      clock: g.time,
      period: g.period,
      title: nice(g.scorer.name) + (g.scorerSeasonGoals ? ` (${g.scorerSeasonGoals})` : ""),
      href: g.scorer.id ? `/hrac/hcz-${g.scorer.id}` : undefined,
      playerId: g.scorer.id ? `hcz-${g.scorer.id}` : undefined,
      sub: g.assists.map((x) => nice(x.name)).join(" + ") || undefined,
      badge: g.situation && g.situation !== "5/5" ? (SITUATION[g.situation] ?? g.situation) : undefined,
      score: `${h}:${a}`,
    };
  });
  for (const p of box.penalties) {
    out.push({
      side: p.team === box.home.abbrev ? "home" : "away",
      kind: "penalty",
      t: elapsed(p.time),
      clock: p.time,
      period: p.period,
      title: nice(p.player.name),
      href: p.player.id ? `/hrac/hcz-${p.player.id}` : undefined,
      sub: p.reason,
      minutes: p.minutes,
    });
  }
  return out.sort((x, y) => x.t - y.t || (x.kind === "goal" ? -1 : 1));
}

function fromNhl(goals: GoalSummary[], game: Game, penalties: NhlPenalty[]): TimelineEvent[] {
  const periodName = (n: number) => (n <= 3 ? `${n}. třetina` : n === 4 ? "Prodloužení" : "Nájezdy");
  const pens: TimelineEvent[] = penalties.map((p) => ({
    side: p.team === game.home.abbrev ? "home" : "away",
    kind: "penalty",
    t: (p.period - 1) * 1200 + elapsed(p.time),
    clock: p.time,
    period: periodName(p.period),
    title: p.player ?? "tým",
    sub: p.reason,
    minutes: p.minutes,
  }));
  const gl: TimelineEvent[] = goals.map((g) => {
    const periodLabel = g.periodType === "OT" ? "Prodloužení" : g.periodType === "SO" ? "Nájezdy" : `${g.period}. třetina`;
    return {
      side: g.teamAbbrev === game.home.abbrev ? "home" : "away",
      kind: "goal",
      t: (g.period - 1) * 1200 + elapsed(g.time),
      clock: g.time,
      period: periodLabel,
      title: g.scorer,
      playerId: g.scorerId ?? undefined,
      sub: g.assists.join(" + ") || undefined,
      badge: g.strength === "pp" ? "přesilovka" : g.strength === "sh" ? "oslabení" : undefined,
      score: `${g.homeScore}:${g.awayScore}`,
    };
  });
  return [...gl, ...pens].sort((x, y) => x.t - y.t || (x.kind === "goal" ? -1 : 1));
}

function EventRow({ e, index, photos }: { e: TimelineEvent; index: number; photos: Record<string, string> | null }) {
  const home = e.side === "home";
  const goal = e.kind === "goal";
  return (
    <motion.li
      initial={{ opacity: 0.4, x: home ? -8 : 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.01, 0.15), duration: 0.2 }}
      className={`flex items-center gap-3 py-2.5 ${home ? "" : "flex-row-reverse text-right"}`}
    >
      <span className="w-11 shrink-0 text-xs font-semibold text-muted tabular">{e.clock}</span>
      {goal ? (
        <>
          <span className={`display grid h-8 min-w-12 place-items-center px-2 text-xl tabular ${home ? "bg-home text-white" : "bg-away text-white"}`}>
            {e.score}
          </span>
          <Portrait src={e.playerId ? photos?.[e.playerId] : null} alt={e.title} width={46} side={e.side} />
        </>
      ) : (
        <span
          className={`grid h-6 min-w-8 place-items-center px-1.5 text-xs font-bold tabular ${(e.minutes ?? 0) >= 10 ? "bg-live text-white" : "bg-gold text-black"}`}
          title="Trestné minuty"
        >
          {e.minutes ?? "?"}′
        </span>
      )}
      <span className="min-w-0">
        <span className={`flex items-center gap-1.5 ${home ? "" : "flex-row-reverse"}`}>
          {goal ? null : <OctagonAlert className="size-3.5 shrink-0 text-muted" aria-hidden />}
          {e.href ? (
            <Link href={e.href} className={`truncate ${goal ? "text-base font-bold" : "text-sm font-medium"} hover:text-accent`}>
              {e.title}
            </Link>
          ) : (
            <span className={`truncate ${goal ? "text-base font-bold" : "text-sm font-medium"}`}>{e.title}</span>
          )}
          {e.badge ? <span className="shrink-0 bg-accent-soft px-1.5 py-px text-[10px] font-semibold uppercase text-accent">{e.badge}</span> : null}
        </span>
        {e.sub ? <span className="block truncate text-xs text-muted">{goal ? `asistence: ${e.sub}` : e.sub}</span> : null}
      </span>
    </motion.li>
  );
}

/** Livesport-style match timeline: home events on the left, away events on the right. */
export function Timeline({
  game,
  box,
  goals,
  photos = null,
  penalties = [],
}: {
  game: Game;
  box: HokejczMatch | null;
  goals: GoalSummary[] | null;
  photos?: Record<string, string> | null;
  penalties?: NhlPenalty[];
}) {
  const events = box ? fromHokejcz(box) : goals ? fromNhl(goals, game, penalties) : [];
  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Zatím žádné události.</p>;
  }
  const periods = [...new Set(events.map((e) => e.period))];
  let index = 0;
  return (
    <div className="space-y-3">
      {periods.map((period, pi) => {
        const list = events.filter((e) => e.period === period);
        const score = game.periods[pi];
        return (
          <section key={period}>
            <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 label text-muted">
              <span>{period}</span>
              {score ? (
                <span className="tabular text-fg">
                  {score[0]} - {score[1]}
                </span>
              ) : null}
            </div>
            <ol className="divide-y divide-line px-1">
              {list.map((e) => (
                <EventRow key={`${e.kind}-${e.t}-${e.title}-${index}`} e={e} index={index++} photos={photos} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
