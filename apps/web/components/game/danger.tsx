"use client";

import type { Game, ShotEvent } from "@hokejhub/core";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Segmented } from "./segmented";
import { Crests } from "./versus";

/** Danger tiers by the xG of a single attempt. */
export const DANGER = [
  { key: "high", label: "Vysoká", min: 0.12, cls: "bg-win text-white" },
  { key: "mid", label: "Střední", min: 0.04, cls: "bg-gold text-black" },
  { key: "low", label: "Nízká", min: 0, cls: "bg-live text-white" },
] as const;

const tierOf = (xg: number) => DANGER.find((d) => xg >= d.min)!.key;

type Period = "all" | "1" | "2" | "3" | "ot";

function Bubble({ value, size, cls, delay = 0 }: { value: string; size: number; cls: string; delay?: number }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 260, damping: 16, delay }}
      className={`grid shrink-0 place-items-center rounded-full font-bold tabular ${cls}`}
      style={{ width: size, height: size, fontSize: size > 60 ? 22 : 15 }}
    >
      {value}
    </motion.span>
  );
}

/**
 * All shot attempts (on goal, missed and blocked) with their summed xG, split into high / medium
 * / low danger by the chance each attempt had, per period.
 */
export function ShotDanger({ game, shots }: { game: Game; shots: ShotEvent[] }) {
  const hasOt = shots.some((s) => s.period >= 4);
  const [period, setPeriod] = useState<Period>("all");
  const stats = useMemo(() => {
    const list = shots.filter((s) => (period === "all" ? true : period === "ot" ? s.period >= 4 : s.period === Number(period)));
    const side = (home: boolean) => {
      const mine = list.filter((s) => (s.teamId === game.home.id) === home);
      const tiers = Object.fromEntries(
        DANGER.map((d) => {
          const t = mine.filter((s) => s.type !== "blocked-shot" && tierOf(s.xg ?? 0) === d.key);
          return [d.key, { s: t.length, xg: t.reduce((a, s) => a + (s.xg ?? 0), 0), g: t.filter((s) => s.type === "goal").length }];
        }),
      ) as Record<(typeof DANGER)[number]["key"], { s: number; xg: number; g: number }>;
      return { s: mine.length, xg: mine.reduce((a, s) => a + (s.xg ?? 0), 0), tiers };
    };
    return { home: side(true), away: side(false) };
  }, [shots, period, game.home.id]);

  const maxBubble = Math.max(stats.home.s, stats.away.s, 1);
  const bigSize = (v: number, max: number) => 44 + 24 * Math.sqrt(v / max);
  const maxXg = Math.max(stats.home.xg, stats.away.xg, 0.01);

  return (
    <div>
      <Segmented
        value={period}
        onChange={setPeriod}
        className="mb-4"
        options={[
          { value: "all", label: "Vše" },
          { value: "1", label: "1. tř." },
          { value: "2", label: "2. tř." },
          { value: "3", label: "3. tř." },
          ...(hasOt ? [{ value: "ot" as const, label: "Prodl." }] : []),
        ]}
      />
      <Crests game={game} />
      <div key={period} className="mt-4 grid grid-cols-2 gap-2">
        {(["home", "away"] as const).map((side) => {
          const st = stats[side];
          const bg = side === "home" ? "bg-home text-white" : "bg-away text-white";
          const pair = [
            <div key="s" className="flex flex-col items-center gap-1">
              <span className="label text-[10px] text-muted">Střely</span>
              <Bubble value={String(st.s)} size={bigSize(st.s, maxBubble)} cls={bg} />
            </div>,
            <div key="xg" className="flex flex-col items-center gap-1">
              <span className="label text-[10px] text-muted">xG</span>
              <Bubble value={st.xg.toFixed(2)} size={bigSize(st.xg, maxXg)} cls={`${bg} opacity-85`} delay={0.08} />
            </div>,
          ];
          return (
            <div key={side} className={`flex items-end justify-center gap-1.5 sm:gap-3 ${side === "away" ? "flex-row-reverse" : ""}`}>
              {pair}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-y-2">
        <div className="grid grid-cols-3 text-center text-[10px] font-semibold uppercase text-muted">
          <span>G</span>
          <span>xG</span>
          <span>S</span>
        </div>
        <span />
        <div className="grid grid-cols-3 text-center text-[10px] font-semibold uppercase text-muted">
          <span>S</span>
          <span>xG</span>
          <span>G</span>
        </div>
        {DANGER.map((d, i) => {
          const h = stats.home.tiers[d.key];
          const a = stats.away.tiers[d.key];
          const cell = "grid size-11 place-items-center rounded-full bg-surface-2 text-xs tabular sm:size-12";
          return (
            <div key={d.key} className="contents">
              <div className="grid grid-cols-3 justify-items-center">
                <span className={cell}>{h.g}</span>
                <span className={cell}>{h.xg.toFixed(2)}</span>
                <Bubble value={String(h.s)} size={46} cls={d.cls} delay={0.1 + i * 0.06} />
              </div>
              <span className="label px-2 text-center text-[11px] text-fg">{d.label}</span>
              <div className="grid grid-cols-3 justify-items-center">
                <Bubble value={String(a.s)} size={46} cls={d.cls} delay={0.1 + i * 0.06} />
                <span className={cell}>{a.xg.toFixed(2)}</span>
                <span className={cell}>{a.g}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
