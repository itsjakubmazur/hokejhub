"use client";

import type { Game, ShotEvent } from "@hokejhub/core";
import { motion } from "motion/react";
import { useMemo } from "react";
import { TeamLogo } from "../team-logo";

export interface MomentumPenalty {
  /** Elapsed seconds when the penalty started. */
  start: number;
  /** Length in seconds (minor 120, major 300). */
  length: number;
  /** Team that took the penalty (the other one is on the power play). */
  side: "home" | "away";
}

const ROW = 12;
const SIGMA = 1.4; // minutes

/**
 * Which team had the upper hand in each minute: shot attempts weighted by their danger,
 * smoothed over neighbouring minutes. Bars left = home pressure, right = away pressure.
 * Goals are marked with G, penalties shade the minutes they lasted.
 */
export function Momentum({
  game,
  shots,
  goals,
  penalties,
}: {
  game: Game;
  shots: ShotEvent[];
  goals: [number, "home" | "away"][];
  penalties: MomentumPenalty[];
}) {
  const minutes = Math.max(60, Math.ceil(Math.max(...shots.map((s) => (s.period - 1) * 1200 + s.periodSeconds), 0) / 60));
  const rows = useMemo(() => {
    const out = Array.from({ length: minutes }, () => 0);
    for (const s of shots) {
      const t = ((s.period - 1) * 1200 + s.periodSeconds) / 60;
      const w = (s.type === "blocked-shot" ? 0.4 : 0.6) + (s.xg ?? 0) * 5;
      const sign = s.teamId === game.home.id ? 1 : -1;
      for (let m = Math.max(0, Math.floor(t - 4 * SIGMA)); m < Math.min(minutes, Math.ceil(t + 4 * SIGMA)); m++) {
        const d = m + 0.5 - t;
        out[m]! += sign * w * Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
      }
    }
    return out;
  }, [shots, minutes, game.home.id]);
  const max = Math.max(...rows.map(Math.abs), 0.01);
  const height = minutes * ROW;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <span className="h-8 w-1.5 bg-home" aria-hidden />
        <div className="flex items-center gap-3">
          <TeamLogo team={game.home} size={30} />
          <span className="text-muted">×</span>
          <TeamLogo team={game.away} size={30} />
        </div>
        <span className="h-8 w-1.5 bg-away" aria-hidden />
      </div>
      <div className="relative mt-3" style={{ height }}>
        {/* penalty bands with a stripe on the side of the team that took them */}
        {penalties.map((p, i) => (
          <div key={i} className="absolute inset-x-0 bg-surface-2/70" style={{ top: (p.start / 60) * ROW, height: (p.length / 60) * ROW }}>
            <span className={`absolute inset-y-0 w-1 ${p.side === "home" ? "left-0 bg-home" : "right-0 bg-away"}`} />
          </div>
        ))}
        {Array.from({ length: Math.floor(minutes / 5) + 1 }, (_, i) => (
          <span key={i} className="absolute left-2 -translate-y-1/2 text-[10px] text-muted tabular" style={{ top: i * 5 * ROW }}>
            {String(i * 5).padStart(2, "0")}:00
          </span>
        ))}
        {[20, 40, 60]
          .filter((m) => m < minutes)
          .map((m) => (
            <span key={m} className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: m * ROW }} />
          ))}
        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
        {rows.map((v, m) => {
          const w = (Math.abs(v) / max) * 46;
          const home = v > 0;
          return (
            <motion.span
              key={m}
              className={`absolute rounded-full ${home ? "bg-home" : "bg-away"}`}
              style={{
                top: m * ROW + 1,
                height: ROW - 2,
                width: `${w}%`,
                ...(home ? { right: "50%", transformOrigin: "right" } : { left: "50%", transformOrigin: "left" }),
              }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: Math.min(m * 0.004, 0.25) }}
            />
          );
        })}
        {goals.map(([t, side], i) => {
          const m = Math.min(minutes - 1, Math.floor(t / 60));
          const v = rows[m] ?? 0;
          const w = (Math.abs(v) / max) * 46;
          const onHomeSide = v > 0;
          // sit at the end of that minute's bar, on the side the bar points to
          const x = onHomeSide ? 50 - w : 50 + w;
          return (
            <motion.span
              key={i}
              title={`Gól ${side === "home" ? game.home.shortName : game.away.shortName} ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`}
              className={`absolute z-10 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[9px] font-black text-white ring-2 ring-surface ${
                side === "home" ? "bg-home" : "bg-away"
              }`}
              style={{ top: (t / 60) * ROW, left: `${x}%` }}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.3 }}
            >
              G
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
